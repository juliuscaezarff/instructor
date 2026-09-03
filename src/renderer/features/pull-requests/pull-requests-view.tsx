import { keepPreviousData } from "@tanstack/react-query"
import { useVirtualizer } from "@tanstack/react-virtual"
import { useAtom, useSetAtom } from "jotai"
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  CircleOff,
  Clock3,
  GitBranch,
  GitMerge,
  GitPullRequest,
  RefreshCw,
  Search,
  SlidersHorizontal,
  UserRound,
  X,
  XCircle,
} from "lucide-react"
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react"
import { CompactMarkdownRenderer } from "../../components/chat-markdown-renderer"
import { Button } from "../../components/ui/button"
import { GitHubLogo } from "../../components/ui/canvas-icons"
import { ClaudeCodeLogoIcon, CodexIcon } from "../../components/ui/icons"
import { ResizableSidebar } from "../../components/ui/resizable-sidebar"
import {
  agentsSidebarOpenAtom,
  desktopViewAtom,
  selectedAgentChatIdAtom,
  showNewChatFormAtom,
} from "../agents/atoms"
import { AgentsHeaderControls } from "../agents/ui/agents-header-controls"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu"
import { Input } from "../../components/ui/input"
import { Skeleton } from "../../components/ui/skeleton"
import { cn } from "../../lib/utils"
import { trpc } from "../../lib/trpc"
import type {
  PullRequestDetail,
  PullRequestListResult,
  PullRequestSummary,
} from "../../../main/lib/git/github/pull-requests"
import {
  pullRequestDetailWidthAtom,
  pullRequestRepositoryFilterAtom,
  pullRequestStateFilterAtom,
  type PullRequestStateFilter,
} from "./atoms"
import { PullRequestDetailTabs } from "./pull-request-detail-tabs"

type AgentProvider = "claude-code" | "codex"

interface PullRequestWorkspace {
  id: string
  name: string
  branch: string | null
  projectName: string
  provider: AgentProvider
}

const AGENT_PRESENTATION = {
  "claude-code": { label: "Claude Code", icon: ClaudeCodeLogoIcon },
  codex: { label: "OpenAI Codex", icon: CodexIcon },
} satisfies Record<
  AgentProvider,
  { label: string; icon: ComponentType<{ className?: string }> }
>

function AgentIcon({ provider }: { provider: AgentProvider }) {
  const presentation = AGENT_PRESENTATION[provider]
  const Icon = presentation.icon
  return (
    <span
      className="inline-flex size-4 shrink-0 items-center justify-center text-muted-foreground"
      role="img"
      aria-label={presentation.label}
      title={presentation.label}
    >
      <Icon className="size-3.5" />
    </span>
  )
}

function GitHubAvatar({
  login,
  className = "size-4",
}: {
  login: string
  className?: string
}) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  if (hasError) {
    return (
      <GitHubLogo
        className={cn(className, "shrink-0 text-muted-foreground")}
        aria-hidden="true"
      />
    )
  }

  return (
    <span
      className={cn(className, "relative shrink-0 overflow-hidden rounded-full")}
      title={login}
    >
      {!isLoaded && <span className="absolute inset-0 bg-muted" aria-hidden="true" />}
      <img
        src={`https://github.com/${encodeURIComponent(login)}.png?size=64`}
        alt=""
        className={cn(
          "size-full rounded-full object-cover ring-1 ring-inset ring-black/10 transition-opacity duration-150 dark:ring-white/10",
          isLoaded ? "opacity-100" : "opacity-0",
        )}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
      />
    </span>
  )
}

const STATE_FILTERS: Array<{ value: PullRequestStateFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "merged", label: "Merged" },
  { value: "closed", label: "Closed" },
]

const STATE_COPY = {
  draft: { label: "Draft", icon: GitPullRequest, className: "text-muted-foreground" },
  open: { label: "Open", icon: CircleDot, className: "text-emerald-500" },
  merged: { label: "Merged", icon: GitMerge, className: "text-violet-500" },
  closed: { label: "Closed", icon: CircleOff, className: "text-destructive" },
} as const

const REVIEW_COPY = {
  approved: { label: "Approved", icon: CheckCircle2, className: "text-emerald-500" },
  changes_requested: { label: "Changes requested", icon: XCircle, className: "text-destructive" },
  review_required: { label: "Review required", icon: Clock3, className: "text-amber-500" },
  none: { label: "No reviews", icon: Clock3, className: "text-muted-foreground" },
} as const

