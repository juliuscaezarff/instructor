import { describe, expect, it } from "bun:test"
import {
  aggregatePullRequestResults,
  buildPullRequestSearchQuery,
  classifyGitHubError,
  deduplicateGitHubRepositories,
  normalizePullRequestActivity,
  normalizePullRequestFileDiff,
  normalizePullRequestFiles,
  normalizePullRequestStateEvents,
  normalizePullRequestSummary,
  SORT_QUALIFIER,
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
        { owner: " instructor ", repository: " app " },
      ]),
    ).toEqual([
      { owner: "OpenAI", repository: "Codex" },
      { owner: "instructor", repository: "app" },
    ])
  })

  it("sorts successful results and reports partial failures", () => {
    const failure: PullRequestRepositoryFailure = {
      repositoryFullName: "instructor/web",
      issue: "unknown",
      message: "Network unavailable",
    }
    const result = aggregatePullRequestResults(
      ["instructor/app", "instructor/web"],
      [
        {
          items: [summary("instructor/app#1", 100), summary("instructor/app#2", 200)],
          hasNextPage: false,
          failure: null,
        },
        { items: [], hasNextPage: false, failure },
      ],
    )

    expect(result.status).toBe("partial")
    expect(result.items.map((item) => item.key)).toEqual([
      "instructor/app#2",
      "instructor/app#1",
    ])
    expect(result.failures).toEqual([failure])
  })

  it("reports unavailable when every repository fails", () => {
    const failure: PullRequestRepositoryFailure = {
      repositoryFullName: "instructor/app",
      issue: "gh_not_authenticated",
      message: "Run gh auth login",
    }
    const result = aggregatePullRequestResults(
      ["instructor/app"],
      [{ items: [], hasNextPage: false, failure }],
    )

    expect(result.status).toBe("unavailable")
    expect(result.items).toHaveLength(0)
  })

  it("reports hasMore when any repository still has a next page", () => {
    const exhausted = aggregatePullRequestResults(
      ["instructor/app", "instructor/web"],
      [
        { items: [summary("instructor/app#1", 100)], hasNextPage: false, failure: null },
        { items: [summary("instructor/web#1", 50)], hasNextPage: false, failure: null },
      ],
    )
    expect(exhausted.hasMore).toBe(false)

    const withMore = aggregatePullRequestResults(
      ["instructor/app", "instructor/web"],
      [
        { items: [summary("instructor/app#1", 100)], hasNextPage: true, failure: null },
        { items: [summary("instructor/web#1", 50)], hasNextPage: false, failure: null },
      ],
    )
    expect(withMore.hasMore).toBe(true)
  })

  it("maps each sort option to a distinct GitHub search qualifier", () => {
    expect(SORT_QUALIFIER.updated_desc).toBe("sort:updated-desc")
    expect(SORT_QUALIFIER.created_desc).toBe("sort:created-desc")
    expect(SORT_QUALIFIER.created_asc).toBe("sort:created-asc")
    expect(new Set(Object.values(SORT_QUALIFIER)).size).toBe(3)
  })

  it("builds a search query combining author, reviewer, check state, and sort", () => {
    expect(buildPullRequestSearchQuery("instructor/app", { sort: "updated_desc" })).toBe(
      "repo:instructor/app is:pr sort:updated-desc",
    )

    expect(
      buildPullRequestSearchQuery("instructor/app", {
        sort: "created_asc",
        author: " octocat ",
        reviewer: "hubot",
        checkState: "failure",
      }),
    ).toBe(
      "repo:instructor/app is:pr author:octocat reviewed-by:hubot status:failure sort:created-asc",
    )
  })
})

