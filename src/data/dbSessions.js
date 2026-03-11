import { withDb, withWriteDb } from './dbConnection'

export async function saveTextChunks(libraryPath, { itemId, chunks = [], source = 'extract' }) {
  return withWriteDb(libraryPath, async (db) => {
    await db.execute('DELETE FROM text_chunks WHERE item_id = ?', [itemId])
    const now = new Date().toISOString()
    for (let i = 0; i < chunks.length; i += 1) {
      const chunk = chunks[i]
      await db.execute(
        `INSERT INTO text_chunks (id, item_id, source, chunk_index, text, token_count, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          `chunk-${itemId}-${i}`,
          itemId,
          source,
          i,
          chunk.text,
          chunk.tokenCount ?? null,
          now,
        ]
      )
    }
  })
}

export async function saveOcrPages(libraryPath, { itemId, pages = [] }) {
  return withWriteDb(libraryPath, async (db) => {
    await db.execute('DELETE FROM ocr_pages WHERE item_id = ?', [itemId])
    const now = new Date().toISOString()
    for (let i = 0; i < pages.length; i += 1) {
      const page = pages[i]
      await db.execute(
        `INSERT INTO ocr_pages (id, item_id, page_index, confidence, text, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          `ocr-${itemId}-${i}`,
          itemId,
          page.pageIndex ?? i,
          page.confidence ?? null,
          page.text || '',
          now,
        ]
      )
    }
  })
}

export async function startReadingSession(libraryPath, { itemId, mode, device }) {
  return withWriteDb(libraryPath, async (db) => {
    const id = `session-${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`
    const now = new Date().toISOString()
    await db.execute(
      `INSERT INTO reading_sessions (id, item_id, started_at, mode, device)
       VALUES (?, ?, ?, ?, ?)`,
      [id, itemId, now, mode || null, device || null]
    )
    return id
  })
}

export async function endReadingSession(libraryPath, sessionId) {
  return withWriteDb(libraryPath, async (db) => {
    const rows = await db.select('SELECT started_at FROM reading_sessions WHERE id = ?', [sessionId])
    const startedAt = rows?.[0]?.started_at
    const endedAt = new Date().toISOString()
    const duration = startedAt ? Math.round((new Date(endedAt) - new Date(startedAt)) / 1000) : null
    await db.execute(
      `UPDATE reading_sessions SET ended_at = ?, duration_sec = ? WHERE id = ?`,
      [endedAt, duration, sessionId]
    )
  })
}

export async function addSnapshotRecord(libraryPath, snapshot) {
  return withWriteDb(libraryPath, async (db) => {
    await db.execute(
      `INSERT INTO snapshots (id, created_at, note, snapshot_path, hash)
       VALUES (?, ?, ?, ?, ?)`,
      [
        snapshot.id,
        snapshot.createdAt,
        snapshot.note || null,
        snapshot.path,
        snapshot.hash || null,
      ]
    )
  })
}

export async function listSnapshots(libraryPath) {
  const results = await withDb(libraryPath, async (db) => (
    db.select('SELECT * FROM snapshots ORDER BY created_at DESC')
  ))
  return results || []
}

export async function addIntegrityCheck(libraryPath, check) {
  return withWriteDb(libraryPath, async (db) => {
    await db.execute(
      `INSERT INTO integrity_checks (id, type, status, details_json, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [
        check.id,
        check.type,
        check.status,
        check.details ? JSON.stringify(check.details) : null,
        check.createdAt,
      ]
    )
  })
}

export async function listIntegrityChecks(libraryPath) {
  const results = await withDb(libraryPath, async (db) => (
    db.select('SELECT * FROM integrity_checks ORDER BY created_at DESC')
  ))
  return results || []
}

export async function runIntegrityCheck(libraryPath) {
  return withDb(libraryPath, async (db) => {
    const rows = await db.select('PRAGMA integrity_check')
    const status = rows?.[0]?.integrity_check === 'ok' ? 'ok' : 'error'
    return {
      status,
      details: rows,
    }
  })
}
