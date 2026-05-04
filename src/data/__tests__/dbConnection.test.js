import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  loadedDbs: [],
  load: vi.fn(),
  migrateDb: vi.fn(),
}))

vi.mock('tauri-plugin-sql-api', () => ({
  default: {
    load: mocks.load,
  },
}))

vi.mock('@tauri-apps/api/path', () => ({
  join: vi.fn((...parts) => Promise.resolve(parts.join('/'))),
}))

vi.mock('../../utils/tauri', () => ({
  isTauri: () => true,
}))

vi.mock('../dbMigrations', () => ({
  migrateDb: mocks.migrateDb,
}))

async function loadDbConnectionModule() {
  vi.resetModules()
  return import('../dbConnection')
}

beforeEach(() => {
  mocks.loadedDbs = []
  mocks.load.mockReset()
  mocks.migrateDb.mockReset()
  mocks.load.mockImplementation(async (url) => {
    const db = {
      url,
      execute: vi.fn(),
      select: vi.fn(),
      close: vi.fn(() => Promise.resolve()),
    }
    mocks.loadedDbs.push(db)
    return db
  })
})

describe('dbConnection', () => {
  it('serializes database lock work and recovers after failures', async () => {
    const { withDbLock } = await loadDbConnectionModule()
    const order = []
    let releaseFirst

    const first = withDbLock('/library', async () => {
      order.push('first-start')
      await new Promise((resolve) => {
        releaseFirst = resolve
      })
      order.push('first-end')
    })
    const second = withDbLock('/library', async () => {
      order.push('second')
    })

    await Promise.resolve()
    expect(order).toEqual(['first-start'])
    releaseFirst()
    await Promise.all([first, second])
    expect(order).toEqual(['first-start', 'first-end', 'second'])

    await expect(withDbLock('/library', async () => {
      throw new Error('write failed')
    })).rejects.toThrow('write failed')
    await withDbLock('/library', async () => {
      order.push('recovered')
    })

    expect(order).toEqual(['first-start', 'first-end', 'second', 'recovered'])
  })

  it('closes and evicts the cached database handle for a library path', async () => {
    const { closeLibraryDb, withDb } = await loadDbConnectionModule()

    await withDb('/library', async (db) => {
      expect(db).toBe(mocks.loadedDbs[0])
    })
    await closeLibraryDb('/library')
    await withDb('/library', async (db) => {
      expect(db).toBe(mocks.loadedDbs[1])
    })

    expect(mocks.load).toHaveBeenCalledTimes(2)
    expect(mocks.load).toHaveBeenNthCalledWith(1, 'sqlite:/library/library.db')
    expect(mocks.load).toHaveBeenNthCalledWith(2, 'sqlite:/library/library.db')
    expect(mocks.loadedDbs[0].close).toHaveBeenCalledTimes(1)
    expect(mocks.loadedDbs[1].close).not.toHaveBeenCalled()
    expect(mocks.migrateDb).toHaveBeenCalledTimes(2)
  })

  it('closes a newly opened database handle when initialization fails', async () => {
    const { withDb } = await loadDbConnectionModule()
    mocks.load.mockImplementationOnce(async (url) => {
      const db = {
        url,
        execute: vi.fn(() => Promise.reject(new Error('pragma failed'))),
        select: vi.fn(),
        close: vi.fn(() => Promise.resolve()),
      }
      mocks.loadedDbs.push(db)
      return db
    })

    await expect(withDb('/broken-library', async () => {})).rejects.toMatchObject({
      code: 'db_open_failed',
    })

    expect(mocks.loadedDbs[0].close).toHaveBeenCalledTimes(1)
    expect(mocks.migrateDb).not.toHaveBeenCalled()
  })

  it('treats missing cached handles and databases without close methods as no-ops', async () => {
    const { closeLibraryDb, withDb } = await loadDbConnectionModule()

    await expect(closeLibraryDb('/missing')).resolves.toBeUndefined()
    expect(mocks.load).not.toHaveBeenCalled()

    mocks.load.mockImplementationOnce(async (url) => {
      const db = {
        url,
        execute: vi.fn(),
        select: vi.fn(),
      }
      mocks.loadedDbs.push(db)
      return db
    })

    await withDb('/library-without-close', async (db) => {
      expect(db).toBe(mocks.loadedDbs[0])
    })

    await expect(closeLibraryDb('/library-without-close')).resolves.toBeUndefined()
  })
})
