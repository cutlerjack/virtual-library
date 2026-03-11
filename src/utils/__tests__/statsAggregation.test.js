import { describe, it, expect, vi, afterEach } from 'vitest'
import { computeLibraryStats } from '../statsAggregation'

const makeBook = (overrides = {}) => ({
  id: 'book-1',
  title: 'Test Book',
  tags: [],
  quotes: [],
  rating: 0,
  pageCount: 0,
  dateFinished: null,
  ...overrides,
})

describe('computeLibraryStats', () => {
  afterEach(() => vi.useRealTimers())

  it('returns empty stats for no books', () => {
    const stats = computeLibraryStats([], [], 2024)
    expect(stats.totalBooks).toBe(0)
    expect(stats.finishedThisYear).toBe(0)
    expect(stats.totalPages).toBe(0)
    expect(stats.genreData).toEqual([])
    expect(stats.level).toBe(1)
  })

  it('counts total books', () => {
    const books = [makeBook(), makeBook({ id: 'b2' })]
    const stats = computeLibraryStats(books, [], 2024)
    expect(stats.totalBooks).toBe(2)
  })

  it('counts books finished in selected year', () => {
    const books = [
      makeBook({ dateFinished: '2024-03-01' }),
      makeBook({ id: 'b2', dateFinished: '2024-06-15' }),
      makeBook({ id: 'b3', dateFinished: '2023-12-31' }),
    ]
    const stats = computeLibraryStats(books, [], 2024)
    expect(stats.finishedThisYear).toBe(2)
  })

  it('sums pages across all books', () => {
    const books = [
      makeBook({ pageCount: 300 }),
      makeBook({ id: 'b2', pageCount: 200 }),
    ]
    const stats = computeLibraryStats(books, [], 2024)
    expect(stats.totalPages).toBe(500)
  })

  it('computes average rating as five-star scale', () => {
    const books = [
      makeBook({ rating: 8 }),
      makeBook({ id: 'b2', rating: 6 }),
    ]
    const stats = computeLibraryStats(books, [], 2024)
    expect(stats.avgRating).toBe('3.5')
  })

  it('returns 0 average for no rated books', () => {
    const stats = computeLibraryStats([makeBook()], [], 2024)
    expect(stats.avgRating).toBe('0.0')
  })

  it('builds genre data from tags', () => {
    const books = [
      makeBook({ tags: ['fiction', 'adventure'] }),
      makeBook({ id: 'b2', tags: ['fiction', 'sci-fi'] }),
    ]
    const stats = computeLibraryStats(books, [], 2024)
    expect(stats.genreData[0].name).toBe('fiction')
    expect(stats.genreData[0].value).toBe(2)
  })

  it('limits genre data to 6 entries', () => {
    const tags = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    const books = tags.map((tag, i) => makeBook({ id: `b${i}`, tags: [tag] }))
    const stats = computeLibraryStats(books, [], 2024)
    expect(stats.genreData).toHaveLength(6)
  })

  it('generates monthly data for selected year', () => {
    const books = [
      makeBook({ dateFinished: '2024-01-15' }),
      makeBook({ id: 'b2', dateFinished: '2024-01-20' }),
      makeBook({ id: 'b3', dateFinished: '2024-06-01' }),
    ]
    const stats = computeLibraryStats(books, [], 2024)
    const jan = stats.monthlyData.find(m => m.month === 'Jan')
    expect(jan?.books).toBe(2)
  })

  it('computes XP and level from total pages', () => {
    const books = [makeBook({ pageCount: 2500 })]
    const stats = computeLibraryStats(books, [], 2024)
    expect(stats.xp).toBe(2500)
    expect(stats.level).toBe(3)
  })

  it('computes quest progress', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2024, 5, 15))
    const books = [
      makeBook({ dateFinished: new Date(2024, 5, 5).toISOString(), pageCount: 200 }),
    ]
    const quests = [
      { id: 'q1', label: 'Read 1 book', target: 2, type: 'books' },
    ]
    const stats = computeLibraryStats(books, quests, 2024)
    expect(stats.quests).toHaveLength(1)
    expect(stats.quests[0].progress).toBe(0.5)
    expect(stats.quests[0].value).toBe('1/2')
  })

  it('generates achievements list', () => {
    const books = [makeBook({ dateFinished: '2024-01-01', pageCount: 500 })]
    const stats = computeLibraryStats(books, [], 2024)
    expect(stats.achievements).toHaveLength(4)
    expect(stats.achievements[0].label).toBe('First Tome')
  })

  it('handles streak for cadence', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15'))
    const books = [
      makeBook({ dateFinished: '2024-06-10' }),
      makeBook({ id: 'b2', dateFinished: '2024-06-14' }),
    ]
    const stats = computeLibraryStats(books, [], 2024)
    expect(stats.streak.current).toBeGreaterThan(0)
  })

  it('computes daysSinceLast as null when no finished books', () => {
    const stats = computeLibraryStats([makeBook()], [], 2024)
    expect(stats.daysSinceLast).toBeNull()
  })
})
