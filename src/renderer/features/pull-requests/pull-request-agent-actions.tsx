import { useRef, useState } from "react"
import { useSetAtom } from "jotai"
import { Loader2, MessageSquare } from "lucide-react"
import { toast } from "sonner"
import { Button } from "../../components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog"
import { trpc } from "../../lib/trpc"
import { chatSourceModeAtom } from "../../lib/atoms"
import { desktopViewAtom, selectedAgentChatIdAtom, selectedChatIsRemoteAtom, showNewChatFormAtom } from "../agents/atoms"
import { saveSubChatDraftWithAttachments } from "../agents/lib/drafts"
import { useAgentSubChatStore } from "../agents/stores/sub-chat-store"
import { defaultPullRequestChatTarget } from "./pull-request-chat-target"
import type { PullRequestIdentity } from "../../../shared/pull-request-agent-context"

export function PullRequestAgentActions({ pr }: { pr: PullRequestIdentity }) {
  const [chooserOpen, setChooserOpen] = useState(false)
  const [target, setTarget] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const busyRef = useRef(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const setSelectedChat = useSetAtom(selectedAgentChatIdAtom)
  const setRemote = useSetAtom(selectedChatIsRemoteAtom)
  const setSource = useSetAtom(chatSourceModeAtom)
  const setNewChat = useSetAtom(showNewChatFormAtom)
  const setView = useSetAtom(desktopViewAtom)
  const utils = trpc.useUtils()
  const identity = { owner: pr.owner, repository: pr.repository, number: pr.number }
  const targets = trpc.pullRequests.workspaceTargets.useQuery(identity, {
    enabled: false,
    refetchOnWindowFocus: false,
  })
  const mutation = trpc.pullRequests.prepareWorkspace.useMutation({
    onSuccess: async result => {
      if (result.subChat) {
        if (result.draft) {
          const saved = await saveSubChatDraftWithAttachments(result.chatId, result.subChat.id, result.draft, {
            textContexts: result.context ? [{
              id: `pr-context-${result.subChat.id}`,
              sourceMessageId: `pr:${pr.owner}/${pr.repository}#${pr.number}`,
              text: result.context.text,
              preview: result.context.label,
              createdAt: new Date(),
            }] : [],
          })
          if (!saved.success || saved.error) toast.warning("The PR context could not be saved. Check the draft before sending.")
        }
        const store = useAgentSubChatStore.getState()
        store.setChatId(result.chatId)
        store.addToAllSubChats({
          id: result.subChat.id,
          name: result.subChat.name || "New chat",
          mode: result.subChat.mode as "plan" | "agent",
        })
        store.addToOpenSubChats(result.subChat.id)
        store.setActiveSubChat(result.subChat.id)
      }
      await Promise.all([
        utils.chats.list.invalidate(),
        utils.projects.list.invalidate(),
        utils.pullRequests.list.invalidate(),
        utils.chats.get.invalidate({ id: result.chatId }),
        utils.pullRequests.workspaceTargets.invalidate(identity),
      ])
      setRemote(false)
      setSource("local")
      setSelectedChat(result.chatId)
      setNewChat(false)
      setView(null)
    },
  })

  async function prepareChat(
    selected: string,
    data: NonNullable<typeof targets.data>,
  ) {
    const workspace = data.workspaces.find(entry => `workspace:${entry.id}` === selected)
    const project = data.projects.find(entry => `project:${entry.id}` === selected)
    if (!workspace && !project) throw new Error("Choose a workspace or local project.")
    await mutation.mutateAsync({
      ...identity,
      action: "analyze",
      projectId: workspace?.projectId || project!.id,
      workspaceId: workspace?.id,
    })
  }

  async function run(action: () => Promise<void>, showToast: boolean) {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Unable to open chat. Try again."
      setError(message)
      if (showToast) toast.error(message)
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  const openChat = () => run(async () => {
    const result = await targets.refetch()
    if (result.error) throw result.error
    if (!result.data) throw new Error("Unable to load workspaces. Try again.")
    const destination = defaultPullRequestChatTarget(result.data)
    if (destination) {
      await prepareChat(destination, result.data)
    } else {
      setTarget("")
      setChooserOpen(true)
    }
  }, true)

  const workspaces = (targets.data?.workspaces ?? []).filter(workspace => workspace.available && workspace.isolated)
  const projects = targets.data?.projects ?? []

  return (
    <>
      <Button
        ref={triggerRef}
        variant="ghost"
        size="icon"
        className="size-7 rounded-md text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
        disabled={busy}
        aria-busy={busy}
        aria-label="Open chat"
        title="Open chat"
        onClick={openChat}
      >
        {busy
          ? <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          : <MessageSquare className="size-3.5" strokeWidth={1.75} aria-hidden="true" />}
      </Button>
      <span role="status" className="sr-only">{busy ? "Opening a chat with the pull request context" : ""}</span>
      <Dialog open={chooserOpen} onOpenChange={open => { if (!busy) setChooserOpen(open) }}>
        <DialogContent
          className="sm:max-w-md"
          onCloseAutoFocus={event => {
            event.preventDefault()
            triggerRef.current?.focus()
          }}
          onEscapeKeyDown={event => { if (busy) event.preventDefault() }}
          onPointerDownOutside={event => { if (busy) event.preventDefault() }}
        >
          <DialogHeader>
            <DialogTitle>Choose a workspace</DialogTitle>
            <DialogDescription>
              The chat will open with an editable review request and this PR's context. Nothing is sent automatically.
            </DialogDescription>
          </DialogHeader>
          {projects.length === 0 && workspaces.length === 0
            ? <p className="text-sm text-muted-foreground">Add this repository as a local project in Instructor before opening a chat.</p>
            : <form className="space-y-4" onSubmit={event => {
              event.preventDefault()
              if (targets.data) void run(() => prepareChat(target, targets.data!), false)
            }}>
              <div className="space-y-2">
                <label htmlFor="pr-agent-workspace" className="text-xs font-medium">Workspace</label>
                <select
                  id="pr-agent-workspace"
                  required
                  value={target}
                  disabled={busy}
                  onChange={event => { setTarget(event.target.value); setError(null) }}
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="" disabled>Choose a workspace or local project</option>
                  {workspaces.map(workspace => (
                    <option key={workspace.id} value={`workspace:${workspace.id}`}>{workspace.name}</option>
                  ))}
                  {projects.map(project => (
                    <option key={project.id} value={`project:${project.id}`}>PR worktree · {project.name} · {project.path}</option>
                  ))}
                </select>
              </div>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <DialogFooter>
                <Button type="button" variant="ghost" disabled={busy} onClick={() => setChooserOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={busy}>
                  {busy && <Loader2 className="mr-2 size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
                  Open chat
                </Button>
              </DialogFooter>
            </form>}
        </DialogContent>
      </Dialog>
    </>
  )
}
