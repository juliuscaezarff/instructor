## ADDED Requirements

### Requirement: Tool launcher in the right panel
The desktop application SHALL replace the Details/Files widget interface with a resizable right panel offering Workspace, To-dos, Plan, Terminal, Changes and Files. It SHALL NOT offer MCP Servers in this panel or modify MCP configuration elsewhere.

#### Scenario: Open a panel without tabs
- **WHEN** the user opens the panel and no tool tabs are open
- **THEN** the panel displays the tool launcher instead of stacked widgets
- **AND** existing keyboard shortcuts are displayed where applicable.

#### Scenario: Request an unavailable local tool
- **WHEN** the active workspace does not support a local tool
- **THEN** the launcher explains the restriction and prevents unsupported local operations.

### Requirement: Independent tool tabs
The panel SHALL allow users to open, select and close tool tabs without changing chat tabs. Selecting an already open singleton tool SHALL activate its existing tab. When tabs exist, a plus control SHALL expose the tool choices in a dropdown without replacing or hiding the active tab.

#### Scenario: Open the tool dropdown after the first tab
- **WHEN** at least one tool tab exists and the user activates the plus control
- **THEN** a dropdown displays the available tools anchored to the plus control
- **AND** the active tab and its content remain selected and visible behind the dropdown
- **AND** dismissing the dropdown does not change the active tab.

#### Scenario: Open multiple tools
- **WHEN** the user opens Workspace and then Terminal
- **THEN** both tabs remain open and Terminal becomes active in the same right panel.

#### Scenario: Create multiple terminals
- **WHEN** the user chooses Terminal from the launcher more than once
- **THEN** each choice creates a distinct numbered terminal tab with its own session scope
- **AND** selecting an existing terminal tab preserves its session instead of creating another
- **AND** the terminal shortcut reactivates the last used terminal tab without creating a duplicate
- **AND** closing one terminal tab leaves the other terminal tabs intact.

#### Scenario: Place terminals in different regions
- **WHEN** the user moves one terminal tab to the bottom panel and keeps another terminal tab in the sidebar
- **THEN** both terminals remain rendered simultaneously in their selected regions
- **AND** each terminal retains its own session, working directory and content
- **AND** moving or closing either terminal does not change the other terminal's position.

#### Scenario: Close the active or last tab
- **WHEN** the user closes the active tab
- **THEN** the adjacent remaining tab becomes active
- **AND** closing the last tab returns to the launcher without collapsing the panel.

### Requirement: Context and session preservation
Open tabs and active selection SHALL be isolated and restored per application window and workspace. Switching tabs or collapsing the panel SHALL NOT terminate terminal sessions. Plan and To-dos SHALL reflect the active subchat.

#### Scenario: Switch tools while a terminal is running
- **WHEN** the user switches from Terminal to Changes and back
- **THEN** the original terminal session and working directory remain available without a duplicate session.

#### Scenario: Change workspace or subchat
- **WHEN** the user changes workspace
- **THEN** the destination workspace's tool tabs are restored without exposing the previous workspace's files or terminal as its own
- **AND** changing subchat updates Plan and To-dos to that subchat, including explicit empty states.

### Requirement: Files open in distinct tabs
The panel SHALL provide file browsing and open selected files in tabs keyed by normalized absolute path within the current workspace context. Existing supported viewer types and errors SHALL remain available.

#### Scenario: Open and revisit a file
- **WHEN** the user opens two distinct files through existing file entry points
- **THEN** each file has its own panel tab
- **AND** reopening the same normalized path activates the existing tab instead of creating a duplicate.

### Requirement: Unified lateral entry points
Existing tool buttons, file links and shortcuts that request a lateral presentation SHALL open or activate the corresponding panel tab instead of a competing sidebar. Existing tool actions and non-lateral presentation modes SHALL remain functional without duplicate active rendering of the same content.

#### Scenario: Open a diff or plan from the chat
- **WHEN** the user requests a lateral diff review or plan view from an existing action
- **THEN** the corresponding panel tab opens with the requested context
- **AND** existing review, commit and plan approval actions remain available subject to their current permissions.

### Requirement: Safe layout preference migration
The new panel SHALL preserve existing width and open-state preferences, use validated new tab persistence, and ignore retired widget visibility, ordering and MCP panel entries. Legacy layout preferences SHALL NOT restore the old widget interface.

#### Scenario: First launch after migration
- **WHEN** a workspace has old widget preferences but no new tab state
- **THEN** the panel starts at the launcher when opened
- **AND** configured MCP servers, terminal sessions and workspace data remain unchanged.

### Requirement: Accessible panel navigation
The panel SHALL expose named keyboard-operable controls, accessible tab semantics, visible focus, and deterministic focus restoration. The tab strip SHALL preserve access to open, close and collapse controls when titles overflow.

#### Scenario: Navigate and close tabs with the keyboard
- **WHEN** the user navigates tabs and activates a close control using the keyboard
- **THEN** selection and focus move to a remaining tab or the launcher
- **AND** hidden tab content is excluded from keyboard navigation.
