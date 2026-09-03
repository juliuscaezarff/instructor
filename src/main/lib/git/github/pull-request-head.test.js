import { beforeEach, describe, expect, it, mock } from "bun:test"

const run = mock()
const { fetchPullRequestHead, fetchVerifiedPullRequestCommit, githubRemoteMatches, pullRequestHeadSchema } = await import("./pull-request-head")
const pr = { owner: "owner", repository: "repo", number: 42, repositoryId: 1 }
const repository = { stdout: JSON.stringify({ id: 1, full_name: "owner/repo" }) }
const sha = "a".repeat(40)
beforeEach(() => run.mockReset())

describe("verified PR checkout", () => {
  it("accepts only the exact configured GitHub remote", () => {
    for (const remote of ["git@github.com:Owner/Repo.git", "https://github.com/owner/repo.git", "ssh://git@github.com/owner/repo.git"]) expect(githubRemoteMatches(remote, pr)).toBe(true)
    for (const remote of ["https://github.com.evil/owner/repo", "git@github.com:owner/other.git", "file:///repo", "https://user:secret@github.com/owner/repo"]) expect(githubRemoteMatches(remote, pr)).toBe(false)
  })
  it("fetches forks through the base repository pull ref and validates the SHA", async () => {
    run.mockResolvedValueOnce({ stdout: "git@github.com:owner/repo.git" })
      .mockResolvedValueOnce(repository)
      .mockResolvedValueOnce({ stdout: "" }).mockResolvedValueOnce({ stdout: `${sha}\n` })
    expect(await fetchVerifiedPullRequestCommit("/project", pr, sha, run)).toBe(sha)
    expect(run.mock.calls[2][1]).toEqual(["-C", "/project", "fetch", "--no-tags", "--no-recurse-submodules", "origin", "+refs/pull/42/head:refs/instructor/pull/42/head"])
    expect(run.mock.calls.flat().join(" ")).not.toContain("checkout")
  })
  it("rejects a changed head before checkout", async () => {
    run.mockResolvedValueOnce({ stdout: "https://github.com/owner/repo.git" })
      .mockResolvedValueOnce(repository)
      .mockResolvedValueOnce({ stdout: "" }).mockResolvedValueOnce({ stdout: "b".repeat(40) })
    await expect(fetchVerifiedPullRequestCommit("/project", pr, sha, run)).rejects.toThrow("PR changed")
  })
  it("rejects missing heads and wrong repositories", async () => {
    expect(pullRequestHeadSchema.safeParse({ number: 42, title: "PR", body: null, head: null }).success).toBe(false)
    run.mockResolvedValueOnce({ stdout: JSON.stringify({ number: 42, title: "PR", body: null, head: { sha, ref: "fork-branch" }, base: { sha, ref: "main", repo: { id: 2, full_name: "owner/other" } } }) })
      .mockResolvedValueOnce(repository)
    await expect(fetchPullRequestHead(pr, run)).rejects.toThrow("different GitHub repository")
  })
  it("accepts a renamed or transferred repository only when IDs match", async () => {
    const head = { number: 42, title: "PR", body: null, head: { sha, ref: "feature" }, base: { sha, ref: "main", repo: { id: 1, full_name: "new-owner/instructor" } } }
    run.mockResolvedValueOnce({ stdout: JSON.stringify(head) })
      .mockResolvedValueOnce({ stdout: JSON.stringify({ id: 1, full_name: "new-owner/instructor" }) })
    expect((await fetchPullRequestHead(pr, run)).base.repo.id).toBe(1)
  })
  it("accepts an old origin redirect but rejects a reused old name", async () => {
    run.mockResolvedValueOnce({ stdout: "git@github.com:owner/Maestro.git" })
      .mockResolvedValueOnce({ stdout: JSON.stringify({ id: 1, full_name: "owner/instructor" }) })
      .mockResolvedValueOnce({ stdout: "" }).mockResolvedValueOnce({ stdout: sha })
    expect(await fetchVerifiedPullRequestCommit("/project", { ...pr, repository: "instructor" }, sha, run)).toBe(sha)
    run.mockReset().mockResolvedValueOnce({ stdout: "git@github.com:owner/Maestro.git" })
      .mockResolvedValueOnce({ stdout: JSON.stringify({ id: 99, full_name: "owner/Maestro" }) })
    await expect(fetchVerifiedPullRequestCommit("/project", { ...pr, repository: "instructor" }, sha, run)).rejects.toThrow("origin does not match")
    expect(run.mock.calls).toHaveLength(2)
  })
})
