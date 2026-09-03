## ADDED Requirements

### Requirement: Progressive pull request detail

The system SHALL divide the selected pull request detail into summary, changed-files, and activity contexts without fetching every context when the panel opens.

#### Scenario: Open a pull request detail
- **WHEN** the user selects a pull request
- **THEN** the summary context is displayed first
- **AND** activity and file patches are not fetched solely because the detail panel opened

#### Scenario: Change detail context
- **WHEN** the user activates another detail context
- **THEN** the selected context becomes visible without losing the pull request selection
- **AND** the context control remains operable by keyboard with a visible focus indicator

### Requirement: Changed file inspection

The system SHALL list changed files and SHALL load patch content only for the file the user chooses to inspect.

#### Scenario: Open the files context
- **WHEN** the user opens the changed-files context
- **THEN** each available file identifies its path, change status, additions, and deletions
- **AND** patches for unselected files are not requested

#### Scenario: Inspect a changed file
- **WHEN** the user selects a changed file
- **THEN** the system displays its unified diff with old and new line numbers when available
- **AND** the remaining detail content stays usable while the patch loads

#### Scenario: Patch cannot be rendered completely
- **WHEN** a patch is binary, unavailable, or exceeds a configured safety limit
- **THEN** the interface explains the condition without presenting fabricated source content
- **AND** retains an action to open the canonical pull request on GitHub

### Requirement: Read-only pull request activity

The system SHALL present available commits, comments, and reviews as a chronological, read-only activity timeline.

#### Scenario: Load activity on demand
- **WHEN** the user opens the activity context for the first time
- **THEN** the system fetches the supported activity types for the selected pull request
- **AND** identifies each event by type, author, and time when those values are available

#### Scenario: Activity is empty or partially unavailable
- **WHEN** no supported activity exists or one activity source fails
- **THEN** the interface distinguishes an empty timeline from a partial loading failure
- **AND** keeps other successfully loaded detail contexts available

### Requirement: Bounded detail performance

The system SHALL bound remote work and rendered content for pull request activity and file patches while keeping previously loaded content stable during refreshes.

#### Scenario: Inspect a large pull request
- **WHEN** activity or a patch exceeds its configured item, byte, or line limit
- **THEN** the system returns a bounded result and marks it as incomplete
- **AND** does not block the main pull request list

#### Scenario: Revisit loaded detail content
- **WHEN** the user returns to a recently loaded context within its cache lifetime
- **THEN** cached content remains readable while any permitted refresh occurs
- **AND** duplicate requests for the same pull request context are avoided

### Requirement: Safe read-only rendering

The system SHALL treat GitHub descriptions, comments, paths, and diff content as untrusted data and SHALL not execute embedded markup or commands.

#### Scenario: Remote content contains executable markup
- **WHEN** a pull request field contains HTML, script-like text, or command syntax
- **THEN** the interface renders it as sanitized Markdown or inert text according to context
- **AND** no remote content gains application execution privileges
