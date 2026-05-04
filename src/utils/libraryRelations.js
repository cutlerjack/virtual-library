const STOP_WORDS = new Set([
  'a', 'an', 'and', 'the', 'of', 'for', 'to', 'in', 'on', 'with', 'at', 'by', 'from',
  'volume', 'edition', 'notes', 'essay', 'paper', 'study', 'report',
])

const MIN_SUGGESTION_SCORE = 5
const MIN_AUTO_LINK_SCORE = 10
const MIN_AUTO_LINK_GAP = 2

function stripFileExtension(value) {
  return String(value || '').replace(/\.[a-z0-9]{2,5}$/i, '')
}

function normalizeRelationText(value) {
  return stripFileExtension(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function compactRelationText(value) {
  return normalizeRelationText(value).replace(/\s+/g, '')
}

function tokenizeRelationText(value) {
  return normalizeRelationText(value)
    .split(' ')
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
}

function normalizeIsbn(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^0-9X]/g, '')
}

function getDocumentTitleText(doc = {}) {
  return [
    doc.title,
    doc.originalName,
    doc.fileName,
  ].filter(Boolean).join(' ')
}

function getDocumentCorpus(doc = {}) {
  return [
    doc.title,
    doc.originalName,
    doc.fileName,
    doc.author,
    doc.searchText ? String(doc.searchText).slice(0, 600) : null,
  ].filter(Boolean).join(' ')
}

function countSharedTokens(leftTokens, rightTokens) {
  const right = new Set(rightTokens)
  let count = 0
  leftTokens.forEach((token) => {
    if (right.has(token)) count += 1
  })
  return count
}

function getDismissedBookIds(doc = {}) {
  return new Set((doc.dismissedBookIds || []).filter(Boolean))
}

export function scoreBookDocumentMatch(book, doc) {
  if (!book?.id || !doc?.id) return null

  const reasons = []
  let score = 0

  const bookTitle = normalizeRelationText(book.title)
  const docTitle = normalizeRelationText(getDocumentTitleText(doc))
  const bookTitleTokens = tokenizeRelationText(book.title)
  const docTitleTokens = tokenizeRelationText(getDocumentTitleText(doc))
  const sharedTitleTokens = countSharedTokens(bookTitleTokens, docTitleTokens)
  const sharedTitleRatio = bookTitleTokens.length > 0
    ? sharedTitleTokens / bookTitleTokens.length
    : 0

  if (bookTitle && docTitle && bookTitle === docTitle) {
    score += 8
    reasons.push('Exact title match')
  } else if (
    bookTitle
    && docTitle
    && Math.min(bookTitle.length, docTitle.length) >= 8
    && (docTitle.includes(bookTitle) || bookTitle.includes(docTitle))
  ) {
    score += 6
    reasons.push('Close title match')
  } else if (sharedTitleTokens >= 3 || (sharedTitleTokens >= 2 && sharedTitleRatio >= 0.6)) {
    score += 4
    reasons.push('Key title words overlap')
  }

  const bookAuthor = normalizeRelationText(book.author)
  const docAuthor = normalizeRelationText(doc.author)
  const docCorpus = normalizeRelationText(getDocumentCorpus(doc))

  if (
    bookAuthor
    && (
      docAuthor === bookAuthor
      || docCorpus.includes(bookAuthor)
      || compactRelationText(doc.author).includes(compactRelationText(book.author))
    )
  ) {
    score += 4
    reasons.push('Author matches')
  }

  const bookIsbn = normalizeIsbn(book.isbn)
  const docIsbnCorpus = normalizeIsbn(getDocumentCorpus(doc))
  if (bookIsbn && docIsbnCorpus.includes(bookIsbn)) {
    score += 10
    reasons.push('ISBN appears in the document')
  }

  if (sharedTitleTokens >= 2 && reasons.includes('Author matches')) {
    score += 2
  }

  return {
    book,
    doc,
    score,
    reasons: reasons.slice(0, 2),
  }
}

export function suggestBooksForDocument(doc, books = [], options = {}) {
  const limit = options.limit ?? 3
  const minScore = options.minScore ?? MIN_SUGGESTION_SCORE
  const includeDismissed = options.includeDismissed === true
  const dismissedBookIds = getDismissedBookIds(doc)
  return books
    .map((book) => scoreBookDocumentMatch(book, doc))
    .filter((match) => match && match.score >= minScore)
    .filter((match) => includeDismissed || !dismissedBookIds.has(match.book.id))
    .sort((left, right) => (
      right.score - left.score
      || (left.book.title || '').localeCompare(right.book.title || '')
    ))
    .slice(0, limit)
}

export function suggestDocumentsForBook(book, documents = [], options = {}) {
  const limit = options.limit ?? 4
  const minScore = options.minScore ?? MIN_SUGGESTION_SCORE
  const includeDismissed = options.includeDismissed === true
  return documents
    .map((doc) => scoreBookDocumentMatch(book, doc))
    .filter((match) => match && match.score >= minScore)
    .filter((match) => includeDismissed || !getDismissedBookIds(match.doc).has(book?.id))
    .sort((left, right) => (
      right.score - left.score
      || (left.doc.title || '').localeCompare(right.doc.title || '')
    ))
    .slice(0, limit)
}

export function selectAutomaticBookMatch(doc, books = [], options = {}) {
  const minScore = options.minScore ?? MIN_AUTO_LINK_SCORE
  const minGap = options.minGap ?? MIN_AUTO_LINK_GAP
  const matches = suggestBooksForDocument(doc, books, { limit: 2, minScore })
  if (matches.length === 0) return null

  const [best, second] = matches
  if (!best || best.score < minScore) return null
  if (second && best.score - second.score < minGap) return null
  return best
}
