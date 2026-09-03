import { describe, expect, it } from "bun:test"
import { reconcileRepositoryAliases } from "./reconcile-repository"

describe("renamed repository metadata", () => {
  const pr = { owner: "owner", repository: "Maestro", number: 7 }
  const project = { id: "local", gitProvider: "github", gitOwner: "owner", gitRepo: "Maestro" }
  const canonical = { id: 1, owner: "owner", repository: "instructor" }
  it("updates verified project names and links while preserving unrelated PRs", async () => {
    const changes = await reconcileRepositoryAliases(pr, [project], [
      { id: "chat", prUrl: "https://github.com/owner/Maestro/pull/7" },
      { id: "other", prUrl: "https://github.com/owner/other/pull/7" },
    ], async () => canonical)
    expect(changes.canonical).toEqual({ owner: "owner", repository: "instructor", number: 7 })
    expect(changes.projectUpdates).toEqual([project])
    expect(changes.chatUpdates).toEqual([{ id: "chat", previousUrl: "https://github.com/owner/Maestro/pull/7", url: "https://github.com/owner/instructor/pull/7" }])
  })
  it("finds old local copies when the PR already uses the new name", async () => {
    const changes = await reconcileRepositoryAliases({ ...pr, repository: "instructor" }, [project], [], async () => canonical)
    expect(changes.projectUpdates).toHaveLength(1)
  })
  it("does not associate repositories with different IDs or inaccessible aliases", async () => {
    const changes = await reconcileRepositoryAliases({ ...pr, repository: "instructor" }, [project, { ...project, id: "private", gitRepo: "private" }], [
      { id: "unrelated", prUrl: "https://github.com/owner/Maestro/pull/7" },
    ], async input => {
      if (input.repository === "private") throw new Error("Not accessible")
      return input.repository === "instructor" ? canonical : { ...canonical, id: 2, repository: "Maestro" }
    })
    expect(changes.projectUpdates).toEqual([])
    expect(changes.chatUpdates).toEqual([])
  })
  it("is idempotent for already-canonical projects and links", async () => {
    const changes = await reconcileRepositoryAliases({ ...pr, repository: "instructor" }, [{ ...project, gitRepo: "instructor" }], [
      { id: "chat", prUrl: "https://github.com/owner/instructor/pull/7" },
    ], async () => canonical)
    expect(changes.projectUpdates).toEqual([])
    expect(changes.chatUpdates).toEqual([])
  })
})
