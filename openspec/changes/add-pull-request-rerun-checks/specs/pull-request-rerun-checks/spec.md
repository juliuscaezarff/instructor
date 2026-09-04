## ADDED Requirements

### Requirement: Explicit re-run of failed checks

The system SHALL let the user re-run only the failed checks of a pull request after an explicit confirmation that lists which checks will be retried, and SHALL NOT re-run checks that already passed, are pending, or were skipped.

#### Scenario: Open the re-run confirmation
- **WHEN** the user activates the re-run action on an open or draft pull request with at least one failing check
- **THEN** a confirmation surface lists the checks that will be re-run before any request is sent to GitHub

#### Scenario: Re-run action unavailable
- **WHEN** the selected pull request has no failing checks, or is merged or closed
- **THEN** the re-run action is not offered

### Requirement: Bounded to GitHub Actions checks

The system SHALL re-run only failing checks that belong to a GitHub Actions run, and SHALL identify checks it cannot re-run instead of silently ignoring or misreporting them.

#### Scenario: Some failing checks are not GitHub Actions
- **WHEN** a failing check does not belong to a GitHub Actions run
- **THEN** the confirmation surface identifies it as not re-runnable from Instructor, separate from the checks that will be retried

#### Scenario: No failing check is re-runnable
- **WHEN** every failing check is unsupported
- **THEN** the confirm action is disabled

### Requirement: Aggregated re-run outcome

The system SHALL report how many distinct GitHub Actions runs were re-run, how many checks were skipped as unsupported, and how many re-run attempts failed, rather than treating the whole operation as a single success or failure.

#### Scenario: Partial success
- **WHEN** at least one run is re-run successfully and another re-run attempt fails
- **THEN** the interface reports the successful and failed portions distinctly rather than showing a single generic outcome

#### Scenario: Total failure
- **WHEN** every attempted re-run fails
- **THEN** the interface presents this as a failure with the returned explanation, distinguishing a permission failure from a generic one

### Requirement: Reused mutation error handling

The system SHALL classify re-run failures using the same permission, authentication, and availability categories established for pull request comments, approvals, and requested changes.

#### Scenario: Permission denied
- **WHEN** the authenticated GitHub account lacks permission to re-run checks on the pull request
- **THEN** the interface presents a distinct, actionable permission message rather than a generic failure

### Requirement: Scoped re-run authorization

The system SHALL treat the ability to re-run failed checks as authorizing only that action, and SHALL NOT use it to enable commenting, approving, requesting changes, merging, closing, or reopening.

#### Scenario: Re-run action is available
- **WHEN** the re-run action is available for a pull request
- **THEN** no other GitHub mutation becomes available or is performed as a side effect of re-running checks
