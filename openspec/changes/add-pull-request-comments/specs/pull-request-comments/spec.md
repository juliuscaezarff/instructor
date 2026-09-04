## ADDED Requirements

### Requirement: Explicit pull request comment submission

The system SHALL let the user compose a pull request comment and SHALL publish it to GitHub only after an explicit send action, showing the destination repository, number, and title before that action is available.

#### Scenario: Compose a comment
- **WHEN** the user opens the comment composer for a pull request
- **THEN** the destination repository, pull request number, and title are visible above the composer
- **AND** no request is sent to GitHub until the user explicitly activates the send action

#### Scenario: Send with empty content
- **WHEN** the composer has no text
- **THEN** the send action remains disabled

### Requirement: Preserved draft on failure

The system SHALL keep the composed comment text available to the user when submission fails and SHALL distinguish a permission failure from other failures.

#### Scenario: Submission fails
- **WHEN** publishing a comment fails for any reason
- **THEN** the composer keeps the user's text unchanged
- **AND** an error is shown with an action to try again

#### Scenario: Permission denied
- **WHEN** the authenticated GitHub account lacks permission to comment on the pull request
- **THEN** the interface presents a distinct, actionable permission message rather than a generic failure

### Requirement: Duplicate submission prevention

The system SHALL prevent a single comment from being submitted more than once due to a repeated click or overlapping request while a submission is in progress.

#### Scenario: Double-activate the send action
- **WHEN** the user activates send again while a submission is already in progress
- **THEN** only one comment request is sent
- **AND** the send control is disabled until the in-progress submission finishes

### Requirement: Authentic post-submission activity

The system SHALL reflect a successfully published comment using data retrieved from GitHub rather than fabricated local content.

#### Scenario: Comment published successfully
- **WHEN** a comment is published successfully
- **THEN** the activity timeline is refreshed from GitHub to include the new comment
- **AND** the composer is cleared only after that refresh is requested

### Requirement: Bounded comment length

The system SHALL reject a comment that exceeds the configured maximum length before sending it, without silently truncating user-authored content.

#### Scenario: Comment exceeds the limit
- **WHEN** the composed text exceeds the configured maximum length
- **THEN** the interface blocks sending and explains the limit
- **AND** the full text the user typed remains in the composer for editing

### Requirement: Scoped comment authorization

The system SHALL treat the ability to comment on a pull request as authorizing only that action, and SHALL NOT use it to enable approving, requesting changes, merging, closing, reopening, or re-running checks.

#### Scenario: Comment action is available
- **WHEN** the comment composer is available for a pull request
- **THEN** no other GitHub mutation becomes available or is performed as a side effect of commenting
