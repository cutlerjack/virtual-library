import Database from 'tauri-plugin-sql-api'
import { join } from '@tauri-apps/api/path'
import { isTauri } from '../utils/tauri'
import { enqueueLibraryWrite } from './libraryWriter'
import { migrateDb } from './dbMigrations'

export const DB_VERSION = 7
const dbCache = new Map()
const dbLocks = new Map()

export async function withDbLock(libraryPath, fn) {
  if (!libraryPath) return fn()
  const previous = dbLocks.get(libraryPath) || Promise.resolve()
  let release
  const next = new Promise((resolve) => {
    release = resolve
  })
  dbLocks.set(libraryPath, previous.then(() => next, () => next))
  await previous
  try {
    return await fn()
  } finally {
    release?.()
  }
}

export async function withDb(libraryPath, fn) {
  return withDbLock(libraryPath, async () => {
    const db = await openDb(libraryPath)
    if (!db) return null
    await migrateDb(db)
    return fn(db)
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
  } catch {
    // no-op
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
  if (!isTauri() || !libraryPath) return null
  if (dbCache.has(libraryPath)) return dbCache.get(libraryPath)
  const dbPath = await join(libraryPath, 'library.db')
  try {
    const db = await Database.load(`sqlite:${dbPath}`)
    await safeExec(db, 'PRAGMA journal_mode=WAL')
    await safeExec(db, 'PRAGMA synchronous=NORMAL')
    await safeExec(db, 'PRAGMA temp_store=MEMORY')
    await safeExec(db, 'PRAGMA foreign_keys=ON')
    await safeExec(db, 'PRAGMA busy_timeout=5000')
    dbCache.set(libraryPath, db)
    return db
  } catch {
    return null
  }
}
