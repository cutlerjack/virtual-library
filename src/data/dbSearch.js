import { exists } from '@tauri-apps/api/fs'
import { withDb, withWriteDb } from './dbConnection'
import { toFtsExpression, escapeLikeValue } from './searchQuery'
import { parseMetaJson } from './dbTransform'

export async function searchLibrary(libraryPath, query) {
  try {
    const results = await withDb(libraryPath, async (db) => {
      const trimmed = query?.trim()
      if (!trimmed) return []

      const ftsExpression = toFtsExpression(trimmed)
      if (ftsExpression) {
        try {
          const ftsRows = await db.select(
            `SELECT item_id, kind, title, snippet(search_docs, 3, '<mark>', '</mark>', '…', 12) AS snippet
             FROM search_docs
             WHERE search_docs MATCH ?
             ORDER BY rank
             LIMIT 25`,
            [ftsExpression]
          )
          if (Array.isArray(ftsRows) && ftsRows.length > 0) {
            return ftsRows.map((row) => ({
              itemId: row.item_id,
              kind: row.kind,
              title: row.title,
              snippet: row.snippet,
            }))
          }
        } catch {
          // fall through to LIKE fallback
        }
      }

      const like = `%${escapeLikeValue(trimmed)}%`
      const rows = await db.select(
        `SELECT i.id AS item_id, i.kind AS kind, i.title AS title
         FROM items i
         LEFT JOIN search_docs sd ON sd.item_id = i.id
         WHERE lower(i.title) LIKE ? ESCAPE '\\'
            OR lower(COALESCE(i.author, '')) LIKE ? ESCAPE '\\'
            OR lower(COALESCE(sd.body, '')) LIKE ? ESCAPE '\\'
         ORDER BY COALESCE(i.updated_at, i.created_at) DESC
         LIMIT 25`,
        [like, like, like]
      )

      return (rows || []).map((row) => ({
        itemId: row.item_id,
        kind: row.kind,
        title: row.title,
        snippet: null,
      }))
    })
    return results || []
  } catch {
    return []
  }
}

export async function rescanLibraryFiles(libraryPath) {
  return withWriteDb(libraryPath, async (db) => {
    const rows = await db.select('SELECT * FROM files')
    if (!rows.length) return

    const hashMap = new Map()
    let missingCount = 0
    let okCount = 0

    for (const row of rows) {
      let status = 'ok'
      try {
        if (!row.path) {
          status = 'missing'
        } else {
          const present = await exists(row.path)
          if (!present) status = 'missing'
        }
      } catch {
        status = 'missing'
      }
      await db.execute('UPDATE files SET status = ? WHERE id = ?', [status, row.id])
      if (status === 'ok' && row.hash) {
        okCount += 1
        if (!hashMap.has(row.hash)) hashMap.set(row.hash, [])
        hashMap.get(row.hash).push(row.id)
      } else if (status === 'missing') {
        missingCount += 1
      }
    }

    let duplicateCount = 0
    for (const [hash, ids] of hashMap.entries()) {
      if (ids.length <= 1) continue
      duplicateCount += ids.length
      for (const id of ids) {
        await db.execute('UPDATE files SET status = ? WHERE id = ?', ['duplicate', id])
      }
    }

    return {
      total: rows.length,
      ok: okCount,
      missing: missingCount,
      duplicate: duplicateCount,
    }
  })
}

export async function updateSearchDoc(libraryPath, { itemId, kind, title, body, updatedAt }) {
  return withWriteDb(libraryPath, async (db) => {
    await db.execute('DELETE FROM search_docs WHERE item_id = ?', [itemId])
    await db.execute(
      'INSERT INTO search_docs (item_id, kind, title, body, updated_at) VALUES (?, ?, ?, ?, ?)',
      [itemId, kind || 'document', title || '', body || '', updatedAt || null]
    )
  })
}

export async function rebuildSearchIndex(libraryPath) {
  return withWriteDb(libraryPath, async (db) => {
    const items = await db.select('SELECT id, kind, title, meta_json, author FROM items')
    await db.execute('DELETE FROM search_docs')
    for (const row of items) {
      const meta = parseMetaJson(row.meta_json)
      const body = [row.title, row.author, meta.searchText].filter(Boolean).join('\n')
      await db.execute(
        'INSERT INTO search_docs (item_id, kind, title, body, updated_at) VALUES (?, ?, ?, ?, ?)',
        [row.id, row.kind, row.title || '', body || '', null]
      )
    }
  })
}
