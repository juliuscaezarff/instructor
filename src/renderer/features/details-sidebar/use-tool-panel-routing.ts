import { useHotkeys } from "react-hotkeys-hook"
import { customHotkeysAtom } from "@/lib/atoms"
import { getResolvedHotkey } from "@/lib/hotkeys"
import { isMacOS } from "@/lib/utils/platform"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type SetStateAction,
} from "react"
import { useAtom, useAtomValue } from "jotai"
import {
  diffSidebarOpenAtomFamily,
  diffViewDisplayModeAtom,
  fileViewerOpenAtomFamily,
  fileViewerDisplayModeAtom,
  planSidebarOpenAtomFamily,
} from "../agents/atoms"
import { terminalSidebarOpenAtomFamily } from "../terminal/atoms"
import { detailsSidebarOpenAtom } from "./atoms"
import { useToolPanel } from "./use-tool-panel"

// Legacy atoms remain request entry points for message actions and global shortcuts.
// Consume side-panel requests so a later request can activate an existing background tab.
export function useToolPanelRouting(
  chatId: string,
  subChatId: string | null,
  mobile: boolean,
) {
  const panel = useToolPanel(chatId)
  const isPanelOpen = useAtomValue(detailsSidebarOpenAtom)
  const [diffRequest, setDiffRequest] = useAtom(
    useMemo(() => diffSidebarOpenAtomFamily(chatId), [chatId]),
  )
  const [planRequest, setPlanRequest] = useAtom(
    useMemo(() => planSidebarOpenAtomFamily(subChatId || ""), [subChatId]),
  )
  const [terminalRequest, setTerminalRequest] = useAtom(
    useMemo(() => terminalSidebarOpenAtomFamily(chatId), [chatId]),
  )
  const [fileRequest, setFileRequest] = useAtom(
    useMemo(() => fileViewerOpenAtomFamily(chatId), [chatId]),
  )
  const diffMode = useAtomValue(diffViewDisplayModeAtom)
  const fileMode = useAtomValue(fileViewerDisplayModeAtom)
  const { openTool, openFile, closeTab, activeTab } = panel
  const active = isPanelOpen ? activeTab?.type : undefined

  useEffect(() => {
    if (mobile) return
    if (diffRequest && diffMode === "side-peek") {
      openTool("diff")
      setDiffRequest(false)
    }
  }, [mobile, diffRequest, diffMode, openTool, setDiffRequest])
  useEffect(() => {
    if (!mobile && planRequest) {
      openTool("plan")
      setPlanRequest(false)
    }
  }, [mobile, planRequest, openTool, setPlanRequest])
  useEffect(() => {
    if (!mobile && terminalRequest) {
      openTool("terminal")
      setTerminalRequest(false)
    }
  }, [mobile, terminalRequest, openTool, setTerminalRequest])
  useEffect(() => {
    if (!mobile && fileRequest && fileMode === "side-peek") {
      openFile(fileRequest)
      setFileRequest(null)
    }
  }, [mobile, fileRequest, fileMode, openFile, setFileRequest])

  // Transfer the active content when its presentation changes; never mount two terminals.
  const previousModes = useRef({ diffMode, fileMode })
  useEffect(() => {
    const previous = previousModes.current
    if (!mobile) {
      if (
        previous.diffMode === "side-peek" &&
        diffMode !== "side-peek" &&
        active === "diff"
      )
        setDiffRequest(true)
      if (
        previous.fileMode === "side-peek" &&
        fileMode !== "side-peek" &&
        activeTab?.type === "file"
      )
        setFileRequest(activeTab.path)
    }
    previousModes.current = { diffMode, fileMode }
  }, [
    mobile,
    diffMode,
    fileMode,
    active,
    activeTab,
    setDiffRequest,
    setFileRequest,
  ])

  const isDiffSidebarOpen =
    !mobile && diffMode === "side-peek" ? active === "diff" : diffRequest
  const isPlanSidebarOpen = mobile ? planRequest : active === "plan"
  const isTerminalSidebarOpen = mobile ? terminalRequest : active === "terminal"
  const fileViewerPath =
    !mobile && fileMode === "side-peek"
      ? activeTab?.type === "file"
        ? activeTab.path
        : null
      : fileRequest
  const setIsDiffSidebarOpen = useCallback(
    (value: SetStateAction<boolean>) => {
      const open =
        typeof value === "function" ? value(isDiffSidebarOpen) : value
      if (mobile || diffMode !== "side-peek") setDiffRequest(open)
      else if (open) openTool("diff")
      else closeTab("diff")
    },
    [mobile, diffMode, isDiffSidebarOpen, setDiffRequest, openTool, closeTab],
  )
  const setIsPlanSidebarOpen = useCallback(
    (value: SetStateAction<boolean>) => {
      const open =
        typeof value === "function" ? value(isPlanSidebarOpen) : value
      if (mobile) setPlanRequest(open)
      else if (open) openTool("plan")
      else closeTab("plan")
    },
    [mobile, isPlanSidebarOpen, setPlanRequest, openTool, closeTab],
  )
  const setIsTerminalSidebarOpen = useCallback(
    (value: SetStateAction<boolean>) => {
      const open =
        typeof value === "function" ? value(isTerminalSidebarOpen) : value
      if (mobile) setTerminalRequest(open)
      else if (open) openTool("terminal")
      else if (activeTab?.type === "terminal") closeTab(activeTab.id)
      else if (panel.lastTerminalId) closeTab(panel.lastTerminalId)
    },
    [
      mobile,
      isTerminalSidebarOpen,
      setTerminalRequest,
      openTool,
      closeTab,
      activeTab,
      panel.lastTerminalId,
    ],
  )
  const setFileViewerPath = useCallback(
    (path: string | null) => {
      if (mobile || fileMode !== "side-peek") setFileRequest(path)
      else if (path) openFile(path)
      else if (activeTab?.type === "file") closeTab(activeTab.id)
    },
    [mobile, fileMode, setFileRequest, openFile, activeTab, closeTab],
  )
  const hotkeys = useAtomValue(customHotkeysAtom)
  const resolveKey = (id: "toggle-details" | "toggle-terminal" | "open-diff") =>
    getResolvedHotkey(id, hotkeys)
      ?.replace(/\bcmd\b/g, isMacOS() ? "meta" : "ctrl")
      .replace(/\bopt\b/g, "alt") || ""
  const options = {
    enabled: !mobile,
    enableOnFormTags: true,
    enableOnContentEditable: true,
    preventDefault: true,
  }
  useHotkeys(
    resolveKey("toggle-details"),
    () => panel.setOpen((open) => !open),
    options,
    [panel.setOpen],
  )
  useHotkeys(
    resolveKey("toggle-terminal"),
    () => setIsTerminalSidebarOpen((open) => !open),
    options,
    [setIsTerminalSidebarOpen],
  )
  useHotkeys(
    resolveKey("open-diff"),
    () => setIsDiffSidebarOpen((open) => !open),
    options,
    [setIsDiffSidebarOpen],
  )
  return {
    panel,
    isDiffSidebarOpen,
    setIsDiffSidebarOpen,
    isPlanSidebarOpen,
    setIsPlanSidebarOpen,
    isTerminalSidebarOpen,
    setIsTerminalSidebarOpen,
    fileViewerPath,
    setFileViewerPath,
  }
}
