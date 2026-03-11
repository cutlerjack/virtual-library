export function tokenizeFtsQuery(query) {
  const normalized = String(query || '').toLowerCase()
  const tokens = normalized.match(/[a-z0-9]+/g) || []
  const unique = Array.from(new Set(tokens))
  return unique.slice(0, 12)
}

export function toFtsExpression(query) {
  const tokens = tokenizeFtsQuery(query)
  if (tokens.length === 0) return null
  return tokens.map((token) => `${token}*`).join(' ')
}

export function escapeLikeValue(value) {
  return String(value || '')
    .toLowerCase()
    .replaceAll('\\', '\\\\')
    .replaceAll('%', '\\%')
    .replaceAll('_', '\\_')
}
