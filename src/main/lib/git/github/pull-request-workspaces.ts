import { and, eq } from "drizzle-orm"
import { realpath, stat } from "node:fs/promises"
import { getDatabase, projects, chats, subChats } from "../../db"
import { createWorktreeForChat } from "../worktree"
import { execWithShellEnv } from "../shell-env"
import { fetchPullRequestHead, fetchVerifiedPullRequestCommit } from "./pull-request-head"
import { createPullRequestWorkspaceService } from "./pull-request-workspace-service"
import { reconcileRepositoryAliases } from "./reconcile-repository"
import { resolveGitHubRepository } from "./repository-identity"
import type { PullRequestIdentity } from "../../../../shared/pull-request-agent-context"

const service = createPullRequestWorkspaceService({
  listProjects: () => getDatabase().select().from(projects).all(),
  listChats: () => getDatabase().select().from(chats).all(),
  insertChat: chat => getDatabase().insert(chats).values(chat).returning().get(),
  insertSubChat: chat => getDatabase().insert(subChats).values(chat).returning().get(),
  hasSubChat: chatId => Boolean(getDatabase().select({ id: subChats.id }).from(subChats).where(eq(subChats.chatId, chatId)).get()),
  isDirectory: async path => (await stat(path)).isDirectory(),
  realpath,
  exec: execWithShellEnv,
  createWorktree: createWorktreeForChat,
  fetchHead: fetchPullRequestHead,
  fetchCommit: fetchVerifiedPullRequestCommit,
})

// Short-lived metadata cache: avoids repeating discovery for each local project
// between the chooser and preparation. Head/origin validation remains uncached.
const repositoryMetadata = new Map<string, { expiresAt: number; result: ReturnType<typeof resolveGitHubRepository> }>()
function resolveMetadataRepository(repository: { owner: string; repository: string }) {
  const key = `${repository.owner}/${repository.repository}`.toLowerCase()
  const cached = repositoryMetadata.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.result
  const result = resolveGitHubRepository(repository)
  const entry = { expiresAt: Date.now() + 30_000, result }
  if (repositoryMetadata.size >= 100) repositoryMetadata.delete(repositoryMetadata.keys().next().value!)
  repositoryMetadata.set(key, entry)
  void result.catch(() => {
    if (repositoryMetadata.get(key) === entry) repositoryMetadata.delete(key)
  })
  return result
}

async function canonicalize(pr: PullRequestIdentity) {
  const db = getDatabase()
  const changes = await reconcileRepositoryAliases(pr, db.select().from(projects).all(), db.select({ id: chats.id, prUrl: chats.prUrl }).from(chats).all(), resolveMetadataRepository)
  db.transaction(tx => {
    for (const project of changes.projectUpdates) {
      tx.update(projects).set({ gitOwner: changes.canonical.owner, gitRepo: changes.canonical.repository })
        .where(and(eq(projects.id, project.id), eq(projects.gitOwner, project.gitOwner!), eq(projects.gitRepo, project.gitRepo!))).run()
    }
    for (const chat of changes.chatUpdates) {
      tx.update(chats).set({ prUrl: chat.url }).where(and(eq(chats.id, chat.id), eq(chats.prUrl, chat.previousUrl))).run()
    }
  })
  return changes.canonical
}

export async function getPullRequestWorkspaceTargets(pr: PullRequestIdentity) {
  return service.getPullRequestWorkspaceTargets(await canonicalize(pr))
}

export async function preparePullRequestWorkspace(input: Parameters<typeof service.preparePullRequestWorkspace>[0]) {
  return service.preparePullRequestWorkspace({ ...input, ...await canonicalize(input) })
}
