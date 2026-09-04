import { atomWithStorage } from "jotai/utils"

export type PullRequestStateFilter = "all" | "open" | "merged" | "closed"

export const pullRequestStateFilterAtom = atomWithStorage<PullRequestStateFilter>(
  "pull-requests:state-filter",
  "open",
)

export const pullRequestRepositoryFilterAtom = atomWithStorage<string[]>(
  "pull-requests:repository-filter",
  [],
)

export const pullRequestDetailWidthAtom = atomWithStorage<number>(
  "pull-requests:detail-width",
  480,
)

export type PullRequestSortOption = "updated_desc" | "created_desc" | "created_asc"

export const pullRequestSortAtom = atomWithStorage<PullRequestSortOption>(
  "pull-requests:sort",
  "updated_desc",
)

export type PullRequestCheckStateFilter = "success" | "failure" | "pending"
export type PullRequestAgentFilter = "claude-code" | "codex" | "none"

export const pullRequestAuthorFilterAtom = atomWithStorage<string>(
  "pull-requests:author-filter",
  "",
)

export const pullRequestReviewerFilterAtom = atomWithStorage<string>(
  "pull-requests:reviewer-filter",
  "",
)

export const pullRequestCheckStateFilterAtom = atomWithStorage<PullRequestCheckStateFilter | null>(
  "pull-requests:check-state-filter",
  null,
)

export const pullRequestAgentFilterAtom = atomWithStorage<PullRequestAgentFilter | null>(
  "pull-requests:agent-filter",
  null,
)
