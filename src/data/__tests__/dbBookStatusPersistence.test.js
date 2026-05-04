import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../dbConnection', () => ({
  DB_VERSION: 7,
  withDb: vi.fn(),
  withWriteDb: vi.fn(),
  withTransaction: vi.fn(async (_db, fn) => fn()),
}))

const dbConnection = await import('../dbConnection')
const { saveBookItemToDb } = await import('../dbCatalog')
const { loadLibraryStateFromDb, saveLibraryStateToDb } = await import('../dbLibrary')

function createDb(selectImpl = () => []) {
  return {
    execute: vi.fn(),
    select: vi.fn(selectImpl),
  }
}

function findItemInsert(db) {
  return db.execute.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO items'))
}

describe('desktop book status persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('stores targeted book status in item metadata', async () => {
    const db = createDb()
    dbConnection.withWriteDb.mockImplementationOnce(async (_libraryPath, fn) => fn(db))

    await saveBookItemToDb('/library', {
      id: 'book-1',
      kind: 'book',
      title: 'Status Book',
      author: 'Reader',
      status: 'reading',
      bookMeta: { pageCount: 200 },
    })

    const insert = findItemInsert(db)
    expect(JSON.parse(insert[1][10])).toEqual(expect.objectContaining({
      pageCount: 200,
      status: 'reading',
    }))
  })

  it('stores full-state book status in item metadata', async () => {
    const db = createDb()
    dbConnection.withWriteDb.mockImplementationOnce(async (_libraryPath, fn) => fn(db))

    await saveLibraryStateToDb('/library', {
      items: [{
        id: 'book-1',
        kind: 'book',
        title: 'Status Book',
        author: 'Reader',
        status: 'read',
        bookMeta: { pageCount: 200 },
      }],
      shelves: [],
      user: {},
      spineLibrary: {},
    })

    const insert = findItemInsert(db)
    expect(JSON.parse(insert[1][10])).toEqual(expect.objectContaining({
      pageCount: 200,
      status: 'read',
    }))
  })

  it('hydrates book status from persisted metadata on load', async () => {
    const db = createDb(async (sql) => {
      if (String(sql).includes('COUNT(*)')) return [{ count: 1 }]
      if (String(sql).includes('FROM items')) {
        return [{
          id: 'book-1',
          kind: 'book',
          title: 'Status Book',
          author: 'Reader',
          rating: 0,
          meta_json: JSON.stringify({ pageCount: 200, status: 'reading' }),
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-02T00:00:00.000Z',
        }]
      }
      return []
    })
    dbConnection.withDb.mockImplementationOnce(async (_libraryPath, fn) => fn(db))

    const state = await loadLibraryStateFromDb('/library')

    expect(state.items[0].status).toBe('reading')
  })
})
