import { beforeEach, describe, expect, it, mock } from "bun:test"
import { resolve } from "node:path"

import { createPullRequestWorkspaceService } from "./pull-request-workspace-service"

let rows
let counter = 0
const createWorktree = mock()
const fetchHead = mock()
const fetchCommit = mock()
const fileStat = mock()
const { preparePullRequestWorkspace, getPullRequestWorkspaceTargets } = createPullRequestWorkspaceService({
  listProjects: () => rows.projects,
  listChats: () => rows.chats,
  insertChat: value => { const row = { id: `generated-${++counter}`, archivedAt: null, ...value }; rows.chats.push(row); return row },
  insertSubChat: value => { const row = { id: `generated-${++counter}`, ...value }; rows.subChats.push(row); return row },
  hasSubChat: chatId => rows.subChats.some(chat => chat.chatId === chatId),
  isDirectory: async path => (await fileStat(path)).isDirectory(),
  realpath: async path => resolve(path),
  exec: async () => ({ stdout: resolve("/project/.git") }),
  createWorktree,
  fetchHead,
  fetchCommit,
})
const input = { owner: "owner", repository: "repo", number: 42, projectId: "project", action: "analyze" }
const head = { title: "PR", body: "Context", head: { sha: "a".repeat(40), ref: "fork/feature" }, base: { sha: "b".repeat(40), ref: "main", repo: { id: 1, full_name: "owner/repo" } } }
beforeEach(() => {
  rows = { projects: [{ id: "project", name: "Repo", path: "/project", gitProvider: "github", gitOwner: "owner", gitRepo: "repo" }], chats: [], subChats: [] }
  createWorktree.mockReset().mockResolvedValue({ success: true, worktreePath: "/workspace", branch: "isolated-branch" })
  fetchHead.mockReset().mockResolvedValue(head)
  fetchCommit.mockReset().mockResolvedValue(head.head.sha)
  fileStat.mockReset().mockResolvedValue({ isDirectory: () => true })
})

describe("PR workspace preparation", () => {
  it("creates an isolated workspace and an empty plan conversation, not an agent run", async () => {
    const result = await preparePullRequestWorkspace(input)
    expect(result.subChat.mode).toBe("plan")
    expect(result.subChat.messages).toBe("[]")
    expect(result.draft).toContain("Review this PR")
    expect(result.draft).not.toContain("Untrusted PR metadata")
    expect(result.context.text).toContain("Untrusted PR metadata")
    expect(rows.chats[0].prUrl).toBe("https://github.com/owner/repo/pull/42")
    expect(createWorktree.mock.calls[0].slice(3)).toEqual([head.head.sha, "local", { isolatedPullRequest: true }])
  })
  it("never persists a chat or falls back to the project after a checkout failure", async () => {
    createWorktree.mockResolvedValue({ success: false, error: "Checkout failed" })
    await expect(preparePullRequestWorkspace(input)).rejects.toThrow("Checkout failed")
    expect(rows.chats).toHaveLength(0)
    expect(rows.subChats).toHaveLength(0)
  })
  it("rejects a worktree result pointing at the main folder", async () => {
    createWorktree.mockResolvedValue({ success: true, worktreePath: "/project", branch: "main" })
    await expect(preparePullRequestWorkspace(input)).rejects.toThrow("isolated PR workspace")
    expect(rows.chats).toHaveLength(0)
  })
  it("deduplicates concurrent worktree creation while giving each task its own conversation", async () => {
    const results = await Promise.all([preparePullRequestWorkspace(input), preparePullRequestWorkspace({ ...input, action: "fix" })])
    expect(createWorktree).toHaveBeenCalledTimes(1)
    expect(results[0].chatId).toBe(results[1].chatId)
    expect(results[0].subChat.id).not.toBe(results[1].subChat.id)
    expect(results[1].subChat.mode).toBe("agent")
    expect(rows.subChats.every(chat => chat.messages === "[]")).toBe(true)
  })
  it("opens an existing workspace without fetching or creating a conversation", async () => {
    rows.chats.push({ id: "existing", projectId: "project", prNumber: 42, prUrl: "https://github.com/owner/repo/pull/42", worktreePath: "/workspace", branch: "work" })
    const result = await preparePullRequestWorkspace({ ...input, workspaceId: "existing", action: "open" })
    expect(result).toEqual({ chatId: "existing", subChat: null, draft: null, context: null })
    expect(fetchHead).not.toHaveBeenCalled()
    expect(rows.subChats).toHaveLength(0)
  })
  it("does not overwrite messages in a linked conversation", async () => {
    rows.chats.push({ id: "existing", projectId: "project", prNumber: 42, prUrl: "https://github.com/owner/repo/pull/42", worktreePath: "/workspace", branch: "work" })
    rows.subChats.push({ id: "busy", chatId: "existing", messages: "existing messages", streamId: "stream" })
    const result = await preparePullRequestWorkspace({ ...input, workspaceId: "existing", action: "fix" })
    expect(result.subChat.id).not.toBe("busy")
    expect(rows.subChats[0].messages).toBe("existing messages")
    expect(rows.subChats[0].streamId).toBe("stream")
  })
  it("does not confuse identical PR numbers in different repositories", async () => {
    rows.chats.push({ id: "other", projectId: "project", prNumber: 42, prUrl: "https://github.com/owner/other/pull/42", worktreePath: "/workspace" })
    expect((await getPullRequestWorkspaceTargets(input)).workspaces).toHaveLength(0)
    await expect(preparePullRequestWorkspace({ ...input, workspaceId: "other" })).rejects.toThrow("no longer linked")
  })
  it("reports missing and archived workspaces without allowing an open", async () => {
    rows.chats.push({ id: "missing", projectId: "project", prNumber: 42, worktreePath: "/missing" })
    fileStat.mockRejectedValue(new Error("ENOENT"))
    expect((await getPullRequestWorkspaceTargets(input)).workspaces[0].available).toBe(false)
    await expect(preparePullRequestWorkspace({ ...input, workspaceId: "missing", action: "open" })).rejects.toThrow("folder is unavailable")
  })
})
