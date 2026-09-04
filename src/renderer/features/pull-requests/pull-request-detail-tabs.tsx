import { keepPreviousData } from "@tanstack/react-query"
import { PatchDiff } from "@pierre/diffs/react"
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Circle,
  FileCode2,
  Files,
  GitCommitHorizontal,
  GitMerge,
  GitPullRequest,
  GitPullRequestClosed,
  XCircle,
} from "lucide-react"
import {
  Component,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { useTheme } from "next-themes"
import { CompactMarkdownRenderer } from "../../components/chat-markdown-renderer"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../components/ui/accordion"
import { Button } from "../../components/ui/button"
import { GitHubLogo } from "../../components/ui/canvas-icons"
import { Skeleton } from "../../components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { cn } from "../../lib/utils"
import { trpc } from "../../lib/trpc"
import { useCodeTheme } from "../../lib/hooks/use-code-theme"
import { getShikiTheme } from "../../lib/themes/diff-view-highlighter"
import { PIERRE_DIFFS_THEME_CSS } from "../../lib/themes/pierre-diffs"
import { formatRelativeTime } from "./format-relative-time"
import { PullRequestCommentComposer } from "./pull-request-comment-composer"
import type {
  PullRequestActivityItem,
  PullRequestActivityResult,
  PullRequestFile,
  PullRequestFileDiff,
  PullRequestFilesResult,
  PullRequestSummary,
} from "../../../main/lib/git/github/pull-requests"

type DetailTab = "summary" | "files"

const FILE_STATUS_COPY: Record<PullRequestFile["status"], { label: string; short: string }> = {
  added: { label: "Added", short: "A" },
  deleted: { label: "Deleted", short: "D" },
  modified: { label: "Modified", short: "M" },
  renamed: { label: "Renamed", short: "R" },
  copied: { label: "Copied", short: "C" },
  changed: { label: "Changed", short: "M" },
}

function GitHubAvatar({ login, className }: { login?: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  if (!login || failed) {
    return (
      <span className={cn("inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground", className)}>
        <GitHubLogo className="size-3" aria-hidden="true" />
      </span>
    )
  }

  return (
    <img
      src={`https://github.com/${encodeURIComponent(login)}.png?size=64`}
      alt=""
      className={cn("size-5 shrink-0 rounded-full object-cover ring-1 ring-black/10 dark:ring-white/10", className)}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}

function LoadingRows({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3 px-6 py-5" role="status" aria-live="polite">
      <span className="sr-only">Loading content</span>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="size-4 rounded-full" />
          <Skeleton className={cn("h-3", index % 2 ? "w-2/3" : "w-4/5")} />
        </div>
      ))}
    </div>
  )
}

function SectionError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="px-6 py-6">
      <div className="flex items-start gap-2 text-sm text-destructive">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>{message}</p>
      </div>
      <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>Try again</Button>
    </div>
  )
}

interface PierreDiffErrorBoundaryProps {
  patch: string
  children: ReactNode
}

class PierreDiffErrorBoundary extends Component<
  PierreDiffErrorBoundaryProps,
  { failed: boolean; patch: string }
> {
  state = { failed: false, patch: this.props.patch }

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }

  static getDerivedStateFromProps(
    props: PierreDiffErrorBoundaryProps,
    state: { failed: boolean; patch: string },
  ): { failed: boolean; patch: string } | null {
    return props.patch === state.patch ? null : { failed: false, patch: props.patch }
  }

  render() {
    if (this.state.failed) {
      return (
        <div role="alert" className="px-6 py-8 text-center text-sm text-muted-foreground">
          This patch could not be rendered.
        </div>
      )
    }
    return this.props.children
  }
}

function createPierrePatch(diff: PullRequestFileDiff): string {
  const previousPath = diff.previousPath ?? diff.path
  const oldPath = diff.status === "added" ? "/dev/null" : `a/${previousPath}`
  const newPath = diff.status === "deleted" ? "/dev/null" : `b/${diff.path}`
  return `--- ${oldPath}\n+++ ${newPath}\n${diff.patch}`
}

