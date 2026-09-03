"use client"

import { useEffect, useId, useRef, useState, type ReactNode } from "react"
import {
  Box,
  ListTodo,
  FileText,
  TerminalSquare,
  FileDiff,
  FolderOpen,
  Plus,
  X,
  ChevronsRight,
} from "lucide-react"
import { ResizableSidebar } from "@/components/ui/resizable-sidebar"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { detailsSidebarWidthAtom } from "./atoms"
import type { useToolPanel } from "./use-tool-panel"
import type { ToolId, ToolTab } from "./tool-panel-state"

const TOOLS = [
  { id: "info", label: "Workspace", icon: Box },
  { id: "todo", label: "To-dos", icon: ListTodo },
  { id: "plan", label: "Plan", icon: FileText },
  { id: "terminal", label: "Terminal", icon: TerminalSquare },
  { id: "diff", label: "Changes", icon: FileDiff },
  { id: "files", label: "Files", icon: FolderOpen },
] as const

function tabLabel(tab: ToolTab) {
  if (tab.type === "terminal" && tab.number) return `Terminal ${tab.number}`
  return tab.type === "file"
    ? tab.path.split(/[\\/]/).pop() || tab.path
    : TOOLS.find((tool) => tool.id === tab.type)!.label
}

function toolShortcut(
  id: ToolId,
  terminalHotkey?: string | null,
  diffHotkey?: string | null,
  filesHotkey?: string | null,
) {
  if (id === "terminal") return terminalHotkey
  if (id === "diff") return diffHotkey
  if (id === "files") return filesHotkey
  return null
}

interface ToolPanelProps {
  panel: ReturnType<typeof useToolPanel>
  isOpen: boolean
  onClose: () => void
  onSelect: (tab: ToolTab) => void
  onOpenTool: (id: ToolId) => string | null
  unavailable: (id: ToolId) => boolean
  renderContent: (tab: ToolTab) => ReactNode
  terminalHotkey?: string | null
  diffHotkey?: string | null
  filesHotkey?: string | null
  toggleHotkey?: string | null
}

