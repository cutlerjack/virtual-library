import { withTransaction, withWriteDb } from './dbConnection'

function dedupeSpineEntries(spineLibrary = {}) {
  const seen = new Set()
  return Object.values(spineLibrary).filter((entry) => {
    if (!entry?.isbn || seen.has(entry.isbn)) return false
    seen.add(entry.isbn)
    return true
  })
}

export async function saveShelvesToDb(libraryPath, shelves = []) {
  return withWriteDb(libraryPath, async (db) => {
    await withTransaction(db, async () => {
      await db.execute('DELETE FROM shelves')
      for (const shelf of shelves) {
        await db.execute(
          `INSERT INTO shelves (id, name, color, sort_order)
           VALUES (?, ?, ?, ?)`,
          [shelf.id, shelf.name, shelf.color, shelf.order || 0]
        )
      }
    })
  })
}

export async function saveSpineLibraryToDb(libraryPath, spineLibrary = {}) {
  return withWriteDb(libraryPath, async (db) => {
    await withTransaction(db, async () => {
      await db.execute('DELETE FROM spine_library')
      for (const entry of dedupeSpineEntries(spineLibrary)) {
        await db.execute(
          `INSERT INTO spine_library (isbn, spine_image, crop_json, title, author, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            entry.isbn,
            entry.spineImage || null,
            entry.crop ? JSON.stringify(entry.crop) : null,
            entry.title || null,
            entry.author || null,
            entry.updatedAt || entry.addedAt || null,
          ]
        )
      }
    })
  })
}
