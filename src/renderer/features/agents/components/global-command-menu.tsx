import { useDeferredValue, useEffect, useMemo, useState } from "react"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import type { inferRouterOutputs } from "@trpc/server"
import {
  Check,
  Columns3,
  FileSearch,
  GitPullRequest,
  Inbox,
  Keyboard,
  PanelLeft,
  Search,
  Settings,
  SquarePen,
  Workflow,
} from "lucide-react"
import { toast } from "sonner"

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "../../../components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../../../components/ui/dialog"
import { Kbd } from "../../../components/ui/kbd"
import { ProjectIcon } from "../../../components/ui/project-icon"
import {
  agentsSettingsDialogActiveTabAtom,
  agentsSidebarOpenAtom,
  betaAutomationsEnabledAtom,
  betaKanbanEnabledAtom,
  chatSourceModeAtom,
  devToolsUnlockedAtom,
  type SettingsTab,
} from "../../../lib/atoms"
import { usePrefetchLocalChat } from "../../../lib/hooks/use-prefetch-local-chat"
import {
  usePrefetchRemoteChat,
  useRemoteChats,
} from "../../../lib/hooks/use-remote-chats"
import { trpc } from "../../../lib/trpc"
import { isMacOS } from "../../../lib/utils/platform"
import type { AppRouter } from "../../../../main/lib/trpc/routers"
import {
  SETTINGS_ADVANCED_TABS,
  SETTINGS_DEBUG_TAB,
  SETTINGS_MAIN_TABS,
} from "../../settings/settings-sidebar"
import {
  desktopViewAtom,
  fileSearchDialogOpenAtom,
  globalCommandMenuOpenAtom,
  selectedAgentChatIdAtom,
  selectedChatIsRemoteAtom,
  selectedDraftIdAtom,
  selectedProjectAtom,
  showNewChatFormAtom,
} from "../atoms"
import {
  executeAgentAction,
  getAvailableAgentActions,
  type AgentActionContext,
  type AgentActionDefinition,
} from "../lib/agents-actions"
import { toggleSearchAtom } from "../search"
import {
  rankCommandItems,
  type CommandSearchItem,
} from "./global-command-search"

const CHAT_RESULT_LIMIT = 8
const DEFAULT_CHAT_LIMIT = 6
const OTHER_RESULT_LIMIT = 6

interface CommandChat extends CommandSearchItem {
  chatId: string
  isRemote: boolean
  projectName: string
  prNumber: number | null
  updatedAt: number
}

interface CommandAction extends CommandSearchItem {
  action: AgentActionDefinition
}

interface CommandSetting extends CommandSearchItem {
  tabId: SettingsTab
  icon: React.ComponentType<{ className?: string }>
}

type RouterOutputs = inferRouterOutputs<AppRouter>
type ProjectListItem = RouterOutputs["projects"]["list"][number]

type CommandProject = CommandSearchItem & {
  project: ProjectListItem
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target.isContentEditable ||
    Boolean(target.closest('[contenteditable="true"]'))
  )
}

function formatHotkey(hotkey: AgentActionDefinition["hotkey"]): string | null {
  if (!hotkey) return null
  const candidates = Array.isArray(hotkey) ? hotkey : [hotkey]
  const platformHotkey = isMacOS()
    ? candidates.find((value) => value.includes("cmd")) ?? candidates[0]
    : candidates.find((value) => value.includes("ctrl")) ?? candidates[0]

  return platformHotkey
    .replace(/cmd\+/gi, "⌘")
    .replace(/ctrl\+/gi, isMacOS() ? "⌃" : "Ctrl+")
    .replace(/shift\+/gi, isMacOS() ? "⇧" : "Shift+")
    .replace(/(?:opt|alt)\+/gi, isMacOS() ? "⌥" : "Alt+")
    .replace(/([a-z])$/i, (key) => key.toUpperCase())
}

function ActionIcon({ actionId }: { actionId: string }) {
  const className = "h-3.5 w-3.5 shrink-0 text-muted-foreground"
  switch (actionId) {
    case "create-new-agent":
      return <SquarePen aria-hidden="true" className={className} />
    case "toggle-sidebar":
      return <PanelLeft aria-hidden="true" className={className} />
    case "toggle-chat-search":
      return <Search aria-hidden="true" className={className} />
    case "file-search":
    case "open-file-in-editor":
      return <FileSearch aria-hidden="true" className={className} />
    case "open-kanban":
      return <Columns3 aria-hidden="true" className={className} />
    case "open-automations":
      return <Workflow aria-hidden="true" className={className} />
    case "open-inbox":
      return <Inbox aria-hidden="true" className={className} />
    case "open-shortcuts":
      return <Keyboard aria-hidden="true" className={className} />
    default:
      return <Settings aria-hidden="true" className={className} />
  }
}

