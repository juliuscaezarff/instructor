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

const GHPullRequestFileSchema = z.object({
  path: z.string(),
  additions: z.number().default(0),
  deletions: z.number().default(0),
  changeType: z.string().default("MODIFIED"),
})

const GHPullRequestFilesSchema = z.object({
  files: z.array(GHPullRequestFileSchema).default([]),
  changedFiles: z.number().int().nonnegative().optional(),
})

const GHCommitSchema = z.object({
  oid: z.string(),
  messageHeadline: z.string(),
  messageBody: z.string().default(""),
  authoredDate: z.string(),
  committedDate: z.string().optional(),
  authors: z
    .array(
      z.object({
        login: z.string().optional(),
        name: z.string().optional(),
      }),
    )
    .default([]),
})

const GHCommentSchema = z.object({
  id: z.string().optional(),
  author: z.object({ login: z.string() }).nullable().optional(),
  body: z.string().default(""),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  url: z.string().url().optional(),
})

const GHActivityReviewSchema = z.object({
  id: z.string().optional(),
  author: z.object({ login: z.string() }).nullable().optional(),
  body: z.string().default(""),
  state: z.string(),
  submittedAt: z.string().nullable().optional(),
  url: z.string().url().optional(),
})

const GHPullRequestActivitySchema = z.object({
  commits: z.array(GHCommitSchema).default([]),
  comments: z.array(GHCommentSchema).default([]),
  reviews: z.array(GHActivityReviewSchema).default([]),
})

const GHRestPullRequestFileSchema = z.object({
  filename: z.string(),
  previous_filename: z.string().optional(),
  status: z.string(),
  additions: z.number().default(0),
  deletions: z.number().default(0),
  patch: z.string().nullable().optional(),
})

const GHRestPullRequestFilesSchema = z.array(GHRestPullRequestFileSchema)

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

export interface PullRequestFile {
  index: number
  path: string
  additions: number
  deletions: number
  status: "added" | "deleted" | "modified" | "renamed" | "copied" | "changed"
}

export interface PullRequestFilesResult {
  sourceKey?: string
  items: PullRequestFile[]
  total: number
  truncated: boolean
}

export type PullRequestActivityItem =
  | {
      id: string
      kind: "commit"
      author?: string
      createdAt: number
      title: string
      body?: string
      bodyTruncated?: boolean
      sha: string
    }
  | {
      id: string
      kind: "comment"
      author?: string
      createdAt: number
      body: string
      bodyTruncated?: boolean
      url?: string
    }
  | {
      id: string
      kind: "review"
      author?: string
      createdAt: number
      body?: string
      bodyTruncated?: boolean
      state: string
      url?: string
    }

export interface PullRequestActivityResult {
  sourceKey?: string
  items: PullRequestActivityItem[]
  total: number
  truncated: boolean
}

