export interface CommandSearchItem {
  id: string
  label: string
  keywords: readonly string[]
}

export function normalizeCommandText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .trim()
}

function getMatchScore(item: CommandSearchItem, normalizedQuery: string): number {
  const label = normalizeCommandText(item.label)
  const keywords = item.keywords.map(normalizeCommandText)
  const haystack = [label, ...keywords].join(" ")
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean)

  if (!tokens.every((token) => haystack.includes(token))) return Number.POSITIVE_INFINITY
  if (label === normalizedQuery) return 0
  if (label.startsWith(normalizedQuery)) return 1
  if (label.split(/\s+/).some((word) => word.startsWith(normalizedQuery))) return 2
  if (label.includes(normalizedQuery)) return 3
  if (keywords.some((keyword) => keyword.startsWith(normalizedQuery))) return 4
  return 5
}

export function rankCommandItems<T extends CommandSearchItem>(
  items: readonly T[],
  query: string,
  limit: number,
): T[] {
  const normalizedQuery = normalizeCommandText(query)
  if (!normalizedQuery) return items.slice(0, limit)

  return items
    .map((item, index) => ({
      item,
      index,
      score: getMatchScore(item, normalizedQuery),
    }))
    .filter(({ score }) => Number.isFinite(score))
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .slice(0, limit)
    .map(({ item }) => item)
}
