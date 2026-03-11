export function inferDocType(filename) {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.pdf')) return 'pdf'
  if (lower.endsWith('.epub')) return 'epub'
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'article'
  return 'file'
}

export function inferMime(filename) {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.pdf')) return 'application/pdf'
  if (lower.endsWith('.epub')) return 'application/epub+zip'
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'text/html'
  return 'application/octet-stream'
}

export function normalizeDocTitle(filename) {
  return filename.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim()
}

/** Extract text from a quote (handles both legacy string and new {text, createdAt} formats) */
export function quoteText(quote) {
  return typeof quote === 'string' ? quote : quote?.text || ''
}

/** Extract createdAt from a quote (returns null for legacy strings) */
export function quoteCreatedAt(quote) {
  return typeof quote === 'string' ? null : quote?.createdAt || null
}
