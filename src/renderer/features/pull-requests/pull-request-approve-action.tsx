import { useRef, useState } from "react"
import { CheckCircle2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "../../components/ui/button"
import { CanvasDialogBody, CanvasDialogContent, CanvasDialogFooter, CanvasDialogHeader, Dialog, DialogDescription, DialogTitle } from "../../components/ui/dialog"
import { Label } from "../../components/ui/label"
import { Textarea } from "../../components/ui/textarea"
import { cn } from "../../lib/utils"
import { trpc } from "../../lib/trpc"
import { MAX_REVIEW_BODY_CHARS } from "../../../shared/pull-request-review"
import type { PullRequestSummary } from "../../../main/lib/git/github/pull-requests"

export function PullRequestApproveAction({ item }: { item: PullRequestSummary }) {
  const [open, setOpen] = useState(false)
  const [body, setBody] = useState("")
  const busyRef = useRef(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const utils = trpc.useUtils()
  const identity = { owner: item.owner, repository: item.repository, number: item.number }
  const mutation = trpc.pullRequests.approve.useMutation({
    onSuccess: async () => {
      setOpen(false)
      setBody("")
      toast.success("Pull request approved.")
      await Promise.all([
        utils.pullRequests.detail.invalidate(identity),
        utils.pullRequests.activity.invalidate(identity),
        utils.pullRequests.list.invalidate(),
      ])
    },
  })

  if (item.state !== "open" && item.state !== "draft") return null

  const overLimit = body.length > MAX_REVIEW_BODY_CHARS
  const isForbidden = mutation.error?.data?.code === "FORBIDDEN"
  const errorMessage = mutation.error
    ? isForbidden
      ? "You don't have permission to approve this pull request."
      : mutation.error.message || "Unable to approve this pull request. Try again."
    : null

  async function submit() {
    if (busyRef.current || overLimit) return
    busyRef.current = true
    try {
      await mutation.mutateAsync({ ...identity, body: body.trim() ? body : undefined })
    } catch {
      // Surfaced via mutation.error below; the dialog stays open with the comment preserved.
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
        aria-label="Approve pull request"
        title="Approve pull request"
        onClick={() => {
          mutation.reset()
          setOpen(true)
        }}
      >
        <CheckCircle2 className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
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
            <DialogTitle>Approve pull request</DialogTitle>
            <DialogDescription className="truncate">
              {item.repositoryFullName}#{item.number} · {item.title}
            </DialogDescription>
          </CanvasDialogHeader>
          <form
            id="pr-approve-form"
            onSubmit={(event) => {
              event.preventDefault()
              void submit()
            }}
          >
            <CanvasDialogBody className="space-y-2">
              <Label htmlFor="pr-approve-body">Comment (optional)</Label>
              <Textarea
                id="pr-approve-body"
                autoFocus
                value={body}
                disabled={mutation.isPending}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Add an optional comment"
                className="min-h-20 text-sm"
              />
              <div className="flex items-center justify-between gap-3">
                <span className={cn("text-[11px] tabular-nums", overLimit ? "text-destructive" : "text-muted-foreground")}>
                  {overLimit
                    ? `${(body.length - MAX_REVIEW_BODY_CHARS).toLocaleString()} characters over the limit`
                    : `${body.length.toLocaleString()} / ${MAX_REVIEW_BODY_CHARS.toLocaleString()}`}
                </span>
              </div>
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
                form="pr-approve-form"
                disabled={mutation.isPending || overLimit}
                className="rounded-md transition-transform duration-150 active:scale-[0.97]"
              >
                {mutation.isPending && <Loader2 className="mr-2 size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
                Approve
              </Button>
            </CanvasDialogFooter>
          </form>
        </CanvasDialogContent>
      </Dialog>
    </>
  )
}
