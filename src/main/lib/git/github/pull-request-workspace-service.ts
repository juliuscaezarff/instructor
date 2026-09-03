import { resolve } from "node:path"
import type { projects, chats, subChats } from "../../db"
import { createId } from "../../db/utils"
import type { createWorktreeForChat } from "../worktree"
import type { execWithShellEnv } from "../shell-env"
import type { fetchPullRequestHead, fetchVerifiedPullRequestCommit } from "./pull-request-head"
import { buildPullRequestAgentContext, pullRequestKey, pullRequestKeyFromUrl, type PullRequestIdentity } from "../../../../shared/pull-request-agent-context"

function linked(chat: typeof chats.$inferSelect, project: typeof projects.$inferSelect, pr: PullRequestIdentity) {
  // Legacy links without a URL use project identity; a present URL must never be ignored.
  return chat.prUrl
    ? pullRequestKeyFromUrl(chat.prUrl) === pullRequestKey(pr)
    : chat.prNumber === pr.number && project.gitProvider === "github" &&
      `${project.gitOwner}/${project.gitRepo}`.toLowerCase() === `${pr.owner}/${pr.repository}`.toLowerCase()
}

type Project = typeof projects.$inferSelect
type Chat = typeof chats.$inferSelect
export interface PullRequestWorkspaceDependencies {
  listProjects(): Project[]
  listChats(): Chat[]
  insertChat(chat: typeof chats.$inferInsert): Chat
  insertSubChat(chat: typeof subChats.$inferInsert): typeof subChats.$inferSelect
  hasSubChat(chatId: string): boolean
  isDirectory(path: string): Promise<boolean>
  realpath(path: string): Promise<string>
  exec: typeof execWithShellEnv
  createWorktree: typeof createWorktreeForChat
  fetchHead: typeof fetchPullRequestHead
  fetchCommit: typeof fetchVerifiedPullRequestCommit
}

