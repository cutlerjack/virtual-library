import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@tauri-apps/api/fs', () => ({
  exists: vi.fn(),
}))

vi.mock('../dbConnection', () => ({
  withDb: vi.fn(),
  withWriteDb: vi.fn(),
}))

const dbConnection = await import('../dbConnection')
const { exists } = await import('@tauri-apps/api/fs')
const { rescanLibraryFiles } = await import('../dbSearch')

function createDb(rows) {
  return {
    select: vi.fn(async () => rows),
    execute: vi.fn(),
  }
}

describe('dbSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    exists.mockResolvedValue(true)
  })

  it('preserves null-path duplicate rows during file rescans', async () => {
    const db = createDb([
      { id: 'file-duplicate', path: null, status: 'duplicate', hash: 'hash-a' },
      { id: 'file-missing', path: null, status: null, hash: 'hash-b' },
    ])
    dbConnection.withWriteDb.mockImplementationOnce(async (_libraryPath, fn) => fn(db))

    const result = await rescanLibraryFiles('/library')

    expect(result).toEqual({
      total: 2,
      ok: 0,
      missing: 1,
      duplicate: 1,
    })
    expect(db.execute).toHaveBeenCalledWith(
      'UPDATE files SET status = ? WHERE id = ?',
      ['duplicate', 'file-duplicate']
    )
    expect(db.execute).toHaveBeenCalledWith(
      'UPDATE files SET status = ? WHERE id = ?',
      ['missing', 'file-missing']
    )
  })

  it('preserves quarantined file status when the file is present', async () => {
    const db = createDb([
      { id: 'file-quarantined', path: '/library/article.html', status: 'quarantined', hash: 'hash-q' },
    ])
    dbConnection.withWriteDb.mockImplementationOnce(async (_libraryPath, fn) => fn(db))

    const result = await rescanLibraryFiles('/library')

    expect(result).toEqual({
      total: 1,
      ok: 0,
      missing: 0,
      duplicate: 0,
    })
    expect(db.execute).toHaveBeenCalledWith(
      'UPDATE files SET status = ? WHERE id = ?',
      ['quarantined', 'file-quarantined']
    )
  })
})
