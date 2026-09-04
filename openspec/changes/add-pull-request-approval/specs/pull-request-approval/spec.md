## ADDED Requirements

### Requirement: Explicit pull request approval

The system SHALL let the user approve a pull request only after an explicit confirmation that shows the destination repository, number, and title, with an optional approval comment.

#### Scenario: Open the approval confirmation
- **WHEN** the user activates the approve action for an open or draft pull request
- **THEN** a confirmation surface shows the destination repository, number, and title
- **AND** no approval request is sent to GitHub until the user explicitly confirms

#### Scenario: Approval action unavailable
- **WHEN** the selected pull request is merged or closed
- **THEN** the approve action is not offered

### Requirement: Reused mutation error handling

The system SHALL classify approval failures using the same permission, authentication, and availability categories established for pull request comments, and SHALL NOT silently succeed when GitHub rejects the approval.

#### Scenario: Permission denied
- **WHEN** the authenticated GitHub account lacks permission to approve the pull request
- **THEN** the interface presents a distinct, actionable permission message rather than a generic failure

#### Scenario: GitHub rejects the approval for another reason
- **WHEN** GitHub rejects the approval for a reason other than missing permission
- **THEN** the interface shows the returned explanation without inventing a different reason
- **AND** the confirmation dialog remains open with any entered comment preserved

### Requirement: Authentic post-approval state

The system SHALL reflect a successful approval using data retrieved from GitHub rather than fabricated local content.

#### Scenario: Approval succeeds
- **WHEN** an approval is submitted successfully
- **THEN** the pull request summary, reviewer list, and aggregated list are refreshed from GitHub
- **AND** no review state is assumed or written locally before that refresh completes

### Requirement: Scoped approval authorization

The system SHALL treat the ability to approve a pull request as authorizing only that action, and SHALL NOT use it to enable requesting changes, merging, closing, reopening, or re-running checks.

#### Scenario: Approve action is available
- **WHEN** the approve action is available for a pull request
- **THEN** no other GitHub mutation becomes available or is performed as a side effect of approving