export function ToolPanel({
  panel,
  isOpen,
  onClose,
  onSelect,
  onOpenTool,
  unavailable,
  renderContent,
  terminalHotkey,
  diffHotkey,
  filesHotkey,
  toggleHotkey,
}: ToolPanelProps) {
  const rootId = useId()
  const tabRefs = useRef(new Map<string, HTMLButtonElement>())
  const addRef = useRef<HTMLButtonElement>(null)
  const launcherRef = useRef<HTMLButtonElement>(null)
  const stripRef = useRef<HTMLDivElement>(null)
  const lastTabId = panel.tabs.at(-1)?.id
  const previousTabs = useRef(panel.tabs)
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set())
  const mountedTabs = new Set(visitedTabs)
  if (isOpen && panel.activeId) mountedTabs.add(panel.activeId)
  useEffect(() => {
    if (!isOpen || !panel.activeId || visitedTabs.has(panel.activeId)) return
    setVisitedTabs((current) => new Set(current).add(panel.activeId!))
  }, [isOpen, panel.activeId, visitedTabs])
  useEffect(() => {
    const revealActiveTab = () => {
      if (panel.activeId) {
        tabRefs.current.get(panel.activeId)?.parentElement?.scrollIntoView({
          block: "nearest",
          inline: "nearest",
        })
      }
      if (panel.activeId === null || panel.activeId === lastTabId) {
        addRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" })
      }
    }
    revealActiveTab()
    const observer = new ResizeObserver(revealActiveTab)
    if (stripRef.current) observer.observe(stripRef.current)
    return () => observer.disconnect()
  }, [panel.activeId, lastTabId, isOpen])
  useEffect(() => {
    const removedTab = previousTabs.current.some(
      (old) => !panel.tabs.some((tab) => tab.id === old.id),
    )
    previousTabs.current = panel.tabs
    if (removedTab) {
      const button = panel.activeId
        ? tabRefs.current.get(panel.activeId)
        : (addRef.current ?? launcherRef.current)
      button?.focus()
    }
  }, [panel.tabs, panel.activeId])
  const focusTab = (id: string | null) =>
    requestAnimationFrame(() => {
      const button = id
        ? tabRefs.current.get(id)
        : (addRef.current ?? launcherRef.current)
      button?.focus()
      button?.scrollIntoView({ block: "nearest", inline: "nearest" })
    })
  const select = (tab: ToolTab) => onSelect(tab)
  const openTool = (id: ToolId) => {
    if (unavailable(id)) return
    focusTab(onOpenTool(id))
  }
  const close = (id: string) => {
    const index = panel.tabs.findIndex((tab) => tab.id === id)
    const remaining = panel.tabs.filter((tab) => tab.id !== id)
    const next =
      panel.activeId === id
        ? (remaining[Math.min(index, remaining.length - 1)]?.id ?? null)
        : panel.activeId
    panel.closeTab(id)
    focusTab(next)
  }
  const collapse = () => {
    onClose()
    requestAnimationFrame(() =>
      document
        .querySelector<HTMLButtonElement>("[data-tool-panel-trigger]")
        ?.focus(),
    )
  }
  return (
    <ResizableSidebar
      isOpen={isOpen}
      keepMounted
      onClose={collapse}
      widthAtom={detailsSidebarWidthAtom}
      side="right"
      minWidth={350}
      maxWidth={1000}
      animationDuration={0}
      initialWidth={0}
      exitWidth={0}
      showResizeTooltip
      className="bg-background border-l"
      style={{ borderLeftWidth: "0.5px", overflow: "hidden" }}
    >
      <div
        className="flex h-full min-w-0 flex-col overflow-hidden"
        aria-label="Tool panel"
      >
        <div className="flex h-10 shrink-0 items-center gap-1 border-b border-border/50 px-2">
          <div
            ref={stripRef}
            className="flex flex-1 min-w-0 items-center gap-1 overflow-x-auto scrollbar-hide"
          >
            <div
              role="tablist"
              aria-label="Open tools"
              className="flex min-w-0 flex-1 items-center gap-1 empty:hidden"
            >
              {panel.tabs.map((tab) => {
                const selected = panel.activeId === tab.id
                const Icon =
                  tab.type === "file"
                    ? FileText
                    : TOOLS.find((tool) => tool.id === tab.type)!.icon
                const id = rootId + encodeURIComponent(tab.id)
                return (
                  <div
                    key={tab.id}
                    role="presentation"
                    className={cn(
                      "group flex min-w-[72px] max-w-[180px] flex-1 basis-[120px] items-center rounded-md",
                      selected ? "bg-muted" : "hover:bg-muted/60",
                    )}
                  >
                    <button
                      ref={(element) => {
                        if (element) tabRefs.current.set(tab.id, element)
                        else tabRefs.current.delete(tab.id)
                      }}
                      id={id}
                      role="tab"
                      aria-controls={id + "-panel"}
                      aria-selected={selected}
                      tabIndex={
                        selected ||
                        (panel.activeId === null &&
                          tab.id === panel.tabs[0]?.id)
                          ? 0
                          : -1
                      }
                      title={tab.type === "file" ? tab.path : tabLabel(tab)}
                      className="flex h-7 min-w-0 flex-1 items-center gap-1.5 overflow-hidden rounded-md px-2 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                      onClick={() => select(tab)}
                      onKeyDown={(event) => {
                        const index = panel.tabs.findIndex(
                          (item) => item.id === tab.id,
                        )
                        const next =
                          event.key === "ArrowRight"
                            ? (index + 1) % panel.tabs.length
                            : event.key === "ArrowLeft"
                              ? (index - 1 + panel.tabs.length) %
                                panel.tabs.length
                              : event.key === "Home"
                                ? 0
                                : event.key === "End"
                                  ? panel.tabs.length - 1
                                  : -1
                        if (next >= 0) {
                          event.preventDefault()
                          select(panel.tabs[next]!)
                          focusTab(panel.tabs[next]!.id)
                        }
                        if (event.key === "Delete") {
                          event.preventDefault()
                          close(tab.id)
                        }
                      }}
                    >
                      <Icon
                        className="size-3.5 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <span className="truncate">{tabLabel(tab)}</span>
                    </button>
                    <button
                      type="button"
                      aria-label={"Close " + tabLabel(tab)}
                      tabIndex={selected ? 0 : -1}
                      onClick={() => close(tab.id)}
                      className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      <X className="size-3" aria-hidden="true" />
                    </button>
                  </div>
                )
              })}
            </div>
            {panel.tabs.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    ref={addRef}
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0"
                    aria-label="Open a tool"
                    title="Open a tool"
                  >
                    <Plus className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={6}
                  collisionPadding={12}
                  className="w-56"
                >
                  {TOOLS.map((tool) => {
                    const shortcut = toolShortcut(
                      tool.id,
                      terminalHotkey,
                      diffHotkey,
                      filesHotkey,
                    )
                    const disabled = unavailable(tool.id)
                    return (
                      <DropdownMenuItem
                        key={tool.id}
                        disabled={disabled}
                        title={
                          disabled ? "Requires a local workspace" : undefined
                        }
                        onSelect={() => openTool(tool.id)}
                      >
                        <tool.icon className="size-4" aria-hidden="true" />
                        <span>{tool.label}</span>
                        {shortcut && (
                          <DropdownMenuShortcut>
                            {shortcut}
                          </DropdownMenuShortcut>
                        )}
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            aria-label="Close tool panel"
            title={
              toggleHotkey
                ? "Close tool panel (" + toggleHotkey + ")"
                : "Close tool panel"
            }
            onClick={collapse}
          >
            <ChevronsRight className="size-4" />
          </Button>
        </div>
        {panel.tabs.length === 0 && (
          <div className="flex flex-1 min-h-0 items-center justify-center overflow-auto p-5">
            <div className="w-full max-w-md space-y-1.5">
              {TOOLS.map((tool) => {
                const shortcut = toolShortcut(
                  tool.id,
                  terminalHotkey,
                  diffHotkey,
                  filesHotkey,
                )
                return (
                  <div key={tool.id}>
                    <button
                      ref={tool.id === TOOLS[0].id ? launcherRef : undefined}
                      type="button"
                      disabled={unavailable(tool.id)}
                      onClick={() => openTool(tool.id)}
                      className="flex min-h-10 w-full items-center gap-3 rounded-md bg-muted/50 px-3 py-2 text-left text-sm hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <tool.icon
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <span className="flex-1">{tool.label}</span>
                      {shortcut && <Kbd>{shortcut}</Kbd>}
                    </button>
                    {unavailable(tool.id) && (
                      <p className="px-3 py-1 text-xs text-muted-foreground">
                        Requires a local workspace
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
        {panel.tabs.map((tab) => {
          const id = rootId + encodeURIComponent(tab.id)
          return (
            <div
              key={tab.id}
              id={id + "-panel"}
              role="tabpanel"
              aria-labelledby={id}
              hidden={panel.activeId !== tab.id}
              className={cn(
                "flex-1 min-h-0 min-w-0 flex-col overflow-hidden",
                panel.activeId === tab.id ? "flex" : "hidden",
              )}
            >
              {mountedTabs.has(tab.id) ? renderContent(tab) : null}
            </div>
          )
        })}
      </div>
    </ResizableSidebar>
  )
}
