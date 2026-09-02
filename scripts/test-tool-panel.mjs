import assert from "node:assert/strict"
import { build } from "esbuild"

const { outputFiles } = await build({
  entryPoints: ["src/renderer/features/details-sidebar/tool-panel-state.ts"],
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
})
const { EMPTY_TOOL_PANEL, reduceToolPanel, restoreToolPanel, fileTab } =
  await import(
    `data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString("base64")}`
  )
const open = (state, type) =>
  reduceToolPanel(state, { type: "open", tab: { id: type, type } })
let state = open(EMPTY_TOOL_PANEL, "terminal")
state = open(state, "diff")
assert.equal(state.activeId, "diff")
assert.equal(
  open(state, "terminal").tabs.length,
  2,
  "reopening a tool must not duplicate it",
)
assert.deepEqual(
  reduceToolPanel(state, { type: "select", id: null }),
  state,
  "the full launcher cannot replace content once tabs exist",
)
state = reduceToolPanel(state, { type: "close", id: "diff" })
assert.equal(
  state.activeId,
  "terminal",
  "closing the active tab selects a neighbor",
)
assert.deepEqual(
  reduceToolPanel(state, { type: "close", id: "terminal" }),
  EMPTY_TOOL_PANEL,
)
assert.equal(
  fileTab("C:\\Project\\Readme.md").id,
  fileTab("c:/project/readme.md").id,
)
assert.notEqual(
  fileTab("/project/Readme.md").id,
  fileTab("/project/readme.md").id,
)
const restored = restoreToolPanel({
  tabs: [
    null,
    { type: "mcp" },
    { type: "terminal", id: "bad" },
    { type: "terminal" },
    { type: "file", path: "relative.txt" },
    { type: "file", path: "/project/readme.md" },
  ],
  activeId: "missing",
})
assert.equal(
  restored.tabs.length,
  2,
  "invalid and duplicate persisted tabs are discarded",
)
assert.equal(
  restored.activeId,
  "terminal",
  "invalid selection falls back to a valid tab",
)
assert.equal(
  restoreToolPanel({ ...restored, activeId: null }).activeId,
  "terminal",
  "legacy launcher state falls back to an open tab",
)
for (const value of [null, undefined, false, [], "invalid", { tabs: null }])
  assert.deepEqual(restoreToolPanel(value), EMPTY_TOOL_PANEL)
let files = reduceToolPanel(EMPTY_TOOL_PANEL, {
  type: "open",
  tab: fileTab("C:\\project\\a.ts"),
})
files = reduceToolPanel(files, {
  type: "open",
  tab: fileTab("C:/project/b.ts"),
})
files = reduceToolPanel(files, {
  type: "open",
  tab: fileTab("c:/PROJECT/A.ts"),
})
assert.equal(files.tabs.length, 2)
assert.equal(files.activeId, "file:c:/project/a.ts")
assert.deepEqual(restoreToolPanel(JSON.parse(JSON.stringify(files))), files)

let terminals = reduceToolPanel(EMPTY_TOOL_PANEL, {
  type: "create-terminal",
  id: "terminal:first",
})
terminals = reduceToolPanel(terminals, {
  type: "create-terminal",
  id: "terminal:second",
})
assert.equal(
  terminals.tabs.length,
  2,
  "launcher creates independent terminal tabs",
)
assert.deepEqual(
  terminals.tabs.map((tab) => tab.number),
  [1, 2],
)
assert.equal(terminals.activeId, "terminal:second")
terminals = reduceToolPanel(terminals, {
  type: "set-terminal-position",
  id: "terminal:first",
  position: "bottom",
})
assert.equal(terminals.tabs[0].position, "bottom")
assert.equal(
  terminals.tabs[1].position,
  "side-peek",
  "moving one terminal must not move another terminal",
)
terminals = reduceToolPanel(terminals, { type: "select", id: "terminal:first" })
terminals = open(terminals, "diff")
terminals = reduceToolPanel(terminals, { type: "open-tool", tool: "terminal" })
assert.equal(
  terminals.activeId,
  "terminal:first",
  "shortcut returns to the last used terminal",
)
assert.equal(
  terminals.tabs.length,
  3,
  "shortcut does not create an extra terminal",
)
assert.deepEqual(
  restoreToolPanel(JSON.parse(JSON.stringify(terminals))),
  terminals,
)
terminals = reduceToolPanel(terminals, { type: "close", id: "terminal:first" })
assert.equal(terminals.lastTerminalId, "terminal:second")
assert.equal(terminals.tabs.filter((tab) => tab.type === "terminal").length, 1)
const legacyTerminal = restoreToolPanel({
  tabs: [{ id: "terminal", type: "terminal" }],
  activeId: "terminal",
})
assert.equal(
  legacyTerminal.lastTerminalId,
  "terminal",
  "legacy terminal identity survives migration",
)
console.log(
  "Tool panel state checks passed: tabs, launcher, closing, restore and file deduplication.",
)

const pathsBuild = await build({
  entryPoints: ["src/renderer/features/file-viewer/utils/file-utils.ts"],
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
})
const { resolveFilePath, relativeFilePath, getFileName } = await import(
  `data:text/javascript;base64,${Buffer.from(pathsBuild.outputFiles[0].text).toString("base64")}`
)
assert.equal(
  resolveFilePath("C:\\project", "C:\\project\\README.md"),
  "C:/project/README.md",
)
assert.equal(
  resolveFilePath("C:\\project", "images/logo.png"),
  "C:/project/images/logo.png",
)
assert.equal(
  resolveFilePath("C:\\project", "\\\\server\\share\\image.png"),
  "//server/share/image.png",
)
assert.equal(
  relativeFilePath("C:\\Project", "c:/project/README.md"),
  "README.md",
)
assert.equal(
  relativeFilePath("/project", "/project-other/file.ts"),
  "/project-other/file.ts",
)
assert.equal(getFileName("C:\\project\\README.md"), "README.md")
console.log(
  "File viewer path checks passed: Windows, UNC, relative paths and project boundaries.",
)

const scopeBuild = await build({
  entryPoints: ["src/renderer/features/terminal/utils.ts"],
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
})
const { getTerminalTabScopeKey } = await import(
  `data:text/javascript;base64,${Buffer.from(scopeBuild.outputFiles[0].text).toString("base64")}`
)
assert.equal(
  getTerminalTabScopeKey("path:C:/project", "terminal"),
  "path:C:/project",
)
assert.notEqual(
  getTerminalTabScopeKey("path:C:/project", "terminal:first"),
  getTerminalTabScopeKey("path:C:/project", "terminal:second"),
)
assert.notEqual(
  getTerminalTabScopeKey("ws:first", "terminal:first"),
  getTerminalTabScopeKey("ws:second", "terminal:first"),
)
console.log(
  "Multiple terminal checks passed: creation, activation, restore, close and session scope isolation.",
)
