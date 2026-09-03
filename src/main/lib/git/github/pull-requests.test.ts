import { describe, expect, it } from "bun:test"
import {
  aggregatePullRequestResults,
  deduplicateGitHubRepositories,
  normalizePullRequestSummary,
  type PullRequestRepositoryFailure,
  type PullRequestSummary,
} from "./pull-requests"

function summary(key: string, updatedAt: number): PullRequestSummary {
  const [repositoryFullName, rawNumber] = key.split("#")
  const [owner, repository] = repositoryFullName!.split("/")
  return {
    key,
    owner: owner!,
    repository: repository!,
    repositoryFullName: repositoryFullName!,
    number: Number(rawNumber),
    title: key,
    url: `https://github.com/${repositoryFullName}/pull/${rawNumber}`,
    state: "open",
    createdAt: updatedAt,
    updatedAt,
    additions: 1,
    deletions: 0,
    reviewState: "none",
    checks: { total: 0, success: 0, failure: 0, pending: 0 },
  }
}

describe("pull request repository aggregation", () => {
  it("deduplicates repository names without changing the first display casing", () => {
    expect(
      deduplicateGitHubRepositories([
        { owner: "OpenAI", repository: "Codex.git" },
        { owner: "openai", repository: "codex" },
        { owner: " maestro ", repository: " app " },
      ]),
    ).toEqual([
      { owner: "OpenAI", repository: "Codex" },
      { owner: "maestro", repository: "app" },
    ])
  })

  it("sorts successful results and reports partial failures", () => {
    const failure: PullRequestRepositoryFailure = {
      repositoryFullName: "maestro/web",
      issue: "unknown",
      message: "Network unavailable",
    }
    const result = aggregatePullRequestResults(
      ["maestro/app", "maestro/web"],
      [
        {
          items: [summary("maestro/app#1", 100), summary("maestro/app#2", 200)],
          failure: null,
        },
        { items: [], failure },
      ],
    )

    expect(result.status).toBe("partial")
    expect(result.items.map((item) => item.key)).toEqual([
      "maestro/app#2",
      "maestro/app#1",
    ])
    expect(result.failures).toEqual([failure])
  })

  it("reports unavailable when every repository fails", () => {
    const failure: PullRequestRepositoryFailure = {
      repositoryFullName: "maestro/app",
      issue: "gh_not_authenticated",
      message: "Run gh auth login",
    }
    const result = aggregatePullRequestResults(
      ["maestro/app"],
      [{ items: [], failure }],
    )

    expect(result.status).toBe("unavailable")
    expect(result.items).toHaveLength(0)
  })
})

describe("pull request normalization", () => {
  it("preserves draft, review, and check states without inventing data", () => {
    const result = normalizePullRequestSummary(
      {
        number: 42,
        title: "Keep the page compact",
        url: "https://github.com/maestro/app/pull/42",
        state: "OPEN",
        isDraft: true,
        author: null,
        createdAt: "2026-09-01T10:00:00.000Z",
        updatedAt: "2026-09-02T10:00:00.000Z",
        mergedAt: null,
        additions: 12,
        deletions: 3,
        reviewDecision: "CHANGES_REQUESTED",
        statusCheckRollup: [
          { name: "build", conclusion: "SUCCESS" },
          { name: "lint", conclusion: "FAILURE" },
          { name: "tests", status: "IN_PROGRESS", conclusion: "" },
        ],
      },
      { owner: "maestro", repository: "app" },
    )

    expect(result.key).toBe("maestro/app#42")
    expect(result.state).toBe("draft")
    expect(result.reviewState).toBe("changes_requested")
    expect(result.author).toBeUndefined()
    expect(result.checks).toEqual({
      total: 3,
      success: 1,
      failure: 1,
      pending: 1,
    })
  })
})