type PullRequestGroupKey =
  | "approved"
  | "changes_requested"
  | "review_required"
  | "open"
  | "draft"
  | "merged"
  | "closed"

type PullRequestListEntry =
  | {
      type: "group"
      key: PullRequestGroupKey
      label: string
      count: number
      icon: typeof GitPullRequest
      className: string
    }
  | { type: "pull-request"; item: PullRequestSummary }

const GROUP_COPY: Record<
  PullRequestGroupKey,
  { label: string; icon: typeof GitPullRequest; className: string }
> = {
  approved: {
    label: "Approved",
    icon: GitPullRequest,
    className: "text-emerald-600 dark:text-emerald-400",
  },
  changes_requested: {
    label: "Changes requested",
    icon: XCircle,
    className: "text-destructive",
  },
  review_required: {
    label: "Review required",
    icon: Clock3,
    className: "text-amber-600 dark:text-amber-400",
  },
  open: {
    label: "Open",
    icon: CircleDot,
    className: "text-muted-foreground",
  },
  draft: {
    label: "Draft",
    icon: GitPullRequest,
    className: "text-muted-foreground",
  },
  merged: {
    label: "Merged",
    icon: GitMerge,
    className: "text-violet-600 dark:text-violet-400",
  },
  closed: {
    label: "Closed",
    icon: CircleOff,
    className: "text-destructive",
  },
}

const GROUP_ORDER: PullRequestGroupKey[] = [
  "approved",
  "changes_requested",
  "review_required",
  "open",
  "draft",
  "merged",
  "closed",
]

function getGroupKey(item: PullRequestSummary): PullRequestGroupKey {
  if (item.state === "merged" || item.state === "closed" || item.state === "draft") {
    return item.state
  }
  return item.reviewState === "none" ? "open" : item.reviewState
}

