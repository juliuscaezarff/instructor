## ADDED Requirements

### Requirement: Explicit merge with a chosen method

The system SHALL let the user merge an open, non-draft pull request only after an explicit confirmation naming the destination and the merge method, and SHALL require an explicit method choice whenever the repository allows more than one.

#### Scenario: Open the merge confirmation with one allowed method
- **WHEN** the user activates the merge action and the repository allows exactly one merge method
- **THEN** the confirmation surface shows the destination and that method without requiring further selection

#### Scenario: Open the merge confirmation with multiple allowed methods
- **WHEN** the repository allows more than one merge method
- **THEN** the confirmation surface requires the user to explicitly choose one before the confirm action is available

#### Scenario: Merge action unavailable
- **WHEN** the selected pull request is a draft, already closed, or already merged
- **THEN** the merge action is not offered

### Requirement: Preventive block on known-failing merge state

The system SHALL disable the merge confirmation with an explanation when the pull request's merge state is already known to block merging, instead of attempting a call that would fail.

#### Scenario: Merge conflicts present
- **WHEN** the pull request's merge state indicates unresolved conflicts
- **THEN** the confirm action is disabled with an explanation that conflicts must be resolved first

#### Scenario: Required checks or reviews unmet
- **WHEN** the pull request's merge state indicates required checks or reviews are not satisfied
- **THEN** the confirm action is disabled with an explanation, and the system does not offer a way to bypass that restriction

### Requirement: No restriction bypass

The system SHALL NOT use administrative privileges to bypass branch protection, required checks, or required reviews when merging.

#### Scenario: GitHub rejects the merge due to protection rules
- **WHEN** GitHub rejects a merge attempt because of branch protection
- **THEN** the interface shows the returned explanation without retrying with elevated privileges

### Requirement: Reused mutation error handling

The system SHALL classify merge failures using the same permission, authentication, and availability categories established for the other pull request mutations.

#### Scenario: Permission denied
- **WHEN** the authenticated GitHub account lacks permission to merge the pull request
- **THEN** the interface presents a distinct, actionable permission message rather than a generic failure

### Requirement: Authentic post-merge state

The system SHALL reflect a successful merge using data retrieved from GitHub rather than fabricated local content.

#### Scenario: Merge succeeds
- **WHEN** a pull request is merged successfully
- **THEN** the pull request summary and aggregated list are refreshed from GitHub to reflect the merged state
- **AND** no state is assumed or written locally before that refresh completes

### Requirement: Scoped merge authorization

The system SHALL treat the ability to merge a pull request as authorizing only that action, and SHALL NOT use it to enable closing, reopening, commenting, approving, requesting changes, or re-running checks.

#### Scenario: Merge action is available
- **WHEN** the merge action is available for a pull request
- **THEN** no other GitHub mutation becomes available or is performed as a side effect of merging
