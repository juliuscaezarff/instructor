## ADDED Requirements

### Requirement: Combinable pull request filters

The system SHALL let the user filter the aggregated pull request list by author, reviewer, check state, and linked agent, and SHALL apply active filters in combination.

#### Scenario: Apply a single filter
- **WHEN** the user sets a value for author, reviewer, or check state
- **THEN** the aggregated list shows only pull requests matching that value

#### Scenario: Combine multiple filters
- **WHEN** the user has more than one filter active at once
- **THEN** the aggregated list shows only pull requests matching all active filters

### Requirement: Reviewer filter means already reviewed

The system SHALL interpret the reviewer filter as pull requests the chosen person has already reviewed, not pull requests where their review is only requested.

#### Scenario: Filter by reviewer
- **WHEN** the user sets a reviewer filter to a specific person
- **THEN** the list shows pull requests that person has left a review on

### Requirement: Agent filter uses only explicit links

The system SHALL filter by linked agent using only existing explicit pull-request-to-workspace links, and SHALL NOT infer AI authorship from pull request content or heuristics.

#### Scenario: Filter by linked agent
- **WHEN** the user filters by a specific agent provider or by "no agent"
- **THEN** only pull requests with a matching explicit workspace link (or lacking one) are shown

### Requirement: Visible and clearable active filters

The system SHALL display each active filter and SHALL let the user clear filters individually or all at once.

#### Scenario: Clear one filter
- **WHEN** the user removes a single active filter
- **THEN** the list updates to reflect the remaining active filters

#### Scenario: Clear all filters
- **WHEN** the user clears all active filters
- **THEN** the list returns to its unfiltered state

### Requirement: Filters consistent with pagination

The system SHALL restart pagination when a search-backed filter (author, reviewer, or check state) changes, and SHALL keep "load more" consistent with the currently active filters.

#### Scenario: Change a search-backed filter while more pages are available
- **WHEN** the user changes the author, reviewer, or check state filter after having loaded additional pages
- **THEN** the list reloads from the first page under the new filter combination

#### Scenario: Load more while the agent filter is active
- **WHEN** the agent filter is active and more pages remain on the server
- **THEN** "load more" remains available regardless of how many currently loaded pull requests match the agent filter
