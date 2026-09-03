import { describe, expect, it } from "bun:test"
import { defaultPullRequestChatTarget } from "./pull-request-chat-target"

describe("direct PR chat destination", () => {
  const project = { id: "project" }
  const workspace = { id: "chat", projectId: project.id, available: true, isolated: true }

  it("opens a unique linked worktree without a chooser", () => {
    expect(defaultPullRequestChatTarget({ projects: [project], workspaces: [workspace] })).toBe("workspace:chat")
  })
  it("uses the unique project when no workspace exists", () => {
    expect(defaultPullRequestChatTarget({ projects: [project], workspaces: [] })).toBe("project:project")
  })
  it("requires a choice between several linked worktrees", () => {
    expect(defaultPullRequestChatTarget({ projects: [project], workspaces: [workspace, { ...workspace, id: "other" }] })).toBeNull()
  })
  it("requires a choice between local copies of the repository", () => {
    expect(defaultPullRequestChatTarget({ projects: [project, { id: "other" }], workspaces: [] })).toBeNull()
  })
  it("does not prepare a task in the main project folder or a missing folder", () => {
    for (const unavailable of [{ ...workspace, isolated: false }, { ...workspace, available: false }]) {
      expect(defaultPullRequestChatTarget({ projects: [project], workspaces: [unavailable] })).toBe("project:project")
    }
  })
  it("does not invent a destination when no local project is configured", () => {
    expect(defaultPullRequestChatTarget({ projects: [], workspaces: [] })).toBeNull()
  })
})
