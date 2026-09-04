## ADDED Requirements

### Requirement: Explicit request for changes

The system SHALL let the user submit a "request changes" review only after an explicit confirmation that shows the destination repository, number, and title, and SHALL require a non-empty justification.

#### Scenario: Open the request-changes confirmation
- **WHEN** the user activates the request-changes action for an open or draft pull request
- **THEN** a confirmation surface shows the destination repository, number, and title with a justification field
- **AND** no request is sent to GitHub until the user explicitly confirms

#### Scenario: Justification is empty
- **WHEN** the justification field has no text
- **THEN** the confirm action remains disabled

#### Scenario: Request-changes action unavailable
- **WHEN** the selected pull request is merged or closed
- **THEN** the request-changes action is not offered

### Requirement: Reused mutation error handling

The system SHALL classify request-changes failures using the same permission, authentication, and availability categories established for pull request comments and approvals.

#### Scenario: Permission denied
- **WHEN** the authenticated GitHub account lacks permission to review the pull request
- **THEN** the interface presents a distinct, actionable permission message rather than a generic failure

#### Scenario: GitHub rejects the request for another reason
- **WHEN** GitHub rejects the request for a reason other than missing permission
- **THEN** the interface shows the returned explanation without inventing a different reason
- **AND** the confirmation dialog remains open with the entered justification preserved

### Requirement: Authentic post-submission state

The system SHALL reflect a successful request-changes review using data retrieved from GitHub rather than fabricated local content.

#### Scenario: Request submitted successfully
- **WHEN** a request-changes review is submitted successfully
- **THEN** the pull request summary, reviewer list, and aggregated list are refreshed from GitHub
- **AND** no review state is assumed or written locally before that refresh completes

### Requirement: Scoped request-changes authorization

The system SHALL treat the ability to request changes on a pull request as authorizing only that action, and SHALL NOT use it to enable approving, merging, closing, reopening, or re-running checks.

#### Scenario: Request-changes action is available
- **WHEN** the request-changes action is available for a pull request
- **THEN** no other GitHub mutation becomes available or is performed as a side effect of requesting changes