function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return "Unknown age"
  const elapsed = Math.max(0, Date.now() - timestamp)
  const minutes = Math.floor(elapsed / 60_000)
  if (minutes < 1) return "now"
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo`
  return `${Math.floor(months / 12)}y`
}

function ChecksSummary({ checks }: { checks: PullRequestSummary["checks"] }) {
  if (checks.total === 0) {
    return <span className="text-muted-foreground">No checks</span>
  }

  if (checks.failure > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-destructive">
        <XCircle className="size-3.5" aria-hidden="true" />
        {checks.success}/{checks.total} checks
      </span>
    )
  }

  if (checks.pending > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-amber-500">
        <Clock3 className="size-3.5" aria-hidden="true" />
        {checks.success}/{checks.total} checks
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 text-emerald-500">
      <CheckCircle2 className="size-3.5" aria-hidden="true" />
      {checks.success}/{checks.total} checks
    </span>
  )
}

const PullRequestRow = memo(function PullRequestRow({
  item,
  workspaces,
  selected,
  onSelect,
}: {
  item: PullRequestSummary
  workspaces: PullRequestWorkspace[]
  selected: boolean
  onSelect: (item: PullRequestSummary, trigger: HTMLButtonElement) => void
}) {
  const state = STATE_COPY[item.state]
  const StateIcon = state.icon
  const hasFailedChecks = item.checks.failure > 0
  const hasPendingChecks = item.checks.pending > 0
  const CheckIcon = hasFailedChecks ? XCircle : hasPendingChecks ? Clock3 : CheckCircle2
  const checkLabel =
    item.checks.total === 0
      ? "No checks"
      : hasFailedChecks
        ? `${item.checks.failure} failed checks`
        : hasPendingChecks
          ? `${item.checks.pending} pending checks`
          : `${item.checks.total} checks passed`

  return (
    <button
      type="button"
      data-pr-key={item.key}
      aria-pressed={selected}
      aria-label={`${state.label} ${item.repositoryFullName} pull request ${item.number}: ${item.title}. ${checkLabel}`}
      onClick={(event) => onSelect(item, event.currentTarget)}
      className={cn(
        "group flex h-16 w-full items-center gap-3 rounded-lg px-3 text-start outline-none",
        "transition-[background-color,transform] duration-150 active:scale-[0.99]",
        "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/70",
        selected
          ? "bg-foreground/[0.07]"
          : "hover:bg-foreground/[0.04]",
      )}
    >
      <StateIcon
        className={cn("size-4 shrink-0", state.className)}
        strokeWidth={1.75}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-baseline gap-1.5 text-[13px] leading-5">
          <span className="truncate font-medium text-foreground" title={item.title}>{item.title}</span>
        </span>
        <span className="flex min-w-0 items-center gap-1.5 text-[11px] leading-4 text-muted-foreground">
          {workspaces.slice(0, 2).map((workspace) => (
            <AgentIcon key={workspace.id} provider={workspace.provider} />
          ))}
          <span className="truncate">{item.repositoryFullName}</span>
          <span className="shrink-0 tabular-nums">#{item.number}</span>
          {item.author && <span className="truncate">{item.author}</span>}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end justify-center gap-1 text-[11px] tabular-nums text-muted-foreground">
        <span>{formatRelativeTime(item.updatedAt)}</span>
        <span className="inline-flex items-center gap-2">
          <span>
          <span className="text-emerald-500">+{item.additions}</span>{" "}
          <span className="text-destructive">−{item.deletions}</span>
          </span>
        {item.checks.total > 0 && (
          <CheckIcon
            className={cn(
              "size-3.5",
              hasFailedChecks
                ? "text-destructive"
                : hasPendingChecks
                  ? "text-amber-500"
                  : "text-emerald-500",
            )}
            aria-hidden="true"
          />
        )}
        </span>
      </span>
    </button>
  )
})

function PullRequestListSkeleton() {
  return (
    <div aria-label="Loading pull requests" className="mx-auto w-full max-w-3xl px-4 pt-3">
      {Array.from({ length: 7 }).map((_, index) => (
        <div key={index} className="flex h-16 items-center gap-3 px-3">
          <Skeleton className="size-4 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-2.5 w-2/5" />
          </div>
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  )
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex h-full min-h-64 flex-col items-center justify-center px-6 text-center">
      <GitPullRequest className="mb-3 size-6 text-muted-foreground" aria-hidden="true" />
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <p className="mt-1 max-w-sm text-sm leading-normal text-muted-foreground text-pretty">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

function PullRequestDetailPane({
  item,
  detail,
  isLoading,
  hasError,
  onRetry,
  onClose,
  compact,
  refreshToken,
  workspaces,
  onOpenWorkspace,
}: {
  item: PullRequestSummary | null
  detail: PullRequestDetail | undefined
  isLoading: boolean
  hasError: boolean
  onRetry: () => void
  onClose: () => void
  compact: boolean
  refreshToken: number
  workspaces: PullRequestWorkspace[]
  onOpenWorkspace: (workspaceId: string) => void
}) {
  const openExternal = trpc.external.openExternal.useMutation()

  if (!item) return null

  const state = STATE_COPY[item.state]
  const review = REVIEW_COPY[item.reviewState]
  const StateIcon = state.icon
  const ReviewIcon = review.icon

  return (
    <article className="flex h-full min-w-0 flex-col bg-background" aria-labelledby="pull-request-title">
      <header
        className={cn(
          "grid shrink-0 items-center gap-x-2 px-6 pb-5 pt-4",
          compact ? "grid-cols-[28px_minmax(0,1fr)]" : "grid-cols-[minmax(0,1fr)_28px]"
        )}
      >
        {compact && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="col-start-1 row-start-1 size-7 text-muted-foreground"
            aria-label="Back to pull requests"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
          </Button>
        )}
        <div
          className={cn(
            "row-start-1 flex min-h-7 min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground",
            compact ? "col-start-2" : "col-start-1"
          )}
        >
          <StateIcon className={cn("size-3.5 shrink-0", state.className)} strokeWidth={1.75} aria-hidden="true" />
          <span className="truncate">{item.repositoryFullName}</span>
          <span aria-hidden="true">·</span>
          <span className="shrink-0 tabular-nums">#{item.number}</span>
        </div>
        {!compact && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="col-start-2 row-start-1 size-7 text-muted-foreground"
            aria-label="Close pull request details"
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        )}

        <div className={cn("row-start-2 min-w-0", compact ? "col-start-2" : "col-start-1")}>
          <div className="mt-1 flex min-w-0 items-start gap-1">
            <h2 id="pull-request-title" className="min-w-0 text-lg font-semibold leading-snug text-foreground text-balance">
              {item.title}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              className="mt-0.5 size-7 shrink-0 text-muted-foreground"
              onClick={() => openExternal.mutate(item.url)}
              disabled={openExternal.isPending}
              aria-label="Open pull request on GitHub"
            >
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
          <div className="mt-2 flex min-h-4 items-center gap-1.5 text-xs text-muted-foreground">
            {item.author && <GitHubAvatar key={item.author} login={item.author} />}
            {item.author && <span>{item.author}</span>}
            {item.author && <span aria-hidden="true">·</span>}
            <span>{formatRelativeTime(item.updatedAt)}</span>
            {workspaces.length > 0 && <span aria-hidden="true">·</span>}
            {workspaces.slice(0, 2).map((workspace) => (
              <AgentIcon key={workspace.id} provider={workspace.provider} />
            ))}
          </div>
        </div>
      </header>

      {detail ? (
        <PullRequestDetailTabs
          item={item}
          refreshToken={refreshToken}
          summary={
            <>
            <dl className="grid grid-cols-[18px_88px_minmax(0,1fr)] items-center gap-x-2 gap-y-3 border-b border-border/50 pb-5 text-xs">
              <GitBranch className="size-3.5 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
              <dt className="text-muted-foreground">Branches</dt>
              <dd className="min-w-0 truncate font-mono text-foreground" title={`${detail.headBranch} → ${detail.baseBranch}`}>
                {detail.headBranch} → {detail.baseBranch}
              </dd>
              <span className="text-center text-muted-foreground" aria-hidden="true">±</span>
              <dt className="text-muted-foreground">Changes</dt>
              <dd className="tabular-nums">
                <span className="text-emerald-500">+{detail.additions}</span>{" "}
                <span className="text-destructive">−{detail.deletions}</span>
              </dd>
              <ReviewIcon className={cn("size-3.5", review.className)} strokeWidth={1.75} aria-hidden="true" />
              <dt className="text-muted-foreground">Review</dt>
              <dd className="text-foreground">{review.label}</dd>
              <CheckCircle2 className="size-3.5 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
              <dt className="text-muted-foreground">Checks</dt>
              <dd><ChecksSummary checks={item.checks} /></dd>
              {detail.mergeable && (
                <>
                  <StateIcon className={cn("size-3.5", state.className)} strokeWidth={1.75} aria-hidden="true" />
                  <dt className="text-muted-foreground">Mergeability</dt>
                  <dd className="capitalize text-foreground">{detail.mergeable.toLowerCase()}</dd>
                </>
              )}
            </dl>

            {workspaces.length > 0 && (
              <section className="border-b border-border/50 py-5" aria-labelledby="workspaces-heading">
                <div className="flex items-center justify-between gap-3">
                  <h3 id="workspaces-heading" className="text-xs font-semibold text-foreground">Instructor workspaces</h3>
                  <span className="text-xs tabular-nums text-muted-foreground">{workspaces.length}</span>
                </div>
                <ul className="mt-2 space-y-1">
                  {workspaces.map((workspace) => (
                    <li key={workspace.id}>
                      <button
                        type="button"
                        onClick={() => onOpenWorkspace(workspace.id)}
                        className="flex min-h-10 w-full items-center gap-2 rounded-lg px-2 py-2 text-start outline-none hover:bg-foreground/[0.04] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/70"
                      >
                        <AgentIcon provider={workspace.provider} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium text-foreground">{workspace.name}</span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {workspace.projectName}{workspace.branch ? ` · ${workspace.branch}` : ""}
                          </span>
                        </span>
                        <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {detail.reviewers.length > 0 && (
              <section className="border-b border-border/50 py-5" aria-labelledby="reviewers-heading">
                <h3 id="reviewers-heading" className="text-xs font-semibold text-foreground">Reviewers</h3>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {detail.reviewers.map((reviewer) => (
                    <li key={`${reviewer.login}-${reviewer.state}`} className="inline-flex min-h-7 items-center gap-1.5 rounded-md bg-muted/70 px-2 text-xs text-foreground">
                      <UserRound className="size-3.5 text-muted-foreground" aria-hidden="true" />
                      <span>{reviewer.login}</span>
                      <span className="text-muted-foreground">{reviewer.state.toLowerCase().replaceAll("_", " ")}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="border-b border-border/50 py-5" aria-labelledby="summary-heading">
              <h3 id="summary-heading" className="text-sm font-semibold text-foreground">Description</h3>
              {detail.body ? (
                <CompactMarkdownRenderer content={detail.body} className="mt-2 max-w-[75ch]" />
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">No description provided.</p>
              )}
            </section>

            <section className="py-5" aria-labelledby="checks-heading">
              <div className="flex items-center justify-between gap-3">
                <h3 id="checks-heading" className="text-xs font-semibold text-foreground">Checks</h3>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {detail.checks.success}/{detail.checks.total} passed
                </span>
              </div>
              {detail.checkItems.length > 0 ? (
                <ul className="mt-2 divide-y divide-border/50 border-y border-border/50">
                  {detail.checkItems.map((check, index) => {
                    const isSuccess = check.state === "success" || check.state === "skipped"
                    const isFailure = check.state === "failure" || check.state === "cancelled"
                    const CheckIcon = isSuccess ? CheckCircle2 : isFailure ? XCircle : Clock3
                    return (
                      <li key={`${check.name}-${index}`} className="flex min-h-9 items-center gap-2 py-2 text-xs">
                        <CheckIcon
                          className={cn(
                            "size-3.5 shrink-0",
                            isSuccess ? "text-emerald-500" : isFailure ? "text-destructive" : "text-amber-500",
                          )}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1 truncate text-foreground" title={check.name}>{check.name}</span>
                        <span className="capitalize text-muted-foreground">{check.state}</span>
                        {check.url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openExternal.mutate(check.url!)}
                            aria-label={`Open ${check.name} check on GitHub`}
                          >
                            <ArrowUpRight className="size-3.5" aria-hidden="true" />
                          </Button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">No checks reported.</p>
              )}
            </section>
            </>
          }
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-8 select-text">
          {isLoading ? (
            <div className="mt-6 space-y-3" aria-label="Loading pull request detail">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-11/12" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ) : hasError ? (
            <div role="alert" className="mt-6">
              <p className="text-sm text-destructive">Unable to load pull request details.</p>
              <Button variant="outline" className="mt-3" onClick={onRetry}>Try again</Button>
            </div>
          ) : null}
        </div>
      )}
    </article>
  )
}

export function PullRequestsView() {
  const [sidebarOpen, setSidebarOpen] = useAtom(agentsSidebarOpenAtom)
  const [stateFilter, setStateFilter] = useAtom(pullRequestStateFilterAtom)
  const [repositoryFilter, setRepositoryFilter] = useAtom(
    pullRequestRepositoryFilterAtom,
  )
  const [search, setSearch] = useState("")
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)
  const [compact, setCompact] = useState(false)
  const [showCompactDetail, setShowCompactDetail] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<PullRequestGroupKey>>(
    () => new Set(),
  )
  const setDesktopView = useSetAtom(desktopViewAtom)
  const setSelectedChatId = useSetAtom(selectedAgentChatIdAtom)
  const setShowNewChatForm = useSetAtom(showNewChatFormAtom)
  const rootRef = useRef<HTMLDivElement>(null)
  const listScrollRef = useRef<HTMLDivElement>(null)
  const lastSelectedRowRef = useRef<HTMLButtonElement | null>(null)

  const listQuery = trpc.pullRequests.list.useQuery(
    { refreshToken },
    {
      staleTime: 30_000,
      placeholderData: keepPreviousData,
      refetchOnWindowFocus: false,
    },
  )
  const data = listQuery.data as PullRequestListResult | undefined
  const projectsQuery = trpc.projects.list.useQuery(undefined, {
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
  const chatsQuery = trpc.chats.list.useQuery({}, {
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  const workspacesByPullRequest = useMemo(() => {
    const projectById = new Map(
      (projectsQuery.data ?? []).map((project) => [project.id, project]),
    )
    const result = new Map<string, PullRequestWorkspace[]>()

    for (const chat of chatsQuery.data ?? []) {
      if (!chat.prNumber) continue
      const project = projectById.get(chat.projectId)
      if (!project?.gitOwner || !project.gitRepo || project.gitProvider !== "github") continue
      const key = `${project.gitOwner}/${project.gitRepo}#${chat.prNumber}`.toLowerCase()
      const workspaces = result.get(key) ?? []
      workspaces.push({
        id: chat.id,
        name: chat.name || chat.branch || `Workspace #${chat.prNumber}`,
        branch: chat.branch,
        projectName: project.name,
        provider: chat.agentProvider,
      })
      result.set(key, workspaces)
    }

    return result
  }, [chatsQuery.data, projectsQuery.data])

  useEffect(() => {
    const element = rootRef.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      setCompact((entry?.contentRect.width ?? element.clientWidth) < 760)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    const selectedRepositories = new Set(repositoryFilter)
    return (data?.items ?? []).filter((item) => {
      const matchesState =
        stateFilter === "all" ||
        (stateFilter === "open"
          ? item.state === "open" || item.state === "draft"
          : item.state === stateFilter)
      const matchesRepository =
        selectedRepositories.size === 0 ||
        selectedRepositories.has(item.repositoryFullName)
      const matchesSearch =
        !normalizedSearch ||
        item.title.toLowerCase().includes(normalizedSearch) ||
        String(item.number).includes(normalizedSearch)
      return matchesState && matchesRepository && matchesSearch
    })
  }, [data?.items, repositoryFilter, search, stateFilter])

  useEffect(() => {
    if (selectedKey && !filteredItems.some((item) => item.key === selectedKey)) {
      setSelectedKey(null)
      setShowCompactDetail(false)
    }
  }, [filteredItems, selectedKey])

  const selectedItem =
    filteredItems.find((item) => item.key === selectedKey) ?? null
  const selectedWorkspaces = selectedItem
    ? workspacesByPullRequest.get(selectedItem.key.toLowerCase()) ?? []
    : []

  const detailQuery = trpc.pullRequests.detail.useQuery(
    {
      owner: selectedItem?.owner ?? "",
      repository: selectedItem?.repository ?? "",
      number: selectedItem?.number ?? 0,
      refreshToken,
    },
    {
      enabled: Boolean(selectedItem),
      staleTime: 30_000,
      placeholderData: keepPreviousData,
      refetchOnWindowFocus: false,
    },
  )
  const queriedDetail = detailQuery.data as PullRequestDetail | undefined
  const visibleDetail =
    queriedDetail?.key === selectedItem?.key ? queriedDetail : undefined

  const listEntries = useMemo<PullRequestListEntry[]>(() => {
    const groups = new Map<PullRequestGroupKey, PullRequestSummary[]>()
    for (const item of filteredItems) {
      const key = getGroupKey(item)
      const group = groups.get(key)
      if (group) group.push(item)
      else groups.set(key, [item])
    }

    return GROUP_ORDER.flatMap((key) => {
      const items = groups.get(key)
      if (!items?.length) return []
      const group = GROUP_COPY[key]
      return [
        { type: "group", key, count: items.length, ...group } as PullRequestListEntry,
        ...(collapsedGroups.has(key)
          ? []
          : items.map((item) => ({ type: "pull-request", item }) as PullRequestListEntry)),
      ]
    })
  }, [collapsedGroups, filteredItems])

  const rowVirtualizer = useVirtualizer({
    count: listEntries.length,
    getScrollElement: () => listScrollRef.current,
    estimateSize: (index) => listEntries[index]?.type === "group" ? 36 : 64,
    getItemKey: (index) => {
      const entry = listEntries[index]
      return entry?.type === "group" ? `group:${entry.key}` : entry?.item.key ?? index
    },
    overscan: 8,
  })

  const selectItem = useCallback((item: PullRequestSummary, trigger: HTMLButtonElement) => {
    lastSelectedRowRef.current = trigger
    setSelectedKey(item.key)
    setShowCompactDetail(true)
  }, [])

  useEffect(() => {
    if (!selectedKey) lastSelectedRowRef.current?.focus()
  }, [selectedKey])

  const closeDetail = useCallback(() => {
    setSelectedKey(null)
    setShowCompactDetail(false)
  }, [])

  const openWorkspace = useCallback((workspaceId: string) => {
    setSelectedChatId(workspaceId)
    setShowNewChatForm(false)
    setDesktopView(null)
  }, [setDesktopView, setSelectedChatId, setShowNewChatForm])

  const toggleGroup = useCallback((key: PullRequestGroupKey) => {
    setCollapsedGroups((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const clearFilters = useCallback(() => {
    setStateFilter("all")
    setRepositoryFilter([])
    setSearch("")
  }, [setRepositoryFilter, setStateFilter])

  const primaryIssue = data?.failures[0]?.issue
  const unavailableTitle =
    primaryIssue === "gh_not_found"
      ? "GitHub CLI is not available"
      : primaryIssue === "gh_not_authenticated"
        ? "Connect the GitHub CLI"
        : "Unable to load pull requests"
  const unavailableDescription =
    primaryIssue === "gh_not_found"
      ? "Install GitHub CLI, then try again."
      : primaryIssue === "gh_not_authenticated"
        ? "Run gh auth login in a terminal, then try again."
        : "Check your connection and GitHub access, then try again."

  return (
    <main ref={rootRef} className="flex h-full min-w-0 bg-background" aria-labelledby="pull-requests-heading">
      <h1 id="pull-requests-heading" className="sr-only">Pull requests</h1>

      <section
        aria-label="Pull request list"
        className={cn(
          "flex min-w-0 flex-1 flex-col",
          compact && showCompactDetail && "hidden",
        )}
      >
        <header className="shrink-0">
          <div className="flex min-h-10 items-center gap-1 px-2">
            <AgentsHeaderControls
              isSidebarOpen={sidebarOpen}
              onToggleSidebar={() => setSidebarOpen((previous) => !previous)}
            />
            <div className="flex items-center gap-1" aria-label="Pull request state filters">
              {STATE_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  aria-pressed={stateFilter === filter.value}
                  onClick={() => setStateFilter(filter.value)}
                  className={cn(
                    "min-h-7 rounded-lg px-2.5 text-xs outline-none transition-colors duration-150",
                    "focus-visible:ring-2 focus-visible:ring-primary/70",
                    stateFilter === filter.value
                      ? "bg-foreground/[0.07] font-medium text-foreground"
                      : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground",
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-3xl items-center gap-2 px-4 py-3">
            <div className="relative min-w-0 flex-1">
              <label htmlFor="pull-request-search" className="sr-only">Search pull requests</label>
              <Search className="pointer-events-none absolute start-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                id="pull-request-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search pull requests"
                className="h-8 rounded-lg border-border/70 bg-foreground/[0.035] ps-8 text-xs shadow-none"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="relative size-8 rounded-lg border-border/70 bg-foreground/[0.035] text-muted-foreground shadow-none"
                  aria-label={repositoryFilter.length === 0 ? "Filter by repository" : `Filter by repository, ${repositoryFilter.length} active`}
                >
                  <SlidersHorizontal className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
                  {repositoryFilter.length > 0 && <span className="absolute end-1 top-1 size-1.5 rounded-full bg-primary" aria-hidden="true" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-56">
                <DropdownMenuLabel>Repositories</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(data?.repositories ?? []).map((repository) => (
                  <DropdownMenuCheckboxItem
                    key={repository}
                    checked={repositoryFilter.includes(repository)}
                    onCheckedChange={(checked) =>
                      setRepositoryFilter((current) =>
                        checked
                          ? [...new Set([...current, repository])]
                          : current.filter((value) => value !== repository),
                      )
                    }
                    onSelect={(event) => event.preventDefault()}
                  >
                    {repository}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg text-muted-foreground"
              onClick={() => setRefreshToken(Date.now())}
              disabled={listQuery.isFetching}
              aria-label="Refresh pull requests"
            >
              <RefreshCw className={cn("size-3.5", listQuery.isFetching && "animate-spin")} strokeWidth={1.75} aria-hidden="true" />
            </Button>
          </div>

          {(search || repositoryFilter.length > 0) && (
            <div className="mx-auto flex w-full max-w-3xl items-center px-4 pb-2">
              <span className="text-[11px] tabular-nums text-muted-foreground">{filteredItems.length} shown</span>
              <button
                type="button"
                onClick={clearFilters}
                className="ms-auto inline-flex min-h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground outline-none hover:bg-foreground/[0.04] hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/70"
              >
                <X className="size-3.5" aria-hidden="true" />
                Clear filters
              </button>
            </div>
          )}
        </header>

        {data?.status === "partial" && (
          <div role="status" className="border-y border-amber-500/20 bg-amber-500/5 px-4 py-2 text-xs text-foreground">
            Showing available results. {data.failures.length} {data.failures.length === 1 ? "repository" : "repositories"} could not be refreshed.
          </div>
        )}

        <div className="min-h-0 flex-1">
          {listQuery.isPending && !data ? (
            <PullRequestListSkeleton />
          ) : data?.status === "no_repositories" ? (
            <EmptyState
              title="No GitHub projects"
              description="Add a local project with a GitHub remote to collect its pull requests here."
              action={<Button variant="outline" onClick={() => { setShowNewChatForm(true); setDesktopView(null) }}>Add project</Button>}
            />
          ) : data?.status === "unavailable" || listQuery.isError ? (
            <EmptyState
              title={unavailableTitle}
              description={unavailableDescription}
              action={<Button variant="outline" onClick={() => setRefreshToken(Date.now())}>Try again</Button>}
            />
          ) : filteredItems.length === 0 ? (
            <EmptyState
              title="No matching pull requests"
              description="Adjust the search or filters to see more pull requests."
              action={<Button variant="outline" onClick={clearFilters}>Clear filters</Button>}
            />
          ) : (
            <div ref={listScrollRef} className="h-full overflow-y-auto">
              <div
                className="relative mx-auto w-full max-w-3xl"
                style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const entry = listEntries[virtualRow.index]!
                  return (
                    <div
                      key={entry.type === "group" ? `group:${entry.key}` : entry.item.key}
                      className="absolute start-0 top-0 w-full"
                      style={{ transform: `translateY(${virtualRow.start}px)` }}
                    >
                      {entry.type === "group" ? (
                        <div className="flex h-9 items-end px-5 pb-1">
                          <button
                            type="button"
                            aria-expanded={!collapsedGroups.has(entry.key)}
                            onClick={() => toggleGroup(entry.key)}
                            className={cn(
                              "flex min-h-7 items-center gap-1.5 rounded-md px-1 text-[11px] font-medium outline-none",
                              "focus-visible:ring-2 focus-visible:ring-primary/70",
                              entry.className,
                            )}
                          >
                            <span>{entry.label}</span>
                            <span className="tabular-nums text-muted-foreground">{entry.count}</span>
                            <ChevronDown
                              className={cn("size-3 transition-transform duration-150", collapsedGroups.has(entry.key) && "-rotate-90")}
                              aria-hidden="true"
                            />
                          </button>
                        </div>
                      ) : (
                        <div className="px-4">
                          <PullRequestRow
                            item={entry.item}
                            workspaces={workspacesByPullRequest.get(entry.item.key.toLowerCase()) ?? []}
                            selected={entry.item.key === selectedKey}
                            onSelect={selectItem}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {selectedItem && compact && (
        <section aria-label="Pull request detail" className="min-w-0 w-full">
          <PullRequestDetailPane
            item={selectedItem}
            detail={visibleDetail}
            isLoading={detailQuery.isFetching}
            hasError={detailQuery.isError}
            onRetry={() => detailQuery.refetch()}
            compact
            refreshToken={refreshToken}
            onClose={closeDetail}
            workspaces={selectedWorkspaces}
            onOpenWorkspace={openWorkspace}
          />
        </section>
      )}

      {!compact && (
        <ResizableSidebar
          isOpen={Boolean(selectedItem)}
          onClose={closeDetail}
          widthAtom={pullRequestDetailWidthAtom}
          minWidth={400}
          maxWidth={760}
          side="right"
          closeOnResizePastMin
          fadeOnOpenClose={false}
          animationDuration={0.15}
          showResizeTooltip
          className="border-s border-border/50 bg-background"
        >
          <PullRequestDetailPane
            item={selectedItem}
            detail={visibleDetail}
            isLoading={detailQuery.isFetching}
            hasError={detailQuery.isError}
            onRetry={() => detailQuery.refetch()}
            compact={false}
            refreshToken={refreshToken}
            onClose={closeDetail}
            workspaces={selectedWorkspaces}
            onOpenWorkspace={openWorkspace}
          />
        </ResizableSidebar>
      )}

      <div className="sr-only" role="status" aria-live="polite">
        {listQuery.isFetching ? "Refreshing pull requests" : data ? `${filteredItems.length} pull requests shown` : ""}
      </div>
    </main>
  )
}
