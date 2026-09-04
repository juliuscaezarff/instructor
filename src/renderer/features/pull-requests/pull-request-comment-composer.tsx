import { useEffect, useRef, useState } from "react"
import { ArrowUp } from "lucide-react"
import { Button } from "../../components/ui/button"
import { EnterIcon, IconSpinner } from "../../components/ui/icons"
import { Kbd } from "../../components/ui/kbd"
import { PromptInput, PromptInputActions, PromptInputTextarea } from "../../components/ui/prompt-input"
import { Tooltip, TooltipContent, TooltipTrigger } from "../../components/ui/tooltip"
import { cn } from "../../lib/utils"
import { trpc } from "../../lib/trpc"
import { isCommentBodyEmpty, MAX_COMMENT_BODY_CHARS } from "../../../shared/pull-request-comment"
import type { PullRequestSummary } from "../../../main/lib/git/github/pull-requests"

export function PullRequestCommentComposer({ item }: { item: PullRequestSummary }) {
  const [draft, setDraft] = useState("")
  const busyRef = useRef(false)
  const utils = trpc.useUtils()
  const mutation = trpc.pullRequests.comment.useMutation({
    onSuccess: async () => {
      setDraft("")
      await utils.pullRequests.activity.invalidate({
        owner: item.owner,
        repository: item.repository,
        number: item.number,
      })
    },
  })

  useEffect(() => {
    setDraft("")
    mutation.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.key])

  const overLimit = draft.length > MAX_COMMENT_BODY_CHARS
  const canSubmit = !isCommentBodyEmpty(draft) && !overLimit

  async function submit() {
    if (busyRef.current || !canSubmit) return
    busyRef.current = true
    try {
      await mutation.mutateAsync({
        owner: item.owner,
        repository: item.repository,
        number: item.number,
        body: draft,
      })
    } catch {
      // Surfaced via mutation.error below; the draft is intentionally preserved.
    } finally {
      busyRef.current = false
    }
  }

  const isForbidden = mutation.error?.data?.code === "FORBIDDEN"
  const errorMessage = mutation.error
    ? isForbidden
      ? "You don't have permission to comment on this pull request."
      : mutation.error.message || "Unable to publish the comment. Try again."
    : null

  return (
    <div className="mt-4">
      <label htmlFor="pr-comment-body" className="sr-only">Comment</label>
      <PromptInput
        value={draft}
        onValueChange={setDraft}
        onSubmit={() => void submit()}
        className={cn(
          "rounded-2xl border bg-input-background p-2 pl-3 transition-[border-color,box-shadow] duration-150",
          "focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/30",
        )}
      >
        <PromptInputTextarea
          id="pr-comment-body"
          rows={1}
          disabled={mutation.isPending}
          placeholder="Leave a comment"
          className="text-sm"
        />
        <PromptInputActions className="justify-end px-0.5 pb-0.5">
          <Tooltip delayDuration={1_000}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="sm"
                onClick={() => void submit()}
                disabled={!canSubmit || mutation.isPending}
                aria-label="Post comment"
                className={cn(
                  "h-7 w-7 rounded-full !bg-foreground !text-background !shadow-none",
                  "transition-[background-color,transform,opacity] duration-150 ease-out active:scale-[0.97]",
                  "hover:!bg-foreground/90",
                  canSubmit && !mutation.isPending && (
                    "shadow-[0_0_0_2px_white,0_0_0_4px_rgba(0,0,0,0.06)] dark:shadow-[0_0_0_2px_#1a1a1a,0_0_0_4px_rgba(255,255,255,0.08)]"
                  ),
                )}
              >
                {mutation.isPending
                  ? <IconSpinner className="size-4" />
                  : <ArrowUp className="size-4" aria-hidden="true" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <span className="flex items-center gap-1">
                Comment
                <Kbd className="ms-0.5"><EnterIcon className="size-2.5 inline" /></Kbd>
              </span>
            </TooltipContent>
          </Tooltip>
        </PromptInputActions>
      </PromptInput>
      <span role="status" className="sr-only">
        {mutation.isPending ? "Publishing comment" : mutation.isSuccess ? "Comment published" : ""}
      </span>
      {overLimit && (
        <p role="status" className="mt-2 text-xs text-destructive">
          {(draft.length - MAX_COMMENT_BODY_CHARS).toLocaleString()} characters over the {MAX_COMMENT_BODY_CHARS.toLocaleString()} character limit.
        </p>
      )}
      {errorMessage && <p role="alert" className="mt-2 text-xs text-destructive">{errorMessage}</p>}
    </div>
  )
}
