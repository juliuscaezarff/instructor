export const TOOL_IDS = [
  "info",
  "todo",
  "plan",
  "terminal",
  "diff",
  "files",
] as const
export type ToolId = (typeof TOOL_IDS)[number]
export type TerminalPosition = "side-peek" | "bottom"
export type ToolTab =
  | { id: string; type: Exclude<ToolId, "terminal"> }
  | {
      id: string
      type: "terminal"
      number?: number
      position?: TerminalPosition
    }
  | { id: string; type: "file"; path: string }
export interface ToolPanelState {
  tabs: ToolTab[]
  activeId: string | null
  lastTerminalId: string | null
}
export const EMPTY_TOOL_PANEL: ToolPanelState = {
  tabs: [],
  activeId: null,
  lastTerminalId: null,
}

export function fileTab(path: string): ToolTab {
  const normalized = path.replace(/\\/g, "/")
  // Windows paths are case-insensitive; Unix paths are not.
  const key = /^(?:[a-z]:\/|\/\/)/i.test(normalized)
    ? normalized.toLowerCase()
    : normalized
  return { id: `file:${key}`, type: "file", path }
}

export function restoreToolPanel(value: unknown): ToolPanelState {
  if (!value || typeof value !== "object") return EMPTY_TOOL_PANEL
  const stored = value as Partial<ToolPanelState>
  const tabs: ToolTab[] = []
  for (const candidate of Array.isArray(stored.tabs) ? stored.tabs : []) {
    if (!candidate || typeof candidate !== "object") continue
    let tab: ToolTab
    if (
      candidate.type === "file" &&
      typeof candidate.path === "string" &&
      /^(?:[a-z]:[\\/]|\/|\\\\)/i.test(candidate.path)
    ) {
      tab = fileTab(candidate.path)
    } else if (candidate.type === "terminal") {
      tab = {
        id:
          typeof candidate.id === "string" &&
          /^terminal:[a-z0-9-]+$/i.test(candidate.id)
            ? candidate.id
            : "terminal",
        type: "terminal",
        ...(Number.isSafeInteger(candidate.number) && candidate.number! > 0
          ? { number: candidate.number }
          : {}),
        position: candidate.position === "bottom" ? "bottom" : "side-peek",
      }
    } else if (TOOL_IDS.includes(candidate.type as ToolId)) {
      tab = {
        id: candidate.type,
        type: candidate.type as Exclude<ToolId, "terminal">,
      }
    } else continue
    if (!tabs.some((existing) => existing.id === tab.id)) tabs.push(tab)
  }
  const activeId =
    stored.activeId === null && tabs.length === 0
      ? null
      : (tabs.find((tab) => tab.id === stored.activeId)?.id ??
        tabs[0]?.id ??
        null)
  const lastTerminalId =
    tabs.find((tab) => tab.id === activeId && tab.type === "terminal")?.id ??
    tabs.find(
      (tab) => tab.id === stored.lastTerminalId && tab.type === "terminal",
    )?.id ??
    tabs.findLast((tab) => tab.type === "terminal")?.id ??
    null
  return { tabs, activeId, lastTerminalId }
}

export type ToolPanelAction =
  | { type: "open"; tab: ToolTab }
  | { type: "open-tool"; tool: ToolId }
  | { type: "create-terminal"; id: string }
  | {
      type: "set-terminal-position"
      id: string
      position: TerminalPosition
    }
  | { type: "select"; id: string | null }
  | { type: "close"; id: string }

export function reduceToolPanel(
  state: ToolPanelState,
  action: ToolPanelAction,
): ToolPanelState {
  if (action.type === "set-terminal-position") {
    if (
      !state.tabs.some((tab) => tab.id === action.id && tab.type === "terminal")
    )
      return state
    return {
      ...state,
      tabs: state.tabs.map((tab) =>
        tab.id === action.id && tab.type === "terminal"
          ? { ...tab, position: action.position }
          : tab,
      ),
      lastTerminalId: action.id,
    }
  }
  if (action.type === "create-terminal") {
    const number =
      Math.max(
        0,
        ...state.tabs
          .filter((tab) => tab.type === "terminal")
          .map((tab) => tab.number ?? 1),
      ) + 1
    return reduceToolPanel(state, {
      type: "open",
      tab: {
        id: action.id,
        type: "terminal",
        number,
        position: "side-peek",
      },
    })
  }
  if (action.type === "open-tool") {
    const existing =
      action.tool === "terminal"
        ? state.tabs.find(
            (tab) => tab.id === state.lastTerminalId && tab.type === "terminal",
          )
        : undefined
    return reduceToolPanel(state, {
      type: "open",
      tab: existing ?? { id: action.tool, type: action.tool },
    })
  }
  if (action.type === "open")
    return {
      tabs: state.tabs.some((tab) => tab.id === action.tab.id)
        ? state.tabs
        : [...state.tabs, action.tab],
      activeId: action.tab.id,
      lastTerminalId:
        action.tab.type === "terminal" ? action.tab.id : state.lastTerminalId,
    }
  if (action.type === "select")
    return {
      ...state,
      activeId: state.tabs.some((tab) => tab.id === action.id)
        ? action.id
        : (state.activeId ?? state.tabs[0]?.id ?? null),
      lastTerminalId: state.tabs.some(
        (tab) => tab.id === action.id && tab.type === "terminal",
      )
        ? action.id
        : state.lastTerminalId,
    }
  const index = state.tabs.findIndex((tab) => tab.id === action.id)
  const tabs = state.tabs.filter((tab) => tab.id !== action.id)
  return {
    tabs,
    lastTerminalId:
      state.lastTerminalId === action.id
        ? (tabs.findLast((tab) => tab.type === "terminal")?.id ?? null)
        : state.lastTerminalId,
    activeId:
      state.activeId === action.id
        ? (tabs[Math.min(index, tabs.length - 1)]?.id ?? null)
        : state.activeId,
  }
}