export interface PullRequestFileDiff {
  sourceKey?: string
  path: string
  previousPath?: string
  status: PullRequestFile["status"]
  additions: number
  deletions: number
  patch?: string
  truncated: boolean
  unavailableReason?: string
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
const MAX_FILES_PER_PULL_REQUEST = 300
const MAX_FILES_RESPONSE_BYTES = 2_000_000
const MAX_ACTIVITY_ITEMS = 200
const MAX_ACTIVITY_BODY_CHARS = 50_000
const MAX_ACTIVITY_RESPONSE_BYTES = 4_000_000
const MAX_PATCH_BYTES = 500_000
const MAX_PATCH_LINES = 5_000

const listCache = new Map<
  string,
  { expiresAt: number; items: PullRequestSummary[] }
>()
const detailCache = new Map<
  string,
  { expiresAt: number; detail: PullRequestDetail }
>()
const filesCache = new Map<
  string,
  { expiresAt: number; result: PullRequestFilesResult }
>()
const activityCache = new Map<
  string,
  { expiresAt: number; result: PullRequestActivityResult }
>()
const fileDiffCache = new Map<
  string,
  { expiresAt: number; result: PullRequestFileDiff }
>()

function parseDate(value: string | null | undefined): number | undefined {
  if (!value) return undefined
  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? undefined : timestamp
}

function normalizeFileStatus(value: string): PullRequestFile["status"] {
  const status = value.toLowerCase()
  if (status === "added" || status === "deleted" || status === "renamed" || status === "copied" || status === "changed") {
    return status
  }
  return "modified"
}

export function normalizePullRequestFiles(
  rawFiles: z.infer<typeof GHPullRequestFileSchema>[],
  reportedTotal = rawFiles.length,
): PullRequestFilesResult {
  const total = Math.max(reportedTotal, rawFiles.length)
  return {
    items: rawFiles.slice(0, MAX_FILES_PER_PULL_REQUEST).map((file, index) => ({
      index,
      path: file.path,
      additions: file.additions,
      deletions: file.deletions,
      status: normalizeFileStatus(file.changeType),
    })),
    total,
    truncated: total > MAX_FILES_PER_PULL_REQUEST,
  }
}

export function normalizePullRequestActivity(
  raw: z.infer<typeof GHPullRequestActivitySchema>,
): PullRequestActivityResult {
  const boundedBody = (body: string) => ({
    body: body.slice(0, MAX_ACTIVITY_BODY_CHARS),
    bodyTruncated: body.length > MAX_ACTIVITY_BODY_CHARS || undefined,
  })
  const commits: PullRequestActivityItem[] = raw.commits.map((commit) => {
    const content = boundedBody(commit.messageBody)
    return {
      id: `commit-${commit.oid}`,
      kind: "commit",
      author: commit.authors[0]?.login || commit.authors[0]?.name,
      createdAt: parseDate(commit.committedDate || commit.authoredDate) ?? 0,
      title: commit.messageHeadline,
      body: content.body || undefined,
      bodyTruncated: content.bodyTruncated,
      sha: commit.oid,
    }
  })
  const comments: PullRequestActivityItem[] = raw.comments.map((comment, index) => {
    const content = boundedBody(comment.body)
    return {
      id: comment.id || `comment-${index}-${comment.createdAt}`,
      kind: "comment",
      author: comment.author?.login,
      createdAt: parseDate(comment.createdAt) ?? 0,
      body: content.body,
      bodyTruncated: content.bodyTruncated,
      url: comment.url,
    }
  })
  const reviews: PullRequestActivityItem[] = raw.reviews.map((review, index) => {
    const content = boundedBody(review.body)
    return {
      id: review.id || `review-${index}-${review.submittedAt ?? "unknown"}`,
      kind: "review",
      author: review.author?.login,
      createdAt: parseDate(review.submittedAt) ?? 0,
      body: content.body || undefined,
      bodyTruncated: content.bodyTruncated,
      state: review.state.toLowerCase(),
      url: review.url,
    }
  })
  const items = [...commits, ...comments, ...reviews].sort(
    (a, b) => a.createdAt - b.createdAt,
  )

  return {
    items: items.slice(-MAX_ACTIVITY_ITEMS),
    total: items.length,
    truncated:
      items.length > MAX_ACTIVITY_ITEMS ||
      items.some((item) => item.bodyTruncated),
  }
}

export function normalizePullRequestFileDiff(
  file: z.infer<typeof GHRestPullRequestFileSchema>,
): PullRequestFileDiff {
  const patchBytes = file.patch ? Buffer.byteLength(file.patch, "utf8") : 0
  const patchLines = file.patch ? file.patch.split("\n").length : 0
  const exceedsLimit = patchBytes > MAX_PATCH_BYTES || patchLines > MAX_PATCH_LINES

  return {
    path: file.filename,
    previousPath: file.previous_filename,
    status: normalizeFileStatus(file.status),
    additions: file.additions,
    deletions: file.deletions,
    patch: exceedsLimit ? undefined : file.patch ?? undefined,
    truncated: exceedsLimit,
    unavailableReason: exceedsLimit
      ? "This patch is too large to render safely in the detail panel."
      : file.patch
        ? undefined
        : "GitHub did not provide a text patch for this file. It may be binary or too large.",
  }
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
  forceRefresh = false,
): Promise<PullRequestDetail> {
  const repositoryFullName = `${repository.owner}/${repository.repository}`
  const cacheKey = `${repositoryFullName.toLowerCase()}#${number}`
  const cached = detailCache.get(cacheKey)
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) return cached.detail

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

export async function getPullRequestFiles(
  repository: GitHubRepositoryRef,
  number: number,
  forceRefresh = false,
): Promise<PullRequestFilesResult> {
  const repositoryFullName = `${repository.owner}/${repository.repository}`
  const cacheKey = `${repositoryFullName.toLowerCase()}#${number}`
  const cached = filesCache.get(cacheKey)
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) return cached.result