describe("pull request normalization", () => {
  it("preserves draft, review, and check states without inventing data", () => {
    const result = normalizePullRequestSummary(
      {
        number: 42,
        title: "Keep the page compact",
        url: "https://github.com/instructor/app/pull/42",
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
      { owner: "instructor", repository: "app" },
    )

    expect(result.key).toBe("instructor/app#42")
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

  it("normalizes changed files and applies the bounded file limit", () => {
    const files = Array.from({ length: 302 }, (_, index) => ({
      path: `src/file-${index}.ts`,
      additions: index,
      deletions: 1,
      changeType: index === 0 ? "ADDED" : "MODIFIED",
    }))

    const result = normalizePullRequestFiles(files)

    expect(result.total).toBe(302)
    expect(result.items).toHaveLength(300)
    expect(result.truncated).toBe(true)
    expect(result.items[0]).toEqual({
      index: 0,
      path: "src/file-0.ts",
      additions: 0,
      deletions: 1,
      status: "added",
    })
  })

  it("combines commits, comments, and reviews in chronological order", () => {
    const result = normalizePullRequestActivity({
      commits: [
        {
          oid: "abcdef1234567890",
          messageHeadline: "Implement details",
          messageBody: "Keep the data lazy",
          authoredDate: "2026-09-03T10:00:00.000Z",
          committedDate: "2026-09-03T10:00:00.000Z",
          authors: [{ login: "developer" }],
        },
      ],
      comments: [
        {
          id: "comment-1",
          author: { login: "reviewer" },
          body: "Looks good",
          createdAt: "2026-09-03T11:00:00.000Z",
        },
      ],
      reviews: [
        {
          id: "review-1",
          author: { login: "reviewer" },
          body: "Approved",
          state: "APPROVED",
          submittedAt: "2026-09-03T12:00:00.000Z",
        },
      ],
    })

    expect(result.items.map((item) => item.kind)).toEqual([
      "commit",
      "comment",
      "review",
    ])
    expect(result.total).toBe(3)
    expect(result.truncated).toBe(false)
  })

  it("does not expose unavailable or oversized patch content", () => {
    const binary = normalizePullRequestFileDiff({
      filename: "public/logo.png",
      status: "modified",
      additions: 0,
      deletions: 0,
    })
    const oversized = normalizePullRequestFileDiff({
      filename: "src/generated.ts",
      status: "modified",
      additions: 5_001,
      deletions: 0,
      patch: Array.from({ length: 5_001 }, () => "+generated").join("\n"),
    })

    expect(binary.patch).toBeUndefined()
    expect(binary.truncated).toBe(false)
    expect(binary.unavailableReason).toContain("binary")
    expect(oversized.patch).toBeUndefined()
    expect(oversized.truncated).toBe(true)
  })

  it("classifies gh CLI failures without conflating permission and authentication errors", () => {
    expect(classifyGitHubError(new Error("HTTP 403: must have push access to repository"))).toBe(
      "gh_permission_denied",
    )
    expect(classifyGitHubError(new Error("GraphQL: Resource not accessible by integration"))).toBe(
      "gh_permission_denied",
    )
    expect(classifyGitHubError(new Error("HTTP 401: Bad credentials, run gh auth login"))).toBe(
      "gh_not_authenticated",
    )
    const notFound = Object.assign(new Error("spawn gh ENOENT"), { code: "ENOENT" })
    expect(classifyGitHubError(notFound)).toBe("gh_not_found")
    expect(classifyGitHubError(new Error("connection reset"))).toBe("unknown")
  })

  it("bounds oversized activity bodies", () => {
    const result = normalizePullRequestActivity({
      commits: [],
      reviews: [],
      comments: [
        {
          id: "large-comment",
          author: { login: "reviewer" },
          body: "x".repeat(50_001),
          createdAt: "2026-09-03T11:00:00.000Z",
        },
      ],
    })

    expect(result.truncated).toBe(true)
    const item = result.items[0]
    expect(item?.kind).toBe("comment")
    if (item?.kind === "comment") {
      expect(item.body).toHaveLength(50_000)
    }
    expect(item?.bodyTruncated).toBe(true)
  })

  it("normalizes GitHub Actions timeline nodes into state events, skipping unrecognized types", () => {
    const result = normalizePullRequestStateEvents([
      { __typename: "ClosedEvent", actor: { login: "julius" }, createdAt: "2026-09-04T02:50:02Z" },
      { __typename: "ReopenedEvent", actor: { login: "julius" }, createdAt: "2026-09-04T03:11:20Z" },
      { __typename: "MergedEvent", actor: { login: "reviewer" }, createdAt: "2026-09-04T04:00:00Z" },
      { __typename: "LabeledEvent", actor: { login: "julius" }, createdAt: "2026-09-04T05:00:00Z" },
    ])

    expect(result.map((item) => item.kind === "state" && item.state)).toEqual([
      "closed",
      "reopened",
      "merged",
    ])
    expect(result.every((item) => item.kind === "state")).toBe(true)
    expect(result[2]?.author).toBe("reviewer")
  })
})
