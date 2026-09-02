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
