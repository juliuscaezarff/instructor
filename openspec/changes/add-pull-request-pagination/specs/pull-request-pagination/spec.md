## ADDED Requirements

### Requirement: Load pull requests beyond the first page

The system SHALL let the user load additional pull requests beyond the first page per repository, on demand, without discarding pull requests already loaded.

#### Scenario: More results are available
- **WHEN** at least one configured repository has more pull requests than the loaded page
- **THEN** a control to load more is offered
- **AND** activating it fetches only the next page from repositories that still have more, appending to the existing list

#### Scenario: All repositories are exhausted
- **WHEN** every configured repository has no further pages
- **THEN** the control to load more is not offered

### Requirement: Duplicate-free pagination

The system SHALL NOT show the same pull request more than once as additional pages are loaded.

#### Scenario: Load more after a refresh
- **WHEN** the user loads more pages after the list has been refreshed
- **THEN** the aggregated list contains each pull request at most once

### Requirement: Isolated pagination failure

The system SHALL treat a failure while loading an additional page from one repository as recoverable, without discarding pull requests already loaded from that or other repositories.

#### Scenario: Loading more fails for one repository
- **WHEN** fetching the next page from a repository fails
- **THEN** the pull requests already loaded remain visible
- **AND** the interface offers to retry loading more
