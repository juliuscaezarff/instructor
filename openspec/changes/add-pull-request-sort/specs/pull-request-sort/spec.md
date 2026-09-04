## ADDED Requirements

### Requirement: Configurable pull request sort order

The system SHALL let the user choose the sort order of the aggregated pull request list from a supported set of criteria, and SHALL always indicate the active criterion.

#### Scenario: Change the sort criterion
- **WHEN** the user selects a different sort criterion
- **THEN** the aggregated list reloads ordered by that criterion
- **AND** the active criterion remains visibly indicated

#### Scenario: Reopen the center
- **WHEN** the user leaves and later reopens the center
- **THEN** the previously chosen sort criterion is restored

### Requirement: Sort consistent with pagination

The system SHALL restart pagination when the sort criterion changes, and SHALL keep "load more" consistent with the currently active criterion.

#### Scenario: Change sort while more pages are available
- **WHEN** the user changes the sort criterion after having loaded additional pages
- **THEN** the list reloads from the first page under the new criterion
- **AND** subsequent "load more" actions continue paginating under that same criterion