  const { stdout } = await execWithShellEnv(
    "gh",
    [
      "pr",
      "view",
      String(number),
      "--repo",
      repositoryFullName,
      "--json",
      "files,changedFiles",
    ],
    { timeout: 20_000, maxBuffer: MAX_FILES_RESPONSE_BYTES },
  )

  const raw = GHPullRequestFilesSchema.parse(JSON.parse(stdout))
  const result = {
    ...normalizePullRequestFiles(raw.files, raw.changedFiles),
    sourceKey: cacheKey,
  }
  filesCache.set(cacheKey, {
    expiresAt: Date.now() + DETAIL_CACHE_TTL_MS,
    result,
  })
  return result
}

export async function getPullRequestActivity(
  repository: GitHubRepositoryRef,
  number: number,
  forceRefresh = false,
): Promise<PullRequestActivityResult> {
  const repositoryFullName = `${repository.owner}/${repository.repository}`
  const cacheKey = `${repositoryFullName.toLowerCase()}#${number}`
  const cached = activityCache.get(cacheKey)
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) return cached.result

  const { stdout } = await execWithShellEnv(
    "gh",
    [
      "pr",
      "view",
      String(number),
      "--repo",
      repositoryFullName,
      "--json",
      "commits,comments,reviews",
    ],
    { timeout: 20_000, maxBuffer: MAX_ACTIVITY_RESPONSE_BYTES },
  )

  const raw = GHPullRequestActivitySchema.parse(JSON.parse(stdout))
  const result = {
    ...normalizePullRequestActivity(raw),
    sourceKey: cacheKey,
  }
  activityCache.set(cacheKey, {
    expiresAt: Date.now() + DETAIL_CACHE_TTL_MS,
    result,
  })
  return result
}

export async function getPullRequestFileDiff(
  repository: GitHubRepositoryRef,
  number: number,
  fileIndex: number,
  expectedPath: string,
  forceRefresh = false,
): Promise<PullRequestFileDiff> {
  const repositoryFullName = `${repository.owner}/${repository.repository}`
  const cacheKey = `${repositoryFullName.toLowerCase()}#${number}:${fileIndex}:${expectedPath}`
  const cached = fileDiffCache.get(cacheKey)
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) return cached.result

  const owner = encodeURIComponent(repository.owner)
  const repo = encodeURIComponent(repository.repository)
  const endpoint = `repos/${owner}/${repo}/pulls/${number}/files?per_page=1&page=${fileIndex + 1}`
  const { stdout } = await execWithShellEnv(
    "gh",
    ["api", endpoint],
    { timeout: 20_000, maxBuffer: MAX_PATCH_BYTES * 4 },
  )

  const files = GHRestPullRequestFilesSchema.parse(JSON.parse(stdout))
  const file = files[0]
  if (!file || file.filename !== expectedPath) {
    return {
      sourceKey: cacheKey,
      path: expectedPath,
      status: "modified",
      additions: 0,
      deletions: 0,
      truncated: false,
      unavailableReason: "The selected file changed while the pull request was refreshing.",
    }
  }

  const result = {
    ...normalizePullRequestFileDiff(file),
    sourceKey: cacheKey,
  }

  fileDiffCache.set(cacheKey, {
    expiresAt: Date.now() + DETAIL_CACHE_TTL_MS,
    result,
  })
  return result
}
