## ADDED Requirements

### Requirement: Detect relevant pull request events without extra API calls

The system SHALL detect merge, close, review, and failing-check transitions on the current user's own pull requests by comparing consecutive in-memory snapshots of already-fetched pull request data, without issuing additional GitHub API calls beyond the existing list fetch.

#### Scenario: Pull request merged or closed
- **WHEN** a pull request authored by the current user transitions from open to merged or closed between two snapshots
- **THEN** a desktop notification is triggered for that pull request

#### Scenario: Review received
- **WHEN** a pull request authored by the current user transitions its review state to approved or changes requested between two snapshots
- **THEN** a desktop notification is triggered for that pull request

#### Scenario: Checks start failing
- **WHEN** a pull request authored by the current user transitions its failing check count from zero to greater than zero between two snapshots
- **THEN** a desktop notification is triggered for that pull request

#### Scenario: No notification on first snapshot
- **WHEN** no previous snapshot exists yet (application just started)
- **THEN** no notification is triggered for the pull request state already present in the first snapshot

### Requirement: Background polling respects the notification preference

The system SHALL poll for pull request changes in the background, independent of which application view is active, only while desktop notifications are enabled, and SHALL NOT poll for this purpose when they are disabled.

#### Scenario: Notifications enabled
- **WHEN** desktop notifications are enabled
- **THEN** the background poll used for pull request notifications runs on a fixed interval regardless of the active view

#### Scenario: Notifications disabled
- **WHEN** desktop notifications are turned off
- **THEN** the background poll used for pull request notifications does not run

### Requirement: Notification click opens the pull request

The system SHALL let the user open the specific pull request referenced by a notification by clicking it.

#### Scenario: Click a notification
- **WHEN** the user clicks a pull request notification
- **THEN** the application window is focused, the Pull Requests view opens, and that pull request is selected

### Requirement: Unseen event badge

The system SHALL display a count of unseen pull request notification events on the application icon, and SHALL clear it when the user opens the Pull Requests view.

#### Scenario: Badge increments on a new event
- **WHEN** a pull request notification event is detected while the Pull Requests view is not open
- **THEN** the unseen event count shown on the application icon increases

#### Scenario: Badge clears on view
- **WHEN** the user opens the Pull Requests view after receiving notifications
- **THEN** the unseen event badge is cleared

### Requirement: No persistent notification history

The system SHALL NOT persist pull request notification event history across application restarts.

#### Scenario: Restart clears state
- **WHEN** the application restarts
- **THEN** previously detected events are not re-shown and are not available in any history view