function DiffViewer({ diff }: { diff: PullRequestFileDiff }) {
  const { resolvedTheme } = useTheme()
  const codeThemeId = useCodeTheme()
  const isLight = resolvedTheme !== "dark"
  const shikiTheme = getShikiTheme(codeThemeId, !isLight)
  const patch = useMemo(() => diff.patch ? createPierrePatch(diff) : "", [diff])

  if (!diff.patch) {
    return (
      <div className="flex min-h-48 items-center justify-center px-6 py-10 text-center">
        <div>
          <FileCode2 className="mx-auto size-5 text-muted-foreground" aria-hidden="true" />
          <p className="mt-2 text-sm text-foreground">
            {diff.truncated ? "Patch too large" : "Patch unavailable"}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground text-pretty">
            {diff.unavailableReason}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-w-0 overflow-hidden border-t border-border/50" aria-label={`Diff for ${diff.path}`}>
      <PierreDiffErrorBoundary patch={patch}>
        <PatchDiff
          patch={patch}
          options={{
            diffStyle: "unified",
            diffIndicators: "bars",
            themeType: isLight ? "light" : "dark",
            overflow: "scroll",
            disableFileHeader: true,
            theme: shikiTheme,
            unsafeCSS: PIERRE_DIFFS_THEME_CSS,
          }}
        />
      </PierreDiffErrorBoundary>
    </div>
  )
}

function FilesPanel({
  item,
  active,
  refreshToken,
}: {
  item: PullRequestSummary
  active: boolean
  refreshToken: number
}) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const filesQuery = trpc.pullRequests.files.useQuery(
    { owner: item.owner, repository: item.repository, number: item.number, refreshToken },
    {
      enabled: active,
      staleTime: 30_000,
      placeholderData: keepPreviousData,
      refetchOnWindowFocus: false,
    },
  )
  const queriedData = filesQuery.data as PullRequestFilesResult | undefined
  const sourceKey = `${item.repositoryFullName}#${item.number}`.toLowerCase()
  const data = queriedData?.sourceKey === sourceKey ? queriedData : undefined

  useEffect(() => {
    setSelectedPath(null)
  }, [item.key])

  const selectedFile = data?.items.find((file) => file.path === selectedPath)
  const diffQuery = trpc.pullRequests.fileDiff.useQuery(
    {
      owner: item.owner,
      repository: item.repository,
      number: item.number,
      fileIndex: selectedFile?.index ?? 0,
      path: selectedFile?.path ?? "",
      refreshToken,
    },
    {
      enabled: active && Boolean(selectedFile),
      staleTime: 30_000,
      placeholderData: keepPreviousData,
      refetchOnWindowFocus: false,
    },
  )
  const queriedDiff = diffQuery.data as PullRequestFileDiff | undefined
  const diffSourceKey = selectedFile
    ? `${sourceKey}:${selectedFile.index}:${selectedFile.path}`
    : ""
  const diff = queriedDiff?.sourceKey === diffSourceKey ? queriedDiff : undefined

  if (filesQuery.isPending && !data) return <LoadingRows />
  if (filesQuery.isError) {
    return <SectionError message="Unable to load changed files." onRetry={() => filesQuery.refetch()} />
  }
  if (!data?.items.length) {
    return <p className="px-6 py-8 text-sm text-muted-foreground">No changed files reported.</p>
  }

  return (
    <div className="min-h-0">
      <div className="flex items-center justify-between gap-3 px-6 py-3 text-xs text-muted-foreground">
        <span>{data.total} {data.total === 1 ? "file" : "files"} changed</span>
        <span className="tabular-nums">
          <span className="text-emerald-500">+{item.additions}</span>{" "}
          <span className="text-destructive">−{item.deletions}</span>
        </span>
      </div>
      {data.truncated && (
        <p role="status" className="border-y border-amber-500/20 bg-amber-500/5 px-6 py-2 text-xs text-foreground">
          Showing the first {data.items.length} changed files.
        </p>
      )}
      <Accordion
        type="single"
        collapsible
        value={selectedPath ?? ""}
        onValueChange={(path) => setSelectedPath(path || null)}
        className="border-y border-border/50"
      >
        {data.items.map((file) => {
          const status = FILE_STATUS_COPY[file.status]
          const isSelected = file.path === selectedPath
          return (
            <AccordionItem
              key={file.path}
              value={file.path}
              className="border-border/50 last:border-b-0"
            >
              <div
                className={cn(
                  "sticky top-0 z-20 bg-background",
                  isSelected && "border-b border-border/70 shadow-sm",
                )}
              >
                <AccordionTrigger
                  className={cn(
                    "min-h-10 gap-3 px-6 py-2 text-start text-xs font-normal hover:bg-foreground/[0.035] hover:no-underline",
                    "focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/70",
                    isSelected && "bg-foreground/[0.045]",
                  )}
                >
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <span
                      className={cn(
                        "w-3 shrink-0 text-center font-mono font-semibold",
                        file.status === "added" && "text-emerald-500",
                        file.status === "deleted" && "text-destructive",
                        file.status === "renamed" && "text-blue-500",
                        file.status !== "added" && file.status !== "deleted" && file.status !== "renamed" && "text-amber-500",
                      )}
                      title={status.label}
                    >
                      <span aria-hidden="true">{status.short}</span>
                      <span className="sr-only">{status.label}</span>
                    </span>
                    <span className="min-w-0 truncate font-mono" title={file.path}>{file.path}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    <span className="text-emerald-500">+{file.additions}</span>{" "}
                    <span className="text-destructive">−{file.deletions}</span>
                  </span>
                </AccordionTrigger>
              </div>
              <AccordionContent className="pb-0">
                {isSelected && diffQuery.isFetching && !diff ? (
                  <LoadingRows count={4} />
                ) : isSelected && diffQuery.isError ? (
                  <SectionError message="Unable to load this file diff." onRetry={() => diffQuery.refetch()} />
                ) : isSelected && diff ? (
                  <DiffViewer diff={diff} />
                ) : null}
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </div>
  )
}

function activityLabel(item: PullRequestActivityItem): string {
  if (item.kind === "commit") return "committed"
  if (item.kind === "comment") return "commented"
  if (item.kind === "state") {
    if (item.state === "closed") return "closed this pull request"
    if (item.state === "reopened") return "reopened this pull request"
    return "merged this pull request"
  }
  return item.state.replaceAll("_", " ").toLowerCase()
}

function ActivityIcon({ item }: { item: PullRequestActivityItem }) {
  if (item.kind === "comment") return <GitHubAvatar login={item.author} />

  if (item.kind === "commit") {
    return (
      <span className="relative flex size-5 shrink-0 items-center justify-center rounded-full bg-background text-muted-foreground">
        <GitCommitHorizontal className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
      </span>
    )
  }

  if (item.kind === "state") {
    const StateIcon = item.state === "merged" ? GitMerge : item.state === "closed" ? GitPullRequestClosed : GitPullRequest
    const colorClass = item.state === "merged" ? "text-violet-500" : item.state === "closed" ? "text-destructive" : "text-emerald-500"
    return (
      <span className="relative flex size-5 shrink-0 items-center justify-center rounded-full bg-background">
        <span className={cn("flex size-5 items-center justify-center", colorClass)}>
          <StateIcon className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <GitHubAvatar
          login={item.author}
          className="absolute -bottom-1 -right-1 size-3 ring-2 ring-background"
        />
      </span>
    )
  }

  const isApproved = item.state === "approved"
  const isChangesRequested = item.state === "changes_requested"
  const ReviewIcon = isApproved ? CheckCircle2 : isChangesRequested ? XCircle : Circle
  return (
    <span
      className={cn(
        "relative flex size-5 shrink-0 items-center justify-center rounded-full bg-background",
        isApproved ? "text-emerald-500" : isChangesRequested ? "text-destructive" : "text-muted-foreground",
      )}
    >
      <ReviewIcon className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
    </span>
  )
}

export function PullRequestActivitySection({
  item,
  refreshToken,
}: {
  item: PullRequestSummary
  refreshToken: number
}) {
  const openExternal = trpc.external.openExternal.useMutation()
  const activityQuery = trpc.pullRequests.activity.useQuery(
    { owner: item.owner, repository: item.repository, number: item.number, refreshToken },
    {
      staleTime: 30_000,
      placeholderData: keepPreviousData,
      refetchOnWindowFocus: false,
    },
  )
  const queriedData = activityQuery.data as PullRequestActivityResult | undefined
  const sourceKey = `${item.repositoryFullName}#${item.number}`.toLowerCase()
  const data = queriedData?.sourceKey === sourceKey ? queriedData : undefined

  return (
    <section className="border-t border-border/50 pt-5" aria-labelledby="activity-heading">
      <h3 id="activity-heading" className="text-xs font-semibold text-foreground">Activity</h3>

      {activityQuery.isPending && !data ? (
        <div className="mt-3"><LoadingRows count={3} /></div>
      ) : activityQuery.isError ? (
        <div className="mt-2"><SectionError message="Unable to load pull request activity." onRetry={() => activityQuery.refetch()} /></div>
      ) : !data?.items.length ? (
        <p className="mt-2 text-xs text-muted-foreground">No commits, comments, or reviews yet.</p>
      ) : (
        <>
          {data.truncated && (
            <p role="status" className="mt-1 text-[11px] text-muted-foreground">
              {data.items.length < data.total ? `Showing the latest ${data.items.length}.` : "Some content was truncated."}
            </p>
          )}
          <ol className="mt-3">
            {data.items.map((activityItem, index) => (
              <li key={activityItem.id} className="relative flex gap-2.5">
                <div className="relative flex w-5 flex-none flex-col items-center">
                  {index < data.items.length - 1 && (
                    <span className="absolute left-1/2 top-5 bottom-[-12px] w-px -translate-x-1/2 bg-border" aria-hidden="true" />
                  )}
                  <ActivityIcon item={activityItem} />
                </div>
                <div className="min-w-0 flex-1 pb-3">
                  <div className="flex min-w-0 flex-wrap items-baseline gap-x-1 text-xs leading-5">
                    <span className="font-medium text-foreground">{activityItem.author || "Unknown author"}</span>
                    <span className="text-muted-foreground">{activityLabel(activityItem)}</span>
                    {activityItem.kind === "commit" && (
                      <code className="rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
                        {activityItem.sha.slice(0, 7)}
                      </code>
                    )}
                    <span className="text-muted-foreground" aria-hidden="true">·</span>
                    <time className="text-muted-foreground" dateTime={activityItem.createdAt ? new Date(activityItem.createdAt).toISOString() : undefined}>
                      {formatRelativeTime(activityItem.createdAt)}
                    </time>
                    {(activityItem.kind === "comment" || activityItem.kind === "review") && activityItem.url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="ms-auto -my-1 size-5 text-muted-foreground"
                        onClick={() => openExternal.mutate(activityItem.url!)}
                        aria-label="Open activity item on GitHub"
                      >
                        <ArrowUpRight className="size-3" aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                  {activityItem.kind === "commit" ? (
                    <div className="mt-1">
                      <p className="text-xs leading-snug text-foreground text-pretty">{activityItem.title}</p>
                      {activityItem.body && <p className="mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-muted-foreground">{activityItem.body}</p>}
                    </div>
                  ) : (activityItem.kind === "comment" || activityItem.kind === "review") && activityItem.body ? (
                    <CompactMarkdownRenderer content={activityItem.body} className="mt-1 max-w-[70ch]" />
                  ) : null}
                  {activityItem.bodyTruncated && (
                    <p className="mt-1 text-[11px] text-muted-foreground">Content truncated for performance.</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </>
      )}

      <PullRequestCommentComposer item={item} />
    </section>
  )
}

export function PullRequestDetailTabs({
  item,
  summary,
  refreshToken,
}: {
  item: PullRequestSummary
  summary: ReactNode
  refreshToken: number
}) {
  const [activeTab, setActiveTab] = useState<DetailTab>("summary")

  useEffect(() => {
    setActiveTab("summary")
  }, [item.key])

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as DetailTab)}
      className="flex min-h-0 flex-1 flex-col"
    >
      <TabsList
        aria-label="Pull request detail sections"
        className="h-9 shrink-0 justify-start rounded-none border-y border-border/50 bg-transparent px-6 py-0"
      >
        <TabsTrigger
          value="summary"
          className="h-9 rounded-none border-b-2 border-transparent px-2 text-xs shadow-none data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
        >
          Summary
        </TabsTrigger>
        <TabsTrigger
          value="files"
          className="h-9 gap-1.5 rounded-none border-b-2 border-transparent px-2 text-xs shadow-none data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
        >
          <Files className="size-3.5" aria-hidden="true" />
          Files
        </TabsTrigger>
      </TabsList>

      <TabsContent forceMount value="summary" className="mt-0 min-h-0 flex-1 overflow-y-auto px-6 pb-8 pt-3 focus-visible:ring-inset data-[state=inactive]:hidden">
        {summary}
        <PullRequestActivitySection item={item} refreshToken={refreshToken} />
      </TabsContent>
      <TabsContent forceMount value="files" className="mt-0 min-h-0 flex-1 overflow-y-auto focus-visible:ring-inset data-[state=inactive]:hidden">
        <FilesPanel item={item} active={activeTab === "files"} refreshToken={refreshToken} />
      </TabsContent>
    </Tabs>
  )
}
