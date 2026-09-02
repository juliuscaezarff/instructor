import { useMemo, useCallback } from "react"
import { atom, useAtom, useSetAtom } from "jotai"
import { atomFamily } from "jotai/utils"
import { atomWithWindowStorage } from "@/lib/window-storage"
import { detailsSidebarOpenAtom } from "./atoms"
import {
  restoreToolPanel,
  reduceToolPanel,
  fileTab,
  type ToolId,
  type TerminalPosition,
  type ToolPanelAction,
} from "./tool-panel-state"

export const toolPanelAtomFamily = atomFamily((workspaceId: string) => {
  const storage = atomWithWindowStorage<unknown>(
    `tools:v1:${workspaceId}`,
    null,
    { getOnInit: true },
  )
  const state = atom((get) => restoreToolPanel(get(storage)))
  return atom(
    (get) => get(state),
    (get, set, action: ToolPanelAction) => {
      const next = reduceToolPanel(get(state), action)
      set(storage, next)
      if (
        action.type === "open" ||
        action.type === "open-tool" ||
        action.type === "create-terminal"
      )
        set(detailsSidebarOpenAtom, true)
      return next.activeId
    },
  )
})

export function useToolPanel(workspaceId: string) {
  const stateAtom = useMemo(
    () => toolPanelAtomFamily(workspaceId),
    [workspaceId],
  )
  const [state, dispatch] = useAtom(stateAtom)
  const setOpen = useSetAtom(detailsSidebarOpenAtom)
  const openTool = useCallback(
    (type: ToolId) => dispatch({ type: "open-tool", tool: type }),
    [dispatch],
  )
  const createTerminal = useCallback(
    () =>
      dispatch({
        type: "create-terminal",
        id: `terminal:${crypto.randomUUID()}`,
      }),
    [dispatch],
  )
  const setTerminalPosition = useCallback(
    (id: string, position: TerminalPosition) =>
      dispatch({ type: "set-terminal-position", id, position }),
    [dispatch],
  )
  const openFile = useCallback(
    (path: string) => dispatch({ type: "open", tab: fileTab(path) }),
    [dispatch],
  )
  const closeTab = useCallback(
    (id: string) => dispatch({ type: "close", id }),
    [dispatch],
  )
  const selectTab = useCallback(
    (id: string | null) => dispatch({ type: "select", id }),
    [dispatch],
  )
  return {
    ...state,
    activeTab: state.tabs.find((tab) => tab.id === state.activeId),
    openTool,
    createTerminal,
    setTerminalPosition,
    openFile,
    closeTab,
    selectTab,
    setOpen,
  }
}