export function createPullRequestWorkspaceService(deps: PullRequestWorkspaceDependencies) {
  async function available(path: string | null) {
    if (!path) return false
    try { return await deps.isDirectory(path) } catch { return false }
  }

  async function getPullRequestWorkspaceTargets(pr: PullRequestIdentity) {
    const allProjects = deps.listProjects()
    const projectById = new Map(allProjects.map(project => [project.id, project]))
    const allChats = deps.listChats()
    const matchingProjects = allProjects.filter(project => project.gitProvider === "github" &&
      `${project.gitOwner}/${project.gitRepo}`.toLowerCase() === `${pr.owner}/${pr.repository}`.toLowerCase())
    const workspaces = await Promise.all(allChats.flatMap(chat => {
      const project = projectById.get(chat.projectId)
      if (!project || !linked(chat, project, pr)) return []
      return [(async () => {
        const isAvailable = !chat.archivedAt && await available(chat.worktreePath)
        let isolated = false
        if (isAvailable && chat.worktreePath && chat.branch) {
          try {
            const [workspacePath, projectPath] = await Promise.all([
              deps.realpath(chat.worktreePath), deps.realpath(project.path),
            ])
            isolated = workspacePath !== projectPath
          } catch { /* The folder may have disappeared since stat. */ }
        }
        return { id: chat.id, projectId: project.id, name: chat.name || chat.branch || "Workspace",
          available: isAvailable, isolated, archived: Boolean(chat.archivedAt) }
      })()]
    }))
    return { projects: matchingProjects.map(({ id, name, path }) => ({ id, name, path })), workspaces }
  }

  // Shares only workspace creation, never agent execution or a user's conversation.
  const creations = new Map<string, Promise<typeof chats.$inferSelect>>()

  async function ensureWorkspace(pr: PullRequestIdentity, project: typeof projects.$inferSelect, head: Awaited<ReturnType<typeof fetchPullRequestHead>>) {
    const key = `${project.id}:${pullRequestKey(pr)}`
    const pending = creations.get(key)
    if (pending) return pending
    const creation = (async () => {
      const existing = deps.listChats()
        .filter(chat => chat.projectId === project.id && !chat.archivedAt && linked(chat, project, pr))
      const usable = []
      for (const chat of existing) {
        if (!await available(chat.worktreePath)) continue
        const [workspacePath, projectPath] = await Promise.all([
          deps.realpath(chat.worktreePath!), deps.realpath(project.path),
        ])
        if (workspacePath !== projectPath) usable.push(chat)
      }
      if (usable.length > 1) throw new Error("Several workspaces are linked to this PR. Choose a workspace.")
      if (usable[0]) return usable[0]
      const commit = await deps.fetchCommit(project.path, { ...pr, repositoryId: head.base.repo.id }, head.head.sha)
      const id = createId()
      const worktree = await deps.createWorktree(project.path, project.name.replace(/[^a-zA-Z0-9_-]/g, "-") || "project",
        id, commit, "local", { isolatedPullRequest: true })
      if (!worktree.success || !worktree.worktreePath || !worktree.branch || resolve(worktree.worktreePath) === resolve(project.path)) {
        throw new Error(worktree.error || "Unable to create an isolated PR workspace. No local workspace was substituted.")
      }
      const candidate = { id, projectId: project.id, name: `PR #${pr.number}: ${head.title.slice(0, 150)}`,
        worktreePath: worktree.worktreePath, branch: worktree.branch, baseBranch: head.base.ref,
        prNumber: pr.number, prUrl: `https://github.com/${pr.owner}/${pr.repository}/pull/${pr.number}`,
      }
      try {
        await requireIsolatedWorkspace(candidate, project)
        // Persist the link only after a verified checkout. No user message is inserted.
        return deps.insertChat(candidate)
      } catch (error) {
        // Only remove this attempt's clean worktree; never force-delete changed files.
        try {
          await deps.exec("git", ["-C", project.path, "worktree", "remove", worktree.worktreePath], { timeout: 30_000 })
        } catch {
          throw new Error(`Unable to save the PR workspace. Its folder was preserved at ${worktree.worktreePath}. Check it before trying again.`)
        }
        throw error
      }
    })()
    creations.set(key, creation)
    try { return await creation } finally { creations.delete(key) }
  }

  async function requireIsolatedWorkspace(chat: Pick<Chat, "worktreePath" | "branch">, project: Project) {
    if (!chat.worktreePath || !chat.branch) throw new Error("This workspace is not isolated. Create a PR worktree before preparing an agent task.")
    const [workspacePath, projectPath] = await Promise.all([deps.realpath(chat.worktreePath), deps.realpath(project.path)])
    if (workspacePath === projectPath) throw new Error("Agent tasks from PRs require an isolated worktree, not the main project folder.")
    const commonDir = async (path: string) => {
      const result = await deps.exec("git", ["-C", path, "rev-parse", "--git-common-dir"], { timeout: 10_000 })
      return deps.realpath(resolve(path, result.stdout.trim()))
    }
    const [workspaceGit, projectGit] = await Promise.all([commonDir(workspacePath), commonDir(projectPath)])
    if (workspaceGit !== projectGit) throw new Error("This workspace no longer belongs to the project. Choose another workspace.")
  }

  async function preparePullRequestWorkspace(input: PullRequestIdentity & {
    projectId: string; workspaceId?: string; action: "open" | "analyze" | "fix"
  }) {
    const project = deps.listProjects().find(project => project.id === input.projectId)
    if (!project) throw new Error("The local project is unavailable. Add it in Instructor and try again.")
    let chat = input.workspaceId ? deps.listChats().find(chat => chat.id === input.workspaceId) : undefined
    if (input.workspaceId && (!chat || chat.projectId !== project.id || chat.archivedAt || !linked(chat, project, input))) {
      throw new Error("This workspace is no longer linked to the PR. Refresh and choose a workspace.")
    }
    if (chat && input.action === "open") {
      if (!await available(chat.worktreePath)) throw new Error("The workspace folder is unavailable. Restore it or create a new workspace.")
      return { chatId: chat.id, subChat: null, draft: null, context: null }
    }
    if (!chat && (project.gitProvider !== "github" || `${project.gitOwner}/${project.gitRepo}`.toLowerCase() !== `${input.owner}/${input.repository}`.toLowerCase())) {
      throw new Error("Choose a local project matching this GitHub repository.")
    }
    const head = await deps.fetchHead(input)
    chat ??= await ensureWorkspace(input, project, head)
    await requireIsolatedWorkspace(chat, project)
    if (input.action === "open" && deps.hasSubChat(chat.id)) {
      return { chatId: chat.id, subChat: null, draft: null, context: null }
    }
    const mode = input.action === "analyze" ? "plan" : "agent"
    const subChat = deps.insertSubChat({ chatId: chat.id, mode, messages: "[]",
      name: input.action === "analyze" ? `Review PR #${input.number}` : input.action === "fix" ? `Fix PR #${input.number}` : "New chat",
    })
    const prepared = input.action === "open" ? null : buildPullRequestAgentContext({
      ...input, title: head.title, body: head.body || "", head: head.head.ref, base: head.base.ref, sha: head.head.sha,
    }, input.action)
    return { chatId: chat.id, subChat, draft: prepared?.draft ?? null, context: prepared?.context ?? null }
  }
  return { getPullRequestWorkspaceTargets, preparePullRequestWorkspace }
}
