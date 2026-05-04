import { describe, expect, it } from 'vitest'
import {
  getGoogleCoverSet,
  getOpenLibraryCoverSet,
  normalizeCoverUrl,
  pickBestCoverUrl,
} from '../coverImages'

describe('coverImages', () => {
  it('upgrades Google Books thumbnails to cleaner https urls', () => {
    const imageUrl = 'http://books.google.com/books/content?id=test&printsec=frontcover&img=1&zoom=1&source=gbs_api'

    expect(normalizeCoverUrl(imageUrl)).toContain('https://books.google.com/')
    expect(normalizeCoverUrl(imageUrl)).toContain('zoom=2')
    expect(normalizeCoverUrl(imageUrl, { preferLarge: true })).toContain('zoom=3')
    expect(normalizeCoverUrl(imageUrl, { preferLarge: true })).toContain('edge=none')
  })

  it('upgrades Open Library image sizes without changing the id', () => {
    expect(normalizeCoverUrl('https://covers.openlibrary.org/b/id/123-M.jpg', { preferLarge: true }))
      .toBe('https://covers.openlibrary.org/b/id/123-L.jpg')
  })

  it('prefers the largest available Google Books image link', () => {
    const coverSet = getGoogleCoverSet({
      thumbnail: 'http://books.google.com/books/content?id=test&printsec=frontcover&img=1&zoom=1&source=gbs_api',
      medium: 'http://books.google.com/books/content?id=test&printsec=frontcover&img=1&zoom=1&source=gbs_api&medium=1',
    })

    expect(coverSet.coverUrl).toContain('zoom=2')
    expect(coverSet.largeCoverUrl).toContain('zoom=3')
  })

  it('builds both Open Library cover sizes from a cover id', () => {
    const coverSet = getOpenLibraryCoverSet(42)

    expect(coverSet.coverUrl).toBe('https://covers.openlibrary.org/b/id/42-M.jpg')
    expect(coverSet.largeCoverUrl).toBe('https://covers.openlibrary.org/b/id/42-L.jpg')
  })

  it('picks the first usable cover candidate and upgrades it', () => {
    const selected = pickBestCoverUrl(
      null,
      'http://books.google.com/books/content?id=test&printsec=frontcover&img=1&zoom=1&source=gbs_api'
    )

    expect(selected).toContain('https://books.google.com/')
    expect(selected).toContain('zoom=3')
  })
})
