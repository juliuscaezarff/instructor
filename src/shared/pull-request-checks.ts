const ACTIONS_RUN_URL_PATTERN = /\/actions\/runs\/(\d+)/

export function extractActionsRunId(url: string | undefined): string | null {
  if (!url) return null
  const match = url.match(ACTIONS_RUN_URL_PATTERN)
  return match ? match[1]! : null
}
