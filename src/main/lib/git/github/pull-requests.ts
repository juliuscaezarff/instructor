import { z } from "zod"
import { execWithShellEnv } from "../shell-env"
import { GHCheckContextSchema } from "./types"

const GHPullRequestListItemSchema = z.object({
  number: z.number(),
  title: z.string(),
  url: z.string().url(),
  state: z.enum(["OPEN", "CLOSED", "MERGED"]),
  isDraft: z.boolean().default(false),
  author: z.object({ login: z.string() }).nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  mergedAt: z.string().nullable().optional(),
  additions: z.number().default(0),
  deletions: z.number().default(0),
  reviewDecision: z
    .enum(["APPROVED", "CHANGES_REQUESTED", "REVIEW_REQUIRED", ""])
    .nullable()
    .optional(),
  statusCheckRollup: z.array(GHCheckContextSchema).nullable().optional(),
})

const GHPullRequestListSchema = z.array(GHPullRequestListItemSchema)

const GHReviewSchema = z.object({
  author: z.object({ login: z.string() }).nullable().optional(),
  state: z.string(),
})

const GHPullRequestDetailSchema = GHPullRequestListItemSchema.extend({
  body: z.string().default(""),
  baseRefName: z.string(),
  headRefName: z.string(),
  mergeable: z.enum(["MERGEABLE", "CONFLICTING", "UNKNOWN"]).optional(),
  latestReviews: z.array(GHReviewSchema).nullable().optional(),
})

export type PullRequestState = "draft" | "open" | "merged" | "closed"
export type PullRequestReviewState =
  | "approved"
  | "changes_requested"
  | "review_required"
  | "none"

export type PullRequestCheckState =
  | "success"
  | "failure"
  | "pending"
  | "skipped"
  | "cancelled"

export interface PullRequestCheck {
  name: string
  state: PullRequestCheckState
  url?: string
}

export interface PullRequestCheckSummary {
  total: number
  success: number
  failure: number
  pending: number
}

export interface PullRequestSummary {
  key: string
  owner: string
  repository: string
  repositoryFullName: string
  number: number
  title: string
  url: string
  author?: string
  state: PullRequestState
  createdAt: number
  updatedAt: number
  mergedAt?: number
  additions: number
  deletions: number
  reviewState: PullRequestReviewState
  checks: PullRequestCheckSummary
}

export interface PullRequestDetail extends PullRequestSummary {
  body: string
  baseBranch: string
  headBranch: string
  mergeable?: "MERGEABLE" | "CONFLICTING" | "UNKNOWN"
  reviewers: Array<{
    login: string
    state: string
  }>
  checkItems: PullRequestCheck[]
}

export interface GitHubRepositoryRef {
  owner: string
  repository: string
}

export type GitHubAvailabilityIssue =
  | "gh_not_found"
  | "gh_not_authenticated"
  | "unknown"

export interface PullRequestRepositoryFailure {
  repositoryFullName: string
  issue: GitHubAvailabilityIssue
  message: string
}

export interface PullRequestListResult {
  status: "ready" | "partial" | "no_repositories" | "unavailable"
  items: PullRequestSummary[]
  repositories: string[]
  failures: PullRequestRepositoryFailure[]
  fetchedAt: number
}

export interface PullRequestRepositoryOutcome {
  items: PullRequestSummary[]
  failure: PullRequestRepositoryFailure | null
}

type CheckContext = z.infer<typeof GHCheckContextSchema>
type RawPullRequestSummary = z.infer<typeof GHPullRequestListItemSchema>

const LIST_CACHE_TTL_MS = 30_000
const DETAIL_CACHE_TTL_MS = 30_000
const MAX_CONCURRENT_REPOSITORIES = 4
const MAX_PULL_REQUESTS_PER_REPOSITORY = 50

const listCache = new Map<
  string,
  { expiresAt: number; items: PullRequestSummary[] }
>()
const detailCache = new Map<
  string,
  { expiresAt: number; detail: PullRequestDetail }
>()

function parseDate(value: string | null | undefined): number | undefined {
  if (!value) return undefined
  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? undefined : timestamp
}

function normalizeState(
  state: RawPullRequestSummary["state"],
  isDraft: boolean,
): PullRequestState {
  if (state === "MERGED") return "merged"
  if (state === "CLOSED") return "closed"
  return isDraft ? "draft" : "open"
}

