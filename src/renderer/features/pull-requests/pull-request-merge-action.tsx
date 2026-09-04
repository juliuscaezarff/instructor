import { useEffect, useRef, useState } from "react"
import { GitMerge, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "../../components/ui/button"
import { CanvasDialogBody, CanvasDialogContent, CanvasDialogFooter, CanvasDialogHeader, Dialog, DialogDescription, DialogTitle } from "../../components/ui/dialog"
import { Label } from "../../components/ui/label"
import { cn } from "../../lib/utils"
import { trpc } from "../../lib/trpc"
import type { PullRequestMergeMethod, PullRequestMergeStateStatus, PullRequestSummary } from "../../../main/lib/git/github/pull-requests"

const METHOD_LABEL: Record<PullRequestMergeMethod, string> = {
  merge: "Create a merge commit",
  squash: "Squash and merge",
  rebase: "Rebase and merge",
}

const BLOCK_REASON: Partial<Record<PullRequestMergeStateStatus, string>> = {
  DIRTY: "This branch has conflicts that must be resolved on GitHub first.",
  BLOCKED: "Required checks or reviews are not satisfied yet.",
}

export function PullRequestMergeAction({
  item,
  mergeStateStatus,
}: {
  item: PullRequestSummary
  mergeStateStatus?: PullRequestMergeStateStatus
}) {
  const [open, setOpen] = useState(false)
  const [method, setMethod] = useState<PullRequestMergeMethod | null>(null)
  const busyRef = useRef(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const utils = trpc.useUtils()
  const identity = { owner: item.owner, repository: item.repository, number: item.number }

  const optionsQuery = trpc.pullRequests.mergeOptions.useQuery(
    { owner: item.owner, repository: item.repository },
    { enabled: open, staleTime: 60_000, refetchOnWindowFocus: false },
  )
  const availableMethods: PullRequestMergeMethod[] = optionsQuery.data
    ? ([
        optionsQuery.data.allowMergeCommit ? "merge" : null,
        optionsQuery.data.allowSquashMerge ? "squash" : null,
        optionsQuery.data.allowRebaseMerge ? "rebase" : null,
      ].filter(Boolean) as PullRequestMergeMethod[])
    : []

  useEffect(() => {
    if (availableMethods.length === 1) setMethod(availableMethods[0]!)
  }, [availableMethods.length, availableMethods[0]])

  const mutation = trpc.pullRequests.merge.useMutation({
    onSuccess: async () => {
      setOpen(false)
      toast.success("Pull request merged.")
      await Promise.all([
        utils.pullRequests.detail.invalidate(identity),
        utils.pullRequests.activity.invalidate(identity),
        utils.pullRequests.list.invalidate(),
      ])
    },
  })

  if (item.state !== "open") return null

  const blockReason = mergeStateStatus ? BLOCK_REASON[mergeStateStatus] : undefined
  const isForbidden = mutation.error?.data?.code === "FORBIDDEN"
  const errorMessage = mutation.error
    ? isForbidden
      ? "You don't have permission to merge this pull request."
      : mutation.error.message || "Unable to merge this pull request. Try again."
    : null
  const canSubmit = Boolean(method) && !blockReason && !optionsQuery.isError

  async function submit() {
    if (busyRef.current || !canSubmit || !method) return
    busyRef.current = true
    try {
      await mutation.mutateAsync({ ...identity, method })
    } catch {
      // Surfaced via mutation.error below; the dialog stays open.
    } finally {
      busyRef.current = false
    }
  }

  return (
    <>
      <Button
        ref={triggerRef}
        variant="ghost"
        size="icon"
        className="size-7 rounded-md text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
        aria-label="Merge pull request"
        title="Merge pull request"
        onClick={() => {
          mutation.reset()
          setMethod(null)
          setOpen(true)
        }}
      >
        <GitMerge className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
      </Button>
      <Dialog open={open} onOpenChange={(next) => { if (!mutation.isPending) setOpen(next) }}>
        <CanvasDialogContent
          className="sm:max-w-[400px]"
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            triggerRef.current?.focus()
          }}
          onEscapeKeyDown={(event) => { if (mutation.isPending) event.preventDefault() }}
          onPointerDownOutside={(event) => { if (mutation.isPending) event.preventDefault() }}
        >
          <CanvasDialogHeader>
            <DialogTitle>Merge pull request</DialogTitle>
            <DialogDescription className="truncate">
              {item.repositoryFullName}#{item.number} · {item.title}
            </DialogDescription>
          </CanvasDialogHeader>
          <form
            id="pr-merge-form"
            onSubmit={(event) => {
              event.preventDefault()
              void submit()
            }}
          >
            <CanvasDialogBody className="space-y-3">
              <p role="alert" className="rounded-md border border-amber-500/30 bg-amber-500/5 px-2.5 py-2 text-xs text-foreground">
                This can't be undone from Instructor.
              </p>
              {blockReason ? (
                <p role="alert" className="text-xs text-destructive">{blockReason}</p>
              ) : optionsQuery.isPending ? (
                <p className="text-xs text-muted-foreground">Checking allowed merge methods…</p>
              ) : optionsQuery.isError ? (
                <p role="alert" className="text-xs text-destructive">Unable to load allowed merge methods.</p>
              ) : availableMethods.length === 0 ? (
                <p role="alert" className="text-xs text-destructive">This repository does not allow any merge method.</p>
              ) : (
                <div className="space-y-1.5">
                  <Label>Merge method</Label>
                  <div className="space-y-1" role="radiogroup" aria-label="Merge method">
                    {availableMethods.map((option) => (
                      <label
                        key={option}
                        className={cn(
                          "flex min-h-9 cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors",
                          method === option ? "border-primary bg-primary/5" : "border-input hover:bg-accent",
                        )}
                      >
                        <input
                          type="radio"
                          name="pr-merge-method"
                          value={option}
                          checked={method === option}
                          disabled={mutation.isPending}
                          onChange={() => setMethod(option)}
                          className="size-3.5 accent-primary"
                        />
                        {METHOD_LABEL[option]}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {errorMessage && <p role="alert" className="text-xs text-destructive">{errorMessage}</p>}
            </CanvasDialogBody>
            <CanvasDialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={mutation.isPending}
                onClick={() => setOpen(false)}
                className="rounded-md transition-transform duration-150 active:scale-[0.97]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="pr-merge-form"
                variant="destructive"
                disabled={!canSubmit || mutation.isPending}
                className="rounded-md transition-transform duration-150 active:scale-[0.97]"
              >
                {mutation.isPending && <Loader2 className="mr-2 size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
                Merge
              </Button>
            </CanvasDialogFooter>
          </form>
        </CanvasDialogContent>
      </Dialog>
    </>
  )
}
