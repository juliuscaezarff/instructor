import { useMemo, useRef, useState } from "react"
import { Loader2, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "../../components/ui/button"
import { CanvasDialogBody, CanvasDialogContent, CanvasDialogFooter, CanvasDialogHeader, Dialog, DialogDescription, DialogTitle } from "../../components/ui/dialog"
import { trpc } from "../../lib/trpc"
import { extractActionsRunId } from "../../../shared/pull-request-checks"
import type { PullRequestCheck, PullRequestSummary } from "../../../main/lib/git/github/pull-requests"

export function PullRequestRerunChecksAction({
  item,
  checkItems,
}: {
  item: PullRequestSummary
  checkItems: PullRequestCheck[]
}) {
  const [open, setOpen] = useState(false)
  const busyRef = useRef(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const utils = trpc.useUtils()
  const identity = { owner: item.owner, repository: item.repository, number: item.number }
  const mutation = trpc.pullRequests.rerunFailedChecks.useMutation({
    onSuccess: async (result) => {
      setOpen(false)
      const parts: string[] = []
      if (result.rerunRunCount > 0) {
        parts.push(`Re-ran ${result.rerunRunCount} failed ${result.rerunRunCount === 1 ? "run" : "runs"}.`)
      }
      if (result.unsupportedChecks.length > 0) {
        parts.push(`${result.unsupportedChecks.length} check${result.unsupportedChecks.length === 1 ? "" : "s"} can't be re-run from Instructor.`)
      }
      if (result.failedRuns.length > 0) {
        parts.push(`${result.failedRuns.length} re-run attempt${result.failedRuns.length === 1 ? "" : "s"} failed.`)
        toast.warning(parts.join(" "))
      } else {
        toast.success(parts.join(" ") || "Nothing to re-run.")
      }
      await Promise.all([
        utils.pullRequests.detail.invalidate(identity),
        utils.pullRequests.list.invalidate(),
      ])
    },
  })

  const failingChecks = useMemo(() => checkItems.filter((check) => check.state === "failure"), [checkItems])
  const supportedChecks = useMemo(
    () => failingChecks.filter((check) => extractActionsRunId(check.url)),
    [failingChecks],
  )
  const unsupportedChecks = useMemo(
    () => failingChecks.filter((check) => !extractActionsRunId(check.url)),
    [failingChecks],
  )

  if (item.state !== "open" && item.state !== "draft") return null
  if (failingChecks.length === 0) return null

  const isForbidden = mutation.error?.data?.code === "FORBIDDEN"
  const errorMessage = mutation.error
    ? isForbidden
      ? "You don't have permission to re-run checks on this pull request."
      : mutation.error.message || "Unable to re-run checks. Try again."
    : null

  async function submit() {
    if (busyRef.current || supportedChecks.length === 0) return
    busyRef.current = true
    try {
      await mutation.mutateAsync({
        ...identity,
        failedChecks: supportedChecks.map((check) => ({ name: check.name, url: check.url })),
      })
    } catch {
      // Surfaced via mutation.error below.
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
        aria-label="Re-run failed checks"
        title="Re-run failed checks"
        onClick={() => {
          mutation.reset()
          setOpen(true)
        }}
      >
        <RefreshCw className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
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
            <DialogTitle>Re-run failed checks</DialogTitle>
            <DialogDescription className="truncate">
              {item.repositoryFullName}#{item.number} · {item.title}
            </DialogDescription>
          </CanvasDialogHeader>
          <form
            id="pr-rerun-checks-form"
            onSubmit={(event) => {
              event.preventDefault()
              void submit()
            }}
          >
            <CanvasDialogBody className="space-y-3">
              {supportedChecks.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium">Will be re-run</p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {supportedChecks.map((check) => (
                      <li key={check.name} className="truncate">{check.name}</li>
                    ))}
                  </ul>
                </div>
              )}
              {unsupportedChecks.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Can't be re-run from Instructor</p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {unsupportedChecks.map((check) => (
                      <li key={check.name} className="truncate">{check.name}</li>
                    ))}
                  </ul>
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
                form="pr-rerun-checks-form"
                disabled={mutation.isPending || supportedChecks.length === 0}
                className="rounded-md transition-transform duration-150 active:scale-[0.97]"
              >
                {mutation.isPending && <Loader2 className="mr-2 size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
                Re-run checks
              </Button>
            </CanvasDialogFooter>
          </form>
        </CanvasDialogContent>
      </Dialog>
    </>
  )
}