function normalizeReviewState(
  reviewDecision: RawPullRequestSummary["reviewDecision"],
): PullRequestReviewState {
  if (reviewDecision === "APPROVED") return "approved"
  if (reviewDecision === "CHANGES_REQUESTED") return "changes_requested"
  if (reviewDecision === "REVIEW_REQUIRED") return "review_required"
  return "none"
}

function normalizeCheck(context: CheckContext): PullRequestCheck {
  const rawState = context.state || context.conclusion
  let state: PullRequestCheckState = "pending"

  if (rawState === "SUCCESS") state = "success"
  else if (
    rawState === "FAILURE" ||
    rawState === "ERROR" ||
    rawState === "TIMED_OUT" ||
    rawState === "ACTION_REQUIRED"
  ) {
    state = "failure"
  } else if (rawState === "SKIPPED" || rawState === "NEUTRAL") {
    state = "skipped"
  } else if (rawState === "CANCELLED") {
    state = "cancelled"
  }

  return {
    name: context.name || context.context || "Unknown check",
    state,
    url: context.detailsUrl || context.targetUrl,
  }
}

function summarizeChecks(checks: PullRequestCheck[]): PullRequestCheckSummary {
  return checks.reduce<PullRequestCheckSummary>(
    (summary, check) => {
      summary.total += 1
      if (check.state === "success" || check.state === "skipped") {
        summary.success += 1
      } else if (check.state === "failure" || check.state === "cancelled") {
        summary.failure += 1
      } else {
        summary.pending += 1
      }
      return summary
    },
    { total: 0, success: 0, failure: 0, pending: 0 },
  )
}

export function normalizePullRequestSummary(
  raw: RawPullRequestSummary,
  repository: GitHubRepositoryRef,
): PullRequestSummary {
  const repositoryFullName = `${repository.owner}/${repository.repository}`
  const checkItems = (raw.statusCheckRollup ?? []).map(normalizeCheck)

  return {
    key: `${repositoryFullName}#${raw.number}`,
    owner: repository.owner,
    repository: repository.repository,
    repositoryFullName,
    number: raw.number,
    title: raw.title,
    url: raw.url,
    author: raw.author?.login,
    state: normalizeState(raw.state, raw.isDraft),
    createdAt: parseDate(raw.createdAt) ?? 0,
    updatedAt: parseDate(raw.updatedAt) ?? 0,
    mergedAt: parseDate(raw.mergedAt),
    additions: raw.additions,
    deletions: raw.deletions,
    reviewState: normalizeReviewState(raw.reviewDecision),
    checks: summarizeChecks(checkItems),
  }
}

export function deduplicateGitHubRepositories(
  repositories: GitHubRepositoryRef[],
): GitHubRepositoryRef[] {
  const unique = new Map<string, GitHubRepositoryRef>()

  for (const repository of repositories) {
    const owner = repository.owner.trim()
    const repo = repository.repository.trim().replace(/\.git$/i, "")
    if (!owner || !repo) continue
    const key = `${owner}/${repo}`.toLowerCase()
    if (!unique.has(key)) unique.set(key, { owner, repository: repo })
  }

  return [...unique.values()]
}

function classifyGitHubError(error: unknown): PullRequestRepositoryFailure["issue"] {
  const message = error instanceof Error ? error.message.toLowerCase() : ""
  const code =
    error instanceof Error && "code" in error
      ? String((error as Error & { code?: unknown }).code).toLowerCase()
      : ""

  if (
    code === "enoent" ||
    message.includes("spawn gh") ||
    message.includes("command not found") ||
    message.includes("not recognized")
  ) {
    return "gh_not_found"
  }

  if (
    message.includes("gh auth login") ||
    message.includes("not logged into") ||
    message.includes("authentication") ||
    message.includes("http 401")
  ) {
    return "gh_not_authenticated"
  }

  return "unknown"
}

function errorMessage(error: unknown): string {
  if (!(error instanceof Error)) return "Unable to load pull requests"
  const stderr =
    "stderr" in error && typeof (error as Error & { stderr?: unknown }).stderr === "string"
      ? (error as Error & { stderr: string }).stderr.trim()
      : ""
  return stderr || error.message
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(values.length)
  let cursor = 0

  async function worker() {
    while (cursor < values.length) {
      const index = cursor
      cursor += 1
      results[index] = await mapper(values[index]!)
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () => worker()),
  )
  return results
}

