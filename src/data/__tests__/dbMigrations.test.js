import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../dbConnection', () => ({
  DB_VERSION: 7,
  safeExec: vi.fn(async (db, sql, params) => db.execute(sql, params)),
  withTransaction: vi.fn(async (_db, fn) => fn()),
}))

const { migrateDb } = await import('../dbMigrations')

function createDb(version) {
  return {
    execute: vi.fn(),
    select: vi.fn(async (sql) => {
      const statement = String(sql)
      if (statement.includes('PRAGMA user_version')) return [{ user_version: version }]
      if (statement.includes('PRAGMA table_info')) return []
      if (statement.includes('FROM items')) return []
      if (statement.includes('FROM search_docs')) return []
      return []
    }),
  }
}

function executedSql(db) {
  return db.execute.mock.calls.map(([sql]) => String(sql))
}

describe('desktop database migrations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ensures search_docs exists for already-current databases', async () => {
    const db = createDb(7)

    await migrateDb(db)

    expect(executedSql(db).some((sql) => (
      sql.includes('CREATE VIRTUAL TABLE IF NOT EXISTS search_docs')
    ))).toBe(true)
    expect(executedSql(db).some((sql) => sql.includes('PRAGMA user_version'))).toBe(false)
  })

  it('backfills missing search docs for already-current databases', async () => {
    const db = createDb(7)
    db.select.mockImplementation(async (sql) => {
      const statement = String(sql)
      if (statement.includes('PRAGMA user_version')) return [{ user_version: 7 }]
      if (statement.includes('PRAGMA table_info')) return []
      if (statement.includes('SELECT id, kind, title, author, meta_json, updated_at FROM items')) {
        return [{
          id: 'book-1',
          kind: 'book',
          title: 'Indexed Book',
          author: 'Migration Tester',
          meta_json: JSON.stringify({ notes: 'Backfilled body' }),
          updated_at: '2026-05-04T12:00:00.000Z',
        }]
      }
      if (statement.includes('SELECT item_id FROM search_docs')) return []
      return []
    })

    await migrateDb(db)

    expect(db.execute).toHaveBeenCalledWith(
      'INSERT INTO search_docs (item_id, kind, title, body, updated_at) VALUES (?, ?, ?, ?, ?)',
      ['book-1', 'book', 'Indexed Book', expect.stringContaining('Indexed Book'), '2026-05-04T12:00:00.000Z']
    )
    expect(db.execute.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO search_docs'))?.[1]?.[3]).toContain('Migration Tester')
  })

  it('ensures search_docs exists when upgrading an existing database', async () => {
    const db = createDb(6)

    await migrateDb(db)

    expect(executedSql(db).some((sql) => (
      sql.includes('CREATE VIRTUAL TABLE IF NOT EXISTS search_docs')
    ))).toBe(true)
    expect(executedSql(db)).toContain('PRAGMA user_version = 7')
  })

  it('runs historical migrations for version-zero databases that already have app tables', async () => {
    const db = createDb(0)
    db.select.mockImplementation(async (sql) => {
      const statement = String(sql)
      if (statement.includes('PRAGMA user_version')) return [{ user_version: 0 }]
      if (statement.includes('FROM sqlite_master')) return [{ name: 'files' }]
      if (statement.includes('PRAGMA table_info(files)')) {
        return [
          { name: 'id' },
          { name: 'item_id' },
          { name: 'path' },
          { name: 'hash' },
          { name: 'size' },
          { name: 'mtime' },
          { name: 'status' },
        ]
      }
      if (statement.includes('PRAGMA table_info(ingest_jobs)')) return []
      if (statement.includes('PRAGMA table_info')) return [{ name: 'id' }]
      if (statement.includes('FROM items')) return []
      if (statement.includes('FROM search_docs')) return []
      return []
    })

    await migrateDb(db)

    expect(executedSql(db).some((sql) => (
      sql.includes('CREATE TABLE IF NOT EXISTS files')
    ))).toBe(true)
    expect(db.execute).toHaveBeenCalledWith('ALTER TABLE files ADD COLUMN mime TEXT')
    expect(db.execute).toHaveBeenCalledWith('ALTER TABLE files ADD COLUMN page_count INTEGER')
    expect(db.execute).toHaveBeenCalledWith('ALTER TABLE files ADD COLUMN scanned INTEGER')
    expect(executedSql(db)).toContain('PRAGMA user_version = 7')
  })

  it('deduplicates file paths case-insensitively before creating path indexes', async () => {
    const db = createDb(7)
    db.select.mockImplementation(async (sql, params) => {
      const statement = String(sql)
      if (statement.includes('PRAGMA user_version')) return [{ user_version: 7 }]
      if (statement.includes('GROUP BY lower(path)')) {
        return [{ normalized_path: '/library/book.pdf' }]
      }
      if (statement.includes('WHERE lower(path) = ?')) {
        expect(params).toEqual(['/library/book.pdf'])
        return [{ id: 'newer-file' }, { id: 'older-file' }]
      }
      if (statement.includes('PRAGMA table_info')) return []
      if (statement.includes('FROM items')) return []
      if (statement.includes('FROM search_docs')) return []
      return []
    })

    await migrateDb(db)

    expect(db.execute).toHaveBeenCalledWith(
      'UPDATE files SET path = NULL, status = CASE WHEN status IS NULL OR status = "" THEN ? ELSE status END WHERE id = ?',
      ['duplicate', 'older-file']
    )
    expect(executedSql(db)).toContain(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_files_path_unique_lower ON files(lower(path)) WHERE path IS NOT NULL AND path <> ""'
    )
  })
})
