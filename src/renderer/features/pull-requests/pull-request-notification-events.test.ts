import { describe, expect, it } from "bun:test"
import { diffPullRequestNotificationEvents, snapshotPullRequests } from "./pull-request-notification-events"
import type { PullRequestSummary } from "../../../main/lib/git/github/pull-requests"

function summary(overrides: Partial<PullRequestSummary> = {}): PullRequestSummary {
  return {
    key: "instructor/app#1",
    owner: "instructor",
    repository: "app",
    repositoryFullName: "instructor/app",
    number: 1,
    title: "Do the thing",
    url: "https://github.com/instructor/app/pull/1",
    author: "octocat",
    state: "open",
    createdAt: 0,
    updatedAt: 0,
    additions: 1,
    deletions: 0,
    reviewState: "none",
    checks: { total: 0, success: 0, failure: 0, pending: 0 },
    ...overrides,
  }
}

describe("diffPullRequestNotificationEvents", () => {
  it("does not notify on the first snapshot", () => {
    const events = diffPullRequestNotificationEvents(null, [summary({ state: "merged" })], "octocat")
    expect(events).toHaveLength(0)
  })

  it("does not notify for pull requests authored by someone else", () => {
    const previous = snapshotPullRequests([summary({ author: "hubot", state: "open" })])
    const events = diffPullRequestNotificationEvents(
      previous,
      [summary({ author: "hubot", state: "merged" })],
      "octocat",
    )
    expect(events).toHaveLength(0)
  })

  it("notifies when the user's own pull request is merged", () => {
    const previous = snapshotPullRequests([summary({ state: "open" })])
    const events = diffPullRequestNotificationEvents(previous, [summary({ state: "merged" })], "octocat")
    expect(events.map((event) => event.type)).toEqual(["merged"])
  })

  it("notifies when the user's own pull request is closed without merging", () => {
    const previous = snapshotPullRequests([summary({ state: "open" })])
    const events = diffPullRequestNotificationEvents(previous, [summary({ state: "closed" })], "octocat")
    expect(events.map((event) => event.type)).toEqual(["closed"])
  })

  it("notifies when a review is received", () => {
    const previous = snapshotPullRequests([summary({ reviewState: "review_required" })])
    const events = diffPullRequestNotificationEvents(
      previous,
      [summary({ reviewState: "changes_requested" })],
      "octocat",
    )
    expect(events.map((event) => event.type)).toEqual(["review"])
  })

  it("does not re-notify while the review stays in an already-reviewed state", () => {
    const previous = snapshotPullRequests([summary({ reviewState: "approved" })])
    const events = diffPullRequestNotificationEvents(previous, [summary({ reviewState: "approved" })], "octocat")
    expect(events).toHaveLength(0)
  })

  it("notifies when checks start failing", () => {
    const previous = snapshotPullRequests([
      summary({ checks: { total: 2, success: 2, failure: 0, pending: 0 } }),
    ])
    const events = diffPullRequestNotificationEvents(
      previous,
      [summary({ checks: { total: 2, success: 1, failure: 1, pending: 0 } })],
      "octocat",
    )
    expect(events.map((event) => event.type)).toEqual(["checks_failing"])
  })

  it("does not re-notify while checks stay failing", () => {
    const previous = snapshotPullRequests([
      summary({ checks: { total: 2, success: 1, failure: 1, pending: 0 } }),
    ])
    const events = diffPullRequestNotificationEvents(
      previous,
      [summary({ checks: { total: 2, success: 1, failure: 1, pending: 0 } })],
      "octocat",
    )
    expect(events).toHaveLength(0)
  })

  it("can report more than one event for the same pull request", () => {
    const previous = snapshotPullRequests([
      summary({ state: "open", reviewState: "review_required" }),
    ])
    const events = diffPullRequestNotificationEvents(
      previous,
      [summary({ state: "merged", reviewState: "approved" })],
      "octocat",
    )
    expect(events.map((event) => event.type).sort()).toEqual(["merged", "review"])
  })

  it("ignores pull requests missing from the previous snapshot", () => {
    const previous = snapshotPullRequests([])
    const events = diffPullRequestNotificationEvents(previous, [summary({ state: "merged" })], "octocat")
    expect(events).toHaveLength(0)
  })
})
