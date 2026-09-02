# Verification

## Automated checks

- `node scripts/test-tool-panel.mjs`: passed. Covers deduplication, launcher selection, closing and neighbor selection, invalid persisted data, restoration, independent file tabs, Windows/UNC paths and project path boundaries.
- Production build (`electron-vite build`): passed. Existing warnings about bundle size, dynamic imports and outdated Browserslist data remain.
- TypeScript: 108 diagnostics before and after the change; no new diagnostics after comparing messages with line numbers removed. The repository does not currently pass a clean type check.
- `git diff --check`: passed (only local LF/CRLF conversion notices).

## Browser checks

Used an isolated localhost harness with the production `ToolPanel`, persistence atoms and `useToolPanelRouting`. Tool bodies were test content, not Electron services.

- Six launcher options, no MCP Servers entry; opening existing singleton tools reuses their tabs. Each Terminal choice creates an independent numbered tab.
- With no tabs, the full launcher is shown. After the first tab, `+` opens an anchored tool dropdown while preserving the active tab; persisted legacy launcher states fall back to an existing tab.
- Switching with mouse and arrow keys, closing active/last tabs and restoring focus to a neighbor or `+`.
- Existing Ctrl+J terminal shortcut opens/closes its tab.
- Opening files through external request atoms; terminal and diff transfers between lateral and existing non-lateral modes.
- Tab restoration after reload and separate state for two workspace IDs. Window isolation uses the existing `atomWithWindowStorage` implementation; multiple Electron windows were not opened.
- Content remains mounted when switching tabs and collapsing/reopening the panel.
- Long file names at a 350px panel width; the active tab scrolls into view. The add button follows the last tab with a 4px gap and scrolls with the strip; only collapse remains fixed. Verified the add button stays visible when the final tab is selected at this width.
- Local-only launcher options are disabled with an explanation in the remote fixture.
- No browser console errors during these checks.

## Integration review and limits

- Legacy Terminal retains its original scope. New terminal tabs derive distinct, stable subscopes from their persisted tab IDs, retaining session controls and backend detach behavior. Switching tabs/collapsing keeps visited content mounted; closing a tool tab does not explicitly kill sessions.
- Plan approval, subchat-derived plan/tasks, Changes selection/commit callbacks and file opening entry points remain connected to their existing implementations.
- MCP settings/backend were not changed. Obsolete widget containers and configuration were removed.
- Real terminal process continuity, Git operations, plan approval, every file entry point, 200% desktop zoom and remote backend behavior still require an Electron smoke test. No commit, push or external backend operation was executed as part of UI validation.

## Multiple-terminal follow-up

- State tests cover creating Terminal 1/2, selecting the last used terminal through a shortcut, restoring both IDs/numbers, preserving the legacy tab, closing one without removing the other, and distinct session scope keys.
- Browser harness confirmed two terminal tabs with independent test content, content retention when switching, Ctrl+J reactivation without duplicates, side/bottom routing back to the same tab, reload restoration and individual closing. No console errors were reported.
- The harness does not run real PTY processes; process-level validation remains an Electron smoke-test item.
- Per-tab position tests cover moving Terminal 1 to bottom while Terminal 2 remains side-peek. The browser harness displayed both regions simultaneously and preserved separate draft content while switching and closing tabs. Production build passed with no new TypeScript diagnostics.

## Tool dropdown follow-up

- State checks confirm that a persisted `activeId: null` cannot reopen the full launcher while tabs exist; it falls back to a valid tab.
- Browser harness confirmed the full launcher only with zero tabs. After Workspace was opened, `+` exposed all six tools as an accessible menu while Workspace stayed selected and its draft content remained mounted.
- Selecting To-dos from the menu created/selected its tab. Dismissing the next menu with Escape kept To-dos active, preserved its draft content and returned focus to `+`. No console errors were reported.
- At the 350px minimum panel width with multiple tabs, the dropdown aligns toward the panel interior and retained a measured 40px gap from the right panel/window edge. Collision padding is set to 12px for smaller viewports.

## Narrow tab-strip follow-up

- At the minimum panel width (349px measured after browser pixel rounding), three open tabs compressed evenly to 87px before overflow. All three tab bounds remained inside the 301px scroll strip, including the first tab.
- The strip measured `scrollLeft: 0` and equal `scrollWidth`/`clientWidth` (301px), confirming that selecting the last tab no longer leaves the first tab hidden when all tabs can fit through title truncation.
