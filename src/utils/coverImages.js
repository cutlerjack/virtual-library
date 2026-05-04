const OPEN_LIBRARY_SIZE_PATTERN = /-(S|M|L)\.jpg$/i

export function normalizeCoverUrl(imageUrl, { preferLarge = false } = {}) {
  if (!imageUrl) return null

  const sanitizedUrl = imageUrl.replace(/^http:/, 'https:')

  if (sanitizedUrl.includes('covers.openlibrary.org')) {
    if (OPEN_LIBRARY_SIZE_PATTERN.test(sanitizedUrl)) {
      return sanitizedUrl.replace(OPEN_LIBRARY_SIZE_PATTERN, preferLarge ? '-L.jpg' : '-M.jpg')
    }
    return sanitizedUrl
  }

  try {
    const url = new URL(sanitizedUrl)
    const isGoogleImage = url.hostname.includes('books.google') || url.hostname.includes('googleusercontent.com')

    if (isGoogleImage) {
      url.searchParams.set('zoom', preferLarge ? '3' : '2')
      url.searchParams.set('edge', 'none')
      return url.toString()
    }

    return url.toString()
  } catch {
    return sanitizedUrl
  }
}

export function getGoogleCoverSet(imageLinks = {}) {
  const largeCandidate = imageLinks.extraLarge
    || imageLinks.large
    || imageLinks.medium
    || imageLinks.small
    || imageLinks.thumbnail
    || imageLinks.smallThumbnail
    || null

  const displayCandidate = imageLinks.medium
    || imageLinks.small
    || largeCandidate
    || imageLinks.thumbnail
    || imageLinks.smallThumbnail
    || null

  return {
    coverUrl: normalizeCoverUrl(displayCandidate, { preferLarge: false }),
    largeCoverUrl: normalizeCoverUrl(largeCandidate, { preferLarge: true }),
  }
}

export function getOpenLibraryCoverSet(coverId) {
  if (!coverId) {
    return {
      coverUrl: null,
      largeCoverUrl: null,
    }
  }

  return {
    coverUrl: normalizeCoverUrl(`https://covers.openlibrary.org/b/id/${coverId}-M.jpg`),
    largeCoverUrl: normalizeCoverUrl(`https://covers.openlibrary.org/b/id/${coverId}-L.jpg`, { preferLarge: true }),
  }
}

export function pickBestCoverUrl(...candidates) {
  for (const candidate of candidates) {
    const normalized = normalizeCoverUrl(candidate, { preferLarge: true })
    if (normalized) {
      return normalized
    }
  }

  return null
}
