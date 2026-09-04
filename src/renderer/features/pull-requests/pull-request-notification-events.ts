import type { PullRequestSummary } from "../../../main/lib/git/github/pull-requests"

export type PullRequestNotificationEventType = "merged" | "closed" | "review" | "checks_failing"

export interface PullRequestNotificationEvent {
  type: PullRequestNotificationEventType
  item: PullRequestSummary
}

const REVIEWED_STATES = new Set(["approved", "changes_requested"])

/**
 * Compares two consecutive snapshots of the current user's own pull requests and
 * returns the relevant transitions. `previous` is null on the first snapshot (app
 * just started), which never produces events — only changes detected afterwards do.
 */
export function diffPullRequestNotificationEvents(
  previous: Map<string, PullRequestSummary> | null,
  next: PullRequestSummary[],
  currentUserLogin: string | null,
): PullRequestNotificationEvent[] {
  if (!previous || !currentUserLogin) return []

  const events: PullRequestNotificationEvent[] = []
  for (const item of next) {
    if (item.author !== currentUserLogin) continue
    const prior = previous.get(item.key)
    if (!prior) continue

    if (prior.state !== "merged" && item.state === "merged") {
      events.push({ type: "merged", item })
    } else if (prior.state !== "closed" && item.state === "closed") {
      events.push({ type: "closed", item })
    }

    if (!REVIEWED_STATES.has(prior.reviewState) && REVIEWED_STATES.has(item.reviewState)) {
      events.push({ type: "review", item })
    }

    if (prior.checks.failure === 0 && item.checks.failure > 0) {
      events.push({ type: "checks_failing", item })
    }
  }
  return events
}

export function snapshotPullRequests(items: PullRequestSummary[]): Map<string, PullRequestSummary> {
  return new Map(items.map((item) => [item.key, item]))
}