export function GlobalCommandMenu() {
  const [open, setOpen] = useAtom(globalCommandMenuOpenAtom)
  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query)
  const [selectedChatId, setSelectedChatId] = useAtom(selectedAgentChatIdAtom)
  const setSelectedChatIsRemote = useSetAtom(selectedChatIsRemoteAtom)
  const setChatSourceMode = useSetAtom(chatSourceModeAtom)
  const setSelectedProject = useSetAtom(selectedProjectAtom)
  const selectedProject = useAtomValue(selectedProjectAtom)
  const setSelectedDraftId = useSetAtom(selectedDraftIdAtom)
  const setShowNewChatForm = useSetAtom(showNewChatFormAtom)
  const setDesktopView = useSetAtom(desktopViewAtom)
  const setSidebarOpen = useSetAtom(agentsSidebarOpenAtom)
  const setSettingsActiveTab = useSetAtom(agentsSettingsDialogActiveTabAtom)
  const setFileSearchDialogOpen = useSetAtom(fileSearchDialogOpenAtom)
  const toggleChatSearch = useSetAtom(toggleSearchAtom)
  const betaKanbanEnabled = useAtomValue(betaKanbanEnabledAtom)
  const betaAutomationsEnabled = useAtomValue(betaAutomationsEnabledAtom)
  const devToolsUnlocked = useAtomValue(devToolsUnlockedAtom)

  const { data: localChats = [] } = trpc.chats.list.useQuery({})
  const { data: projects = [] } = trpc.projects.list.useQuery()
  const { data: remoteChats = [] } = useRemoteChats()
  const prefetchLocalChat = usePrefetchLocalChat()
  const prefetchRemoteChat = usePrefetchRemoteChat()

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() !== "k" ||
        !(event.metaKey || event.ctrlKey) ||
        event.altKey ||
        event.shiftKey ||
        isEditableTarget(event.target)
      ) {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      setOpen((current) => !current)
    }

    window.addEventListener("keydown", handleKeyDown, true)
    return () => window.removeEventListener("keydown", handleKeyDown, true)
  }, [setOpen])

  const projectsMap = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects],
  )

  const chats = useMemo<CommandChat[]>(() => {
    const items: CommandChat[] = localChats.map((chat) => {
      const project = projectsMap.get(chat.projectId)
      const projectName = project?.name ?? "Unknown project"
      const label = chat.name?.trim() || "New workspace"
      return {
        id: `chat:${chat.id}`,
        chatId: chat.id,
        isRemote: false,
        label,
        projectName,
        prNumber: chat.prNumber,
        updatedAt: chat.updatedAt?.getTime() ?? chat.createdAt?.getTime() ?? 0,
        keywords: [projectName, chat.prNumber ? `#${chat.prNumber}` : "", String(chat.prNumber ?? "")],
      }
    })

    for (const chat of remoteChats) {
      const projectName = chat.meta?.repository ?? chat.meta?.github_repo ?? "Remote project"
      items.push({
        id: `chat:remote_${chat.id}`,
        chatId: chat.id,
        isRemote: true,
        label: chat.name?.trim() || "New workspace",
        projectName,
        prNumber: null,
        updatedAt: new Date(chat.updated_at).getTime(),
        keywords: [projectName, "remote"],
      })
    }

    return items.sort((a, b) => b.updatedAt - a.updatedAt)
  }, [localChats, projectsMap, remoteChats])

  const actionContext = useMemo<AgentActionContext>(
    () => ({
      setSelectedChatId,
      setSelectedDraftId,
      setShowNewChatForm,
      setDesktopView,
      setSidebarOpen,
      setSettingsActiveTab,
      setFileSearchDialogOpen,
      toggleChatSearch,
      selectedChatId,
      selectedProjectId: selectedProject?.id ?? null,
      betaKanbanEnabled,
      betaAutomationsEnabled,
    }),
    [
      setSelectedChatId,
      setSelectedDraftId,
      setShowNewChatForm,
      setDesktopView,
      setSidebarOpen,
      setSettingsActiveTab,
      setFileSearchDialogOpen,
      toggleChatSearch,
      selectedChatId,
      selectedProject?.id,
      betaKanbanEnabled,
      betaAutomationsEnabled,
    ],
  )

  const actions = useMemo<CommandAction[]>(
    () =>
      getAvailableAgentActions(actionContext)
        .filter((action) => action.id !== "open-settings" && action.id !== "open-shortcuts")
        .map((action) => ({
          id: `action:${action.id}`,
          label: action.label,
          keywords: [action.description ?? "", action.category],
          action,
        })),
    [actionContext],
  )

  const settings = useMemo<CommandSetting[]>(() => {
    const visibleTabs = [
      ...SETTINGS_MAIN_TABS,
      ...(import.meta.env.DEV || devToolsUnlocked ? [SETTINGS_DEBUG_TAB] : []),
      ...SETTINGS_ADVANCED_TABS,
    ]
    return visibleTabs.map((tab) => ({
      id: `setting:${tab.id}`,
      label: tab.label,
      keywords: ["settings", "configuration", tab.id],
      tabId: tab.id,
      icon: tab.icon,
    }))
  }, [devToolsUnlocked])

  const projectItems = useMemo<CommandProject[]>(
    () =>
      projects.map((project) => ({
        id: `project:${project.id}`,
        label: project.name,
        keywords: [project.path, project.gitRepo ?? "", project.gitOwner ?? ""],
        project,
      })),
    [projects],
  )

  const hasQuery = deferredQuery.trim().length > 0
  const visibleChats = useMemo(
    () =>
      rankCommandItems(
        chats,
        deferredQuery,
        hasQuery ? CHAT_RESULT_LIMIT : DEFAULT_CHAT_LIMIT,
      ),
    [chats, deferredQuery, hasQuery],
  )
  const visibleActions = useMemo(
    () => rankCommandItems(actions, deferredQuery, OTHER_RESULT_LIMIT),
    [actions, deferredQuery],
  )
  const visibleSettings = useMemo(
    () => rankCommandItems(settings, deferredQuery, OTHER_RESULT_LIMIT),
    [settings, deferredQuery],
  )
  const visibleProjects = useMemo(
    () => rankCommandItems(projectItems, deferredQuery, OTHER_RESULT_LIMIT),
    [projectItems, deferredQuery],
  )
  const resultCount =
    visibleChats.length +
    visibleActions.length +
    visibleSettings.length +
    visibleProjects.length

  const closeMenu = () => {
    setOpen(false)
    setQuery("")
  }

  const handleSelectChat = async (chat: CommandChat) => {
    closeMenu()
    if (window.desktopApi?.claimChat) {
      const result = await window.desktopApi.claimChat(chat.chatId)
      if (!result.ok) {
        toast.info("This workspace is already open in another window", {
          description: "Switching to the existing window.",
          duration: 3000,
        })
        await window.desktopApi.focusChatOwner(chat.chatId)
        return
      }
      if (selectedChatId && selectedChatId !== chat.chatId) {
        await window.desktopApi.releaseChat(selectedChatId)
      }
    }

    setSelectedChatId(chat.chatId)
    setSelectedChatIsRemote(chat.isRemote)
    setChatSourceMode(chat.isRemote ? "sandbox" : "local")
    setSelectedDraftId(null)
    setShowNewChatForm(false)
    setDesktopView(null)
  }

  const handleSelectProject = (item: CommandProject) => {
    const { project } = item
    setSelectedProject({
      id: project.id,
      name: project.name,
      path: project.path,
      gitRemoteUrl: project.gitRemoteUrl,
      gitProvider: project.gitProvider as "github" | "gitlab" | "bitbucket" | null,
      gitOwner: project.gitOwner,
      gitRepo: project.gitRepo,
    })
    setSelectedChatId(null)
    setSelectedDraftId(null)
    setShowNewChatForm(true)
    setDesktopView(null)
    setSidebarOpen(true)
    closeMenu()
  }

  const handleSelectedValueChange = (value: string | null) => {
    if (!value?.startsWith("chat:")) return
    const chat = chats.find((item) => item.id === value)
    if (!chat) return
    if (chat.isRemote) prefetchRemoteChat(chat.chatId)
    else prefetchLocalChat(chat.chatId)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) setQuery("")
      }}
    >
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className="w-[min(28rem,calc(100%-2rem))] max-w-none max-h-[calc(100%-2rem)] gap-0 overflow-hidden rounded-xl border-border bg-popover p-0 shadow-xl overscroll-contain"
      >
        <DialogTitle className="sr-only">Search and commands</DialogTitle>
        <DialogDescription className="sr-only">
          Search chats, run actions, open settings, or switch projects.
        </DialogDescription>
        <Command
          shouldFilter={false}
          onSelectedValueChange={handleSelectedValueChange}
        >
          <CommandInput
            aria-label="Search chats and commands"
            placeholder="Search chats and commands…"
            value={query}
            onValueChange={setQuery}
            wrapperClassName="mx-0 my-0 h-9 rounded-none border-b border-border bg-transparent px-3"
            className="text-sm"
          />

          <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {hasQuery
              ? `${resultCount} ${resultCount === 1 ? "result" : "results"} for ${deferredQuery}`
              : `${visibleChats.length} recent chats and ${resultCount - visibleChats.length} commands available`}
          </div>

          <CommandList className="max-h-[min(24rem,calc(100vh-9rem))] scroll-py-1 py-1">
            {resultCount === 0 ? (
              <CommandEmpty className="px-6 py-10">
                <p className="font-medium text-foreground">No results for “{deferredQuery}”</p>
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="mt-2 rounded-md px-2 py-1 text-sm text-muted-foreground underline decoration-from-font underline-offset-4 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring/70"
                >
                  Clear search
                </button>
              </CommandEmpty>
            ) : (
              <>
                {visibleChats.length > 0 && (
                  <CommandGroup heading={hasQuery ? "Chats" : "Recent chats"}>
                    {visibleChats.map((chat) => (
                      <CommandItem
                        key={chat.id}
                        value={chat.id}
                        onSelect={() => handleSelectChat(chat)}
                        onMouseEnter={() => {
                          if (chat.isRemote) prefetchRemoteChat(chat.chatId)
                          else prefetchLocalChat(chat.chatId)
                        }}
                        className="min-h-7 gap-2 px-2 py-1 text-start"
                      >
                        <span className="min-w-0 flex-1 truncate text-sm font-medium" title={chat.label}>
                          {chat.label}
                        </span>
                        <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                          {chat.prNumber && (
                            <span className="flex items-center gap-1 tabular-nums">
                              <GitPullRequest aria-hidden="true" className="h-3 w-3" />
                              {chat.prNumber}
                            </span>
                          )}
                          {chat.isRemote && <span>Remote</span>}
                          <span className="max-w-20 truncate" title={chat.projectName}>
                            {chat.projectName}
                          </span>
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {visibleActions.length > 0 && (
                  <>
                    {visibleChats.length > 0 && <CommandSeparator />}
                    <CommandGroup heading="Quick actions">
                      {visibleActions.map((item) => {
                        const hotkey = formatHotkey(item.action.hotkey)
                        return (
                          <CommandItem
                            key={item.id}
                            value={item.id}
                            onSelect={async () => {
                              closeMenu()
                              await executeAgentAction(item.action.id, actionContext, "ui_button")
                            }}
                            className="min-h-7 gap-2 px-2 py-1"
                          >
                            <ActionIcon actionId={item.action.id} />
                            <span className="min-w-0 flex-1 truncate text-start">{item.label}</span>
                            {hotkey && <Kbd className="shrink-0">{hotkey}</Kbd>}
                          </CommandItem>
                        )
                      })}
                    </CommandGroup>
                  </>
                )}

                {visibleSettings.length > 0 && (
                  <>
                    {(visibleChats.length > 0 || visibleActions.length > 0) && <CommandSeparator />}
                    <CommandGroup heading="Settings">
                      {visibleSettings.map((item) => {
                        const Icon = item.icon
                        return (
                          <CommandItem
                            key={item.id}
                            value={item.id}
                            onSelect={() => {
                              setSettingsActiveTab(item.tabId)
                              setDesktopView("settings")
                              setSidebarOpen(true)
                              closeMenu()
                            }}
                            className="min-h-7 gap-2 px-2 py-1"
                          >
                            <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="min-w-0 flex-1 truncate text-start">{item.label}</span>
                          </CommandItem>
                        )
                      })}
                    </CommandGroup>
                  </>
                )}

                {visibleProjects.length > 0 && (
                  <>
                    {(visibleChats.length > 0 || visibleActions.length > 0 || visibleSettings.length > 0) && (
                      <CommandSeparator />
                    )}
                    <CommandGroup heading="Projects">
                      {visibleProjects.map((item) => {
                        const isCurrent = selectedProject?.id === item.project.id
                        return (
                          <CommandItem
                            key={item.id}
                            value={item.id}
                            onSelect={() => handleSelectProject(item)}
                            className="min-h-7 gap-2 px-2 py-1"
                          >
                            <ProjectIcon project={item.project} className="h-3.5 w-3.5 shrink-0" />
                            <span className="min-w-0 flex-1 truncate text-start" title={item.project.path}>
                              {item.label}
                            </span>
                            {isCurrent && (
                              <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                                <Check aria-hidden="true" className="h-3 w-3" />
                                Current
                              </span>
                            )}
                          </CommandItem>
                        )
                      })}
                    </CommandGroup>
                  </>
                )}
              </>
            )}
          </CommandList>

          <div className="flex items-center justify-between border-t border-border px-3 py-1.5 text-xs text-muted-foreground">
            <span>Use ↑↓ to navigate</span>
            <span className="flex items-center gap-2">
              <span className="flex items-center gap-1"><Kbd>↵</Kbd> Open</span>
              <span className="flex items-center gap-1"><Kbd>Esc</Kbd> Close</span>
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
