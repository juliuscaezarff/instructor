## ADDED Requirements

### Requirement: Explicit pull request reopening

The system SHALL let the user reopen a closed pull request only after an explicit confirmation that shows the destination repository, number, and title, with an optional comment.

#### Scenario: Open the reopen confirmation
- **WHEN** the user activates the reopen action for a closed pull request
- **THEN** a confirmation surface shows the destination repository, number, and title with an optional comment field
- **AND** no request is sent to GitHub until the user explicitly confirms

#### Scenario: Reopen action unavailable
- **WHEN** the selected pull request is open, draft, or merged
- **THEN** the reopen action is not offered

### Requirement: Reused mutation error handling

The system SHALL classify reopen failures using the same permission, authentication, and availability categories established for pull request comments, approvals, and requested changes.

#### Scenario: Permission denied
- **WHEN** the authenticated GitHub account lacks permission to reopen the pull request
- **THEN** the interface presents a distinct, actionable permission message rather than a generic failure

#### Scenario: GitHub rejects the reopen for another reason
- **WHEN** GitHub rejects the reopen for a reason other than missing permission
- **THEN** the interface shows the returned explanation without inventing a different reason
- **AND** the confirmation dialog remains open with any entered comment preserved

### Requirement: Authentic post-reopen state

The system SHALL reflect a successful reopen using data retrieved from GitHub rather than fabricated local content.

#### Scenario: Reopen succeeds
- **WHEN** a pull request is reopened successfully
- **THEN** the pull request summary and aggregated list are refreshed from GitHub
- **AND** no state is assumed or written locally before that refresh completes

### Requirement: Scoped reopen authorization

The system SHALL treat the ability to reopen a pull request as authorizing only that action, and SHALL NOT use it to enable closing, merging, commenting, approving, requesting changes, or re-running checks.

#### Scenario: Reopen action is available
- **WHEN** the reopen action is available for a pull request
- **THEN** no other GitHub mutation becomes available or is performed as a side effect of reopening
