import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../dbConnection', () => ({
  DB_VERSION: 7,
  withDb: vi.fn(),
  withWriteDb: vi.fn(),
  withTransaction: vi.fn(async (_db, fn) => fn()),
}))

const dbConnection = await import('../dbConnection')
const { saveDocumentItemToDb } = await import('../dbCatalog')
const { loadLibraryStateFromDb, saveLibraryStateToDb } = await import('../dbLibrary')

function createDb(selectImpl = () => []) {
  return {
    execute: vi.fn(),
    select: vi.fn(selectImpl),
  }
}

function findInserts(db, table) {
  return db.execute.mock.calls.filter(([sql]) => String(sql).includes(`INSERT INTO ${table}`))
}

describe('desktop document file persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('marks targeted duplicate file paths in both item metadata and files', async () => {
    const db = createDb(async (sql) => {
      if (String(sql).includes('FROM files')) return [{ item_id: 'doc-existing' }]
      return []
    })
    dbConnection.withWriteDb.mockImplementationOnce(async (_libraryPath, fn) => fn(db))

    await saveDocumentItemToDb('/library', {
      id: 'doc-duplicate',
      kind: 'document',
      title: 'Duplicate File',
      docMeta: {
        filePath: '/Library/Source.pdf',
        fileStatus: 'available',
        mime: 'application/pdf',
      },
    })

    const itemMeta = JSON.parse(findInserts(db, 'items')[0][1][10])
    expect(itemMeta).toEqual(expect.objectContaining({
      filePath: null,
      fileStatus: 'duplicate',
      mime: 'application/pdf',
    }))

    const fileInsert = findInserts(db, 'files')[0]
    expect(fileInsert[1][2]).toBeNull()
    expect(fileInsert[1][9]).toBe('duplicate')
    expect(db.select.mock.calls[0][1]).toEqual(['/library/source.pdf', 'doc-duplicate'])
  })

  it('marks full-state duplicate file paths in both item metadata and files', async () => {
    const db = createDb()
    dbConnection.withWriteDb.mockImplementationOnce(async (_libraryPath, fn) => fn(db))

    await saveLibraryStateToDb('/library', {
      items: [
        {
          id: 'doc-original',
          kind: 'document',
          title: 'Original',
          docMeta: {
            filePath: '/Library/Source.pdf',
            fileStatus: 'available',
            mime: 'application/pdf',
          },
        },
        {
          id: 'doc-duplicate',
          kind: 'document',
          title: 'Duplicate',
          docMeta: {
            filePath: '/library/source.pdf',
            fileStatus: 'available',
            mime: 'application/pdf',
          },
        },
      ],
      shelves: [],
      user: {},
      spineLibrary: {},
    })

    const itemInserts = findInserts(db, 'items')
    const originalMeta = JSON.parse(itemInserts[0][1][10])
    const duplicateMeta = JSON.parse(itemInserts[1][1][10])
    expect(originalMeta).toEqual(expect.objectContaining({
      filePath: '/Library/Source.pdf',
      fileStatus: 'available',
    }))
    expect(duplicateMeta).toEqual(expect.objectContaining({
      filePath: null,
      fileStatus: 'duplicate',
    }))

    const fileInserts = findInserts(db, 'files')
    expect(fileInserts[0][1][2]).toBe('/Library/Source.pdf')
    expect(fileInserts[0][1][9]).toBe('available')
    expect(fileInserts[1][1][2]).toBeNull()
    expect(fileInserts[1][1][9]).toBe('duplicate')
  })

  it('hydrates duplicate file rows as the source of truth over stale item metadata', async () => {
    const db = createDb(async (sql) => {
      const statement = String(sql)
      if (statement.includes('COUNT(*)')) return [{ count: 1 }]
      if (statement.includes('SELECT * FROM items')) {
        return [{
          id: 'doc-duplicate',
          kind: 'document',
          title: 'Duplicate File',
          author: null,
          rating: 0,
          meta_json: JSON.stringify({
            filePath: '/Library/Source.pdf',
            fileStatus: 'available',
            mime: 'application/pdf',
          }),
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-02T00:00:00.000Z',
        }]
      }
      if (statement.includes('SELECT * FROM files')) {
        return [{
          id: 'doc-duplicate-file',
          item_id: 'doc-duplicate',
          path: null,
          status: 'duplicate',
          mime: 'application/pdf',
          page_count: null,
          scanned: 0,
          hash: null,
          size: null,
          mtime: null,
        }]
      }
      return []
    })
    dbConnection.withDb.mockImplementationOnce(async (_libraryPath, fn) => fn(db))

    const state = await loadLibraryStateFromDb('/library')

    expect(state.items[0].docMeta).toEqual(expect.objectContaining({
      filePath: null,
      fileStatus: 'duplicate',
      mime: 'application/pdf',
    }))
  })
})
