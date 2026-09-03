import { atom } from "jotai"
import { atomFamily, atomWithStorage } from "jotai/utils"
import { atomWithWindowStorage } from "../../../lib/window-storage"

// Details sidebar open state (per-window, persisted)
export const detailsSidebarOpenAtom = atomWithWindowStorage<boolean>(
  "overview:sidebarOpen",
  false,
  { getOnInit: true },
)

// Unified sidebar width (persisted)
export const detailsSidebarWidthAtom = atomWithStorage<number>(
  "overview:sidebarWidth",
  500,
  undefined,
  { getOnInit: true },
)

// ============================================================================
// Plan Content Cache (per workspace) - prevents flashing loading states
// ============================================================================

export interface PlanContentCache {
  content: string
  planPath: string
  // Track if content is ready (file loaded successfully)
  isReady: boolean
}

// Runtime cache for plan content per workspace (not persisted)
const planContentCacheStorageAtom = atom<Record<string, PlanContentCache | null>>({})

export const planContentCacheAtomFamily = atomFamily((chatId: string) =>
  atom(
    (get) => get(planContentCacheStorageAtom)[chatId] ?? null,
    (get, set, cache: PlanContentCache | null) => {
      const current = get(planContentCacheStorageAtom)
      set(planContentCacheStorageAtom, {
        ...current,
        [chatId]: cache,
      })
    },
  ),
)

// ============================================================================
// File Tree Expanded Paths (per worktree, persisted across reloads)
// ============================================================================

const fileTreeExpandedStorageAtom = atomWithStorage<
  Record<string, string[]>
>("overview:fileTreeExpanded", {}, undefined, { getOnInit: true })

/** null sentinel: first mount for this worktree (no user action yet → auto-expand roots) */
export const fileTreeExpandedAtomFamily = atomFamily((worktreePath: string) =>
  atom(
    (get): string[] | null => {
      const stored = get(fileTreeExpandedStorageAtom)[worktreePath]
      return stored ?? null // null = never initialised
    },
    (get, set, paths: string[]) => {
      const current = get(fileTreeExpandedStorageAtom)
      set(fileTreeExpandedStorageAtom, {
        ...current,
        [worktreePath]: paths,
      })
    },
  ),
)
