## ADDED Requirements

### Requirement: Explicit pull request closing

The system SHALL let the user close an open or draft pull request only after an explicit confirmation that shows the destination repository, number, and title, with an optional comment.

#### Scenario: Open the close confirmation
- **WHEN** the user activates the close action for an open or draft pull request
- **THEN** a confirmation surface shows the destination repository, number, and title with an optional comment field
- **AND** no request is sent to GitHub until the user explicitly confirms

#### Scenario: Close action unavailable
- **WHEN** the selected pull request is already closed or merged
- **THEN** the close action is not offered

### Requirement: Reused mutation error handling

The system SHALL classify close failures using the same permission, authentication, and availability categories established for the other pull request mutations.

#### Scenario: Permission denied
- **WHEN** the authenticated GitHub account lacks permission to close the pull request
- **THEN** the interface presents a distinct, actionable permission message rather than a generic failure

#### Scenario: GitHub rejects the close for another reason
- **WHEN** GitHub rejects the close for a reason other than missing permission
- **THEN** the interface shows the returned explanation without inventing a different reason
- **AND** the confirmation dialog remains open with any entered comment preserved

### Requirement: Authentic post-close state

The system SHALL reflect a successful close using data retrieved from GitHub rather than fabricated local content.

#### Scenario: Close succeeds
- **WHEN** a pull request is closed successfully
- **THEN** the pull request summary and aggregated list are refreshed from GitHub
- **AND** no state is assumed or written locally before that refresh completes

### Requirement: Scoped close authorization

The system SHALL treat the ability to close a pull request as authorizing only that action, and SHALL NOT use it to enable reopening, merging, commenting, approving, requesting changes, or re-running checks.

#### Scenario: Close action is available
- **WHEN** the close action is available for a pull request
- **THEN** no other GitHub mutation becomes available or is performed as a side effect of closing