async function listRepositoryPullRequests(
  repository: GitHubRepositoryRef,
  forceRefresh: boolean,
): Promise<PullRequestSummary[]> {
  const repositoryFullName = `${repository.owner}/${repository.repository}`
  const cacheKey = repositoryFullName.toLowerCase()
  const cached = listCache.get(cacheKey)

  if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
    return cached.items
  }

  const { stdout } = await execWithShellEnv(
    "gh",
    [
      "pr",
      "list",
      "--repo",
      repositoryFullName,
      "--state",
      "all",
      "--limit",
      String(MAX_PULL_REQUESTS_PER_REPOSITORY),
      "--json",
      "number,title,url,state,isDraft,author,createdAt,updatedAt,mergedAt,additions,deletions,reviewDecision,statusCheckRollup",
    ],
    { timeout: 20_000 },
  )

  const parsed = GHPullRequestListSchema.parse(JSON.parse(stdout))
  const items = parsed.map((item) => normalizePullRequestSummary(item, repository))
  listCache.set(cacheKey, {
    expiresAt: Date.now() + LIST_CACHE_TTL_MS,
    items,
  })
  return items
}

export async function listPullRequests(
  repositories: GitHubRepositoryRef[],
  forceRefresh = false,
): Promise<PullRequestListResult> {
  const uniqueRepositories = deduplicateGitHubRepositories(repositories)
  const repositoryNames = uniqueRepositories.map(
    ({ owner, repository }) => `${owner}/${repository}`,
  )

  if (uniqueRepositories.length === 0) {
    return {
      status: "no_repositories",
      items: [],
      repositories: [],
      failures: [],
      fetchedAt: Date.now(),
    }
  }

  const results = await mapWithConcurrency<
    GitHubRepositoryRef,
    PullRequestRepositoryOutcome
  >(
    uniqueRepositories,
    MAX_CONCURRENT_REPOSITORIES,
    async (repository) => {
      const repositoryFullName = `${repository.owner}/${repository.repository}`
      try {
        return {
          items: await listRepositoryPullRequests(repository, forceRefresh),
          failure: null,
        }
      } catch (error) {
        return {
          items: [],
          failure: {
            repositoryFullName,
            issue: classifyGitHubError(error),
            message: errorMessage(error),
          } satisfies PullRequestRepositoryFailure,
        }
      }
    },
  )

  return aggregatePullRequestResults(repositoryNames, results)
}

export function aggregatePullRequestResults(
  repositories: string[],
  results: PullRequestRepositoryOutcome[],
): PullRequestListResult {
  const items = results
    .flatMap((result) => result.items)
    .sort((a, b) => b.updatedAt - a.updatedAt)
  const failures = results.flatMap((result) =>
    result.failure ? [result.failure] : [],
  )

  return {
    status:
      failures.length === repositories.length
        ? "unavailable"
        : failures.length > 0
          ? "partial"
          : "ready",
    items,
    repositories,
    failures,
    fetchedAt: Date.now(),
  }
}

export async function getPullRequestDetail(
  repository: GitHubRepositoryRef,
  number: number,
): Promise<PullRequestDetail> {
  const repositoryFullName = `${repository.owner}/${repository.repository}`
  const cacheKey = `${repositoryFullName.toLowerCase()}#${number}`
  const cached = detailCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.detail

  const { stdout } = await execWithShellEnv(
    "gh",
    [
      "pr",
      "view",
      String(number),
      "--repo",
      repositoryFullName,
      "--json",
      "number,title,url,state,isDraft,author,createdAt,updatedAt,mergedAt,additions,deletions,reviewDecision,statusCheckRollup,body,baseRefName,headRefName,mergeable,latestReviews",
    ],
    { timeout: 20_000 },
  )

  const raw = GHPullRequestDetailSchema.parse(JSON.parse(stdout))
  const summary = normalizePullRequestSummary(raw, repository)
  const checkItems = (raw.statusCheckRollup ?? []).map(normalizeCheck)
  const detail: PullRequestDetail = {
    ...summary,
    body: raw.body,
    baseBranch: raw.baseRefName,
    headBranch: raw.headRefName,
    mergeable: raw.mergeable,
    reviewers: (raw.latestReviews ?? []).flatMap((review) =>
      review.author?.login
        ? [{ login: review.author.login, state: review.state.toLowerCase() }]
        : [],
    ),
    checkItems,
  }

  detailCache.set(cacheKey, {
    expiresAt: Date.now() + DETAIL_CACHE_TTL_MS,
    detail,
  })
  return detail
}
