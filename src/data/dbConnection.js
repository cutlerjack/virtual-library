import Database from 'tauri-plugin-sql-api'
import { join } from '@tauri-apps/api/path'
import { isTauri } from '../utils/tauri'
import { enqueueLibraryWrite } from './libraryWriter'
import { migrateDb } from './dbMigrations'

export const DB_VERSION = 7
const dbCache = new Map()
const dbLocks = new Map()

export class LibraryDbError extends Error {
  constructor(code, message, options = {}) {
    super(message)
    this.name = 'LibraryDbError'
    this.code = code
    this.cause = options.cause
  }
}

export async function withDbLock(libraryPath, fn) {
  if (!libraryPath) return fn()
  const previous = dbLocks.get(libraryPath) || Promise.resolve()
  let release
  const next = new Promise((resolve) => {
    release = resolve
  })
  const current = previous.then(() => next, () => next)
  dbLocks.set(libraryPath, current)
  await previous
  try {
    return await fn()
  } finally {
    release?.()
    if (dbLocks.get(libraryPath) === current) {
      dbLocks.delete(libraryPath)
    }
  }
}

export async function withDb(libraryPath, fn) {
  return withDbLock(libraryPath, async () => {
    const db = await openDb(libraryPath)
    await migrateDb(db)
    return fn(db)
  })
}

export async function closeLibraryDb(libraryPath) {
  if (!libraryPath) return
  await withDbLock(libraryPath, async () => {
    const db = dbCache.get(libraryPath)
    dbCache.delete(libraryPath)
    if (typeof db?.close === 'function') {
      await db.close()
    }
  })
}

export async function withWriteDb(libraryPath, fn) {
  return enqueueLibraryWrite(libraryPath, () => withDb(libraryPath, fn))
}

export async function safeExec(db, sql, params) {
  try {
    if (params) {
      await db.execute(sql, params)
      return
    }
    await db.execute(sql)
  } catch (error) {
    throw new LibraryDbError('db_exec_failed', 'Unable to initialize the library database.', {
      cause: error,
    })
  }
}

export async function withTransaction(db, fn) {
  await db.execute('BEGIN IMMEDIATE')
  let inTransaction = true
  try {
    const result = await fn()
    await db.execute('COMMIT')
    inTransaction = false
    return result
  } catch (error) {
    if (inTransaction) {
      try {
        await db.execute('ROLLBACK')
      } catch {
        // ignore rollback failures
      }
    }
    throw error
  }
}

export async function openDb(libraryPath) {
  if (!isTauri()) {
    throw new LibraryDbError('db_unavailable', 'The desktop database is unavailable outside the Tauri runtime.')
  }
  if (!libraryPath) {
    throw new LibraryDbError('db_missing_path', 'No library folder is configured.')
  }
  if (dbCache.has(libraryPath)) return dbCache.get(libraryPath)
  const dbPath = await join(libraryPath, 'library.db')
  let db = null
  try {
    db = await Database.load(`sqlite:${dbPath}`)
    await safeExec(db, 'PRAGMA journal_mode=WAL')
    await safeExec(db, 'PRAGMA synchronous=NORMAL')
    await safeExec(db, 'PRAGMA temp_store=MEMORY')
    await safeExec(db, 'PRAGMA foreign_keys=ON')
    await safeExec(db, 'PRAGMA busy_timeout=5000')
    dbCache.set(libraryPath, db)
    return db
  } catch (error) {
    if (typeof db?.close === 'function') {
      try {
        await db.close()
      } catch {
        // Ignore close failures while reporting the original database open error.
      }
    }
    throw new LibraryDbError('db_open_failed', `Unable to open the library database at ${dbPath}.`, {
      cause: error,
    })
  }
}
