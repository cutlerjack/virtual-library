import { exists } from '@tauri-apps/api/fs'
import { withDb, withWriteDb } from './dbConnection'
import { toFtsExpression, escapeLikeValue, tokenizeFtsQuery } from './searchQuery'
import { buildSearchText, parseMetaJson } from './dbTransform'

export async function searchLibrary(libraryPath, query) {
  const results = await withDb(libraryPath, async (db) => {
    const trimmed = query?.trim()
    if (!trimmed) return []

    const queryTokens = tokenizeFtsQuery(trimmed)
    const ftsExpression = toFtsExpression(trimmed)
    if (ftsExpression) {
      try {
        const ftsRows = await db.select(
          `SELECT item_id, kind, title, body
           FROM search_docs
           WHERE search_docs MATCH ?
           ORDER BY rank
           LIMIT 25`,
          [ftsExpression]
        )
        if (Array.isArray(ftsRows) && ftsRows.length > 0) {
          return enrichSearchResults(db, ftsRows.map((row) => ({
            itemId: row.item_id,
            kind: row.kind,
            title: row.title,
            snippet: buildSearchSnippet(row.body, queryTokens),
          })))
        }
      } catch {
        // fall through to LIKE fallback
      }
    }

    const like = `%${escapeLikeValue(trimmed)}%`
    const rows = await db.select(
      `SELECT i.id AS item_id, i.kind AS kind, i.title AS title, sd.body AS body
       FROM items i
       LEFT JOIN search_docs sd ON sd.item_id = i.id
       WHERE lower(i.title) LIKE ? ESCAPE '\\'
          OR lower(COALESCE(i.author, '')) LIKE ? ESCAPE '\\'
          OR lower(COALESCE(sd.body, '')) LIKE ? ESCAPE '\\'
       ORDER BY COALESCE(i.updated_at, i.created_at) DESC
       LIMIT 25`,
      [like, like, like]
    )

    return enrichSearchResults(db, (rows || []).map((row) => ({
      itemId: row.item_id,
      kind: row.kind,
      title: row.title,
      snippet: buildSearchSnippet(row.body, queryTokens),
    })))
  })
  return results || []
}

async function enrichSearchResults(db, results) {
  if (!Array.isArray(results) || results.length === 0) return []

  const itemIds = Array.from(new Set(results.map((result) => result.itemId).filter(Boolean)))
  if (itemIds.length === 0) return results

  const itemRows = await db.select(
    `SELECT id, kind, meta_json
     FROM items
     WHERE id IN (${itemIds.map(() => '?').join(', ')})`,
    itemIds
  )
  const metaByItemId = new Map()
  const linkedBookIds = new Set()

  ;(itemRows || []).forEach((row) => {
    const meta = parseMetaJson(row.meta_json)
    metaByItemId.set(row.id, meta)
    if ((row.kind === 'document' || row.kind === 'article') && meta.linkedBookId) {
      linkedBookIds.add(meta.linkedBookId)
    }
  })

  const linkedBookTitleById = new Map()
  if (linkedBookIds.size > 0) {
    const ids = Array.from(linkedBookIds)
    const linkedRows = await db.select(
      `SELECT id, title
       FROM items
       WHERE id IN (${ids.map(() => '?').join(', ')})`,
      ids
    )
    ;(linkedRows || []).forEach((row) => {
      linkedBookTitleById.set(row.id, row.title || null)
    })
  }

  return results.map((result) => {
    const meta = metaByItemId.get(result.itemId) || {}
    const linkedBookId = meta.linkedBookId || null
    const linkedBookTitle = linkedBookId ? (linkedBookTitleById.get(linkedBookId) || null) : null
    return {
      ...result,
      linkedBookId,
      linkedBookTitle,
      relationLabel: linkedBookTitle ? `Attached to ${linkedBookTitle}` : null,
    }
  })
}

export async function rescanLibraryFiles(libraryPath) {
  return withWriteDb(libraryPath, async (db) => {
    const rows = await db.select('SELECT * FROM files')
    if (!rows.length) return

    const hashMap = new Map()
    let missingCount = 0
    let okCount = 0
    let duplicateCount = 0

    for (const row of rows) {
      let status = 'ok'
      try {
        if (!row.path) {
          status = row.status === 'duplicate' ? 'duplicate' : 'missing'
        } else {
          const present = await exists(row.path)
          if (!present) status = 'missing'
          else if (row.status === 'quarantined') status = 'quarantined'
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
      } else if (status === 'duplicate') {
        duplicateCount += 1
      }
    }

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
    const booksById = new Map(
      (items || [])
        .filter((row) => row.kind === 'book')
        .map((row) => [
          row.id,
          {
            id: row.id,
            title: row.title || '',
            author: row.author || null,
          },
        ])
    )
    for (const row of items) {
      const meta = parseMetaJson(row.meta_json)
      const body = buildSearchText(
        {
          id: row.id,
          kind: row.kind,
          title: row.title || '',
          author: row.author || null,
          tags: [],
          docMeta: meta,
          annotations: { notes: [], highlights: [] },
        },
        {
          linkedBook: meta.linkedBookId ? booksById.get(meta.linkedBookId) : null,
        }
      )
      await db.execute(
        'INSERT INTO search_docs (item_id, kind, title, body, updated_at) VALUES (?, ?, ?, ?, ?)',
        [row.id, row.kind, row.title || '', body || '', null]
      )
    }
  })
}

function buildSearchSnippet(body, queryTokens) {
  const text = String(body || '').replace(/\s+/g, ' ').trim()
  if (!text) return null
  const tokens = Array.isArray(queryTokens) ? queryTokens.filter(Boolean) : []
  const lower = text.toLowerCase()
  const firstMatch = tokens.reduce((best, token) => {
    const index = lower.indexOf(token.toLowerCase())
    if (index === -1) return best
    if (best === -1 || index < best) return index
    return best
  }, -1)
  const start = Math.max(0, (firstMatch === -1 ? 0 : firstMatch) - 48)
  const end = Math.min(text.length, (firstMatch === -1 ? 0 : firstMatch) + 112)
  const excerpt = text.slice(start, end).trim()
  const snippetText = [
    start > 0 ? '…' : '',
    excerpt,
    end < text.length ? '…' : '',
  ].join('')
  return {
    text: snippetText,
    highlights: tokenizeSnippet(snippetText, tokens),
  }
}

function tokenizeSnippet(text, queryTokens) {
  if (!text) return []
  const tokens = Array.from(new Set((queryTokens || []).map((token) => token.toLowerCase()).filter(Boolean)))
  if (tokens.length === 0) return []
  const matches = []
  const lower = text.toLowerCase()
  tokens.forEach((token) => {
    let cursor = 0
    while (cursor < lower.length) {
      const index = lower.indexOf(token, cursor)
      if (index === -1) break
      matches.push({ start: index, end: index + token.length })
      cursor = index + token.length
    }
  })
  return matches.sort((a, b) => a.start - b.start)
}
