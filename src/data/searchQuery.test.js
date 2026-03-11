import { describe, expect, it } from 'vitest'
import { tokenizeFtsQuery, toFtsExpression, escapeLikeValue } from './searchQuery'

describe('search query helpers', () => {
  it('tokenizes and deduplicates query terms', () => {
    expect(tokenizeFtsQuery('PDF pdf Reader++ reader')).toEqual(['pdf', 'reader'])
  })

  it('builds wildcard fts expressions', () => {
    expect(toFtsExpression('great books')).toBe('great* books*')
  })

  it('escapes LIKE wildcards', () => {
    expect(escapeLikeValue('100%_match\\test')).toBe('100\\%\\_match\\\\test')
  })
})
