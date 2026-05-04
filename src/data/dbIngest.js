import { withDb, withWriteDb, withTransaction } from './dbConnection'
import { parseMetaJson } from './dbTransform'

const STALE_PROCESSING_JOB_MS = 15 * 60 * 1000

function mapQueuedRowToDocument(row) {
  const meta = parseMetaJson(row.item_meta_json)
  const kind = row.item_kind || null
  const type = meta.type
    || (kind === 'article' ? 'article' : (kind === 'document' ? 'document' : null))
    || 'document'
  return {
    id: row.item_id && kind ? row.item_id : null,
    title: row.item_title || meta.title || null,
    author: row.item_author || null,
    type,
    filePath: row.target_path || row.source_path || meta.filePath || row.file_path || null,
    mime: meta.mime || row.file_mime || null,
    fileName: meta.fileName || null,
    originalName: meta.originalName || meta.fileName || null,
    pageCount: meta.pageCount ?? null,
    fileHash: meta.fileHash || null,
    fileSize: meta.fileSize ?? null,
    fileMtime: meta.fileMtime ?? null,
    linkedBookId: meta.linkedBookId ?? null,
    dismissedBookIds: Array.isArray(meta.dismissedBookIds) ? meta.dismissedBookIds : [],
  }
}

export async function enqueueIngestJobUnique(libraryPath, job) {
  return withWriteDb(libraryPath, async (db) => {
    const id = job.id || `job-${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`
    const now = new Date().toISOString()
    const normalizedTargetPath = job.targetPath || job.sourcePath || null

    if (job.itemId) {
      const existing = await db.select(
        'SELECT id, status, force_ocr FROM ingest_jobs WHERE item_id = ? AND status IN (?, ?) ORDER BY created_at DESC LIMIT 1',
        [job.itemId, 'queued', 'processing']
      )
      if (existing?.length) {
        if (job.forceOcr && !existing[0].force_ocr) {
          await db.execute('UPDATE ingest_jobs SET force_ocr = 1 WHERE id = ?', [existing[0].id])
        }
        return existing[0].id
      }
    }
    if (!job.itemId && normalizedTargetPath) {
      const existing = await db.select(
        'SELECT id, status, force_ocr FROM ingest_jobs WHERE target_path = ? AND status IN (?, ?) ORDER BY created_at DESC LIMIT 1',
        [normalizedTargetPath, 'queued', 'processing']
      )
      if (existing?.length) {
        if (job.forceOcr && !existing[0].force_ocr) {
          await db.execute('UPDATE ingest_jobs SET force_ocr = 1 WHERE id = ?', [existing[0].id])
        }
        return existing[0].id
      }
    }
    await db.execute(
      `INSERT INTO ingest_jobs (id, item_id, source_path, target_path, force_ocr, status, progress, error, attempt_count, last_error_code, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        job.itemId || null,
        job.sourcePath || null,
        normalizedTargetPath,
        job.forceOcr ? 1 : 0,
        job.status || 'queued',
        job.progress ?? 0,
        job.error || null,
        job.attemptCount ?? 0,
        job.lastErrorCode || null,
        now,
        now,
      ]
    )
    return id
  })
}

export async function enqueueIngestJob(libraryPath, job) {
  return enqueueIngestJobUnique(libraryPath, job)
}

export async function listIngestJobsPaged(libraryPath, { statusSet = [], limit = 100, cursor = null } = {}) {
  const results = await withDb(libraryPath, async (db) => {
    const safeLimit = Math.max(1, Math.min(500, Number(limit) || 100))
    const where = []
    const values = []

    if (Array.isArray(statusSet) && statusSet.length > 0) {
      const placeholders = statusSet.map(() => '?').join(', ')
      where.push(`status IN (${placeholders})`)
      values.push(...statusSet)
    }
    if (cursor) {
      where.push('COALESCE(updated_at, created_at) < ?')
      values.push(cursor)
    }

    const sql = `
      SELECT *
      FROM ingest_jobs
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY COALESCE(updated_at, created_at) DESC
      LIMIT ?
    `
    const rows = await db.select(sql, [...values, safeLimit + 1])
    const list = rows || []
    const hasMore = list.length > safeLimit
    const page = hasMore ? list.slice(0, safeLimit) : list
    const last = page.length ? page[page.length - 1] : null
    return {
      rows: page,
      nextCursor: hasMore ? (last?.updated_at || last?.created_at || null) : null,
    }
  })
  return results || { rows: [], nextCursor: null }
}

export async function getIngestJobs(libraryPath, status) {
  const statusSet = status ? [status] : []
  const page = await listIngestJobsPaged(libraryPath, { statusSet, limit: 500 })
  return page.rows || []
}

export async function claimNextIngestJob(libraryPath) {
  return withWriteDb(libraryPath, async (db) => {
    return withTransaction(db, async () => {
      const staleProcessingCutoff = new Date(Date.now() - STALE_PROCESSING_JOB_MS).toISOString()
      const rows = await db.select(
        `SELECT j.*, i.kind AS item_kind, i.title AS item_title, i.author AS item_author, i.meta_json AS item_meta_json,
                f.path AS file_path, f.mime AS file_mime
         FROM ingest_jobs j
         LEFT JOIN items i ON i.id = j.item_id
         LEFT JOIN files f ON f.item_id = j.item_id
         WHERE j.status = ?
            OR (j.status = ? AND COALESCE(j.updated_at, j.created_at) < ?)
         ORDER BY j.created_at ASC
         LIMIT 1`,
        ['queued', 'processing', staleProcessingCutoff]
      )
      const job = rows?.[0]
      if (!job) return null

      const now = new Date().toISOString()
      await db.execute(
        `UPDATE ingest_jobs
         SET status = ?, progress = ?, error = NULL, updated_at = ?, attempt_count = COALESCE(attempt_count, 0) + 1
         WHERE id = ?`,
        ['processing', 0, now, job.id]
      )

      return {
        ...job,
        status: 'processing',
        progress: 0,
        updated_at: now,
        attempt_count: (job.attempt_count || 0) + 1,
        doc: mapQueuedRowToDocument(job),
      }
    })
  })
}

export async function pruneIngestJobs(libraryPath, { retentionDays = 14, maxRows = 10000 } = {}) {
  return withWriteDb(libraryPath, async (db) => {
    const terminalStatuses = ['done', 'cancelled', 'orphaned', 'failed']
    const cutoff = new Date(Date.now() - Math.max(1, Number(retentionDays) || 14) * 24 * 60 * 60 * 1000).toISOString()

    const statusPlaceholders = terminalStatuses.map(() => '?').join(', ')
    const beforeRows = await db.select(
      `SELECT id FROM ingest_jobs WHERE status IN (${statusPlaceholders})`,
      terminalStatuses
    )

    await db.execute(
      `DELETE FROM ingest_jobs
       WHERE status IN (${statusPlaceholders})
         AND COALESCE(updated_at, created_at) < ?`,
      [...terminalStatuses, cutoff]
    )

    if (Number.isFinite(maxRows) && maxRows > 0) {
      const retained = await db.select(
        `SELECT id
         FROM ingest_jobs
         WHERE status IN (${statusPlaceholders})
         ORDER BY COALESCE(updated_at, created_at) DESC`,
        terminalStatuses
      )
      if ((retained || []).length > maxRows) {
        const toDelete = retained.slice(maxRows)
        for (const row of toDelete) {
          await db.execute('DELETE FROM ingest_jobs WHERE id = ?', [row.id])
        }
      }
    }

    const afterRows = await db.select(
      `SELECT id FROM ingest_jobs WHERE status IN (${statusPlaceholders})`,
      terminalStatuses
    )

    return {
      removed: Math.max(0, (beforeRows?.length || 0) - (afterRows?.length || 0)),
      retained: afterRows?.length || 0,
    }
  })
}

export async function updateIngestJob(libraryPath, id, updates = {}) {
  return withWriteDb(libraryPath, async (db) => {
    const now = new Date().toISOString()
    const fields = []
    const values = []
    if (Object.prototype.hasOwnProperty.call(updates, 'status')) {
      fields.push('status = ?')
      values.push(updates.status)
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'progress')) {
      fields.push('progress = ?')
      values.push(updates.progress)
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'error')) {
      fields.push('error = ?')
      values.push(updates.error)
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'lastErrorCode')) {
      fields.push('last_error_code = ?')
      values.push(updates.lastErrorCode)
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'incrementAttempts') && updates.incrementAttempts) {
      fields.push('attempt_count = COALESCE(attempt_count, 0) + 1')
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'forceOcr')) {
      fields.push('force_ocr = ?')
      values.push(updates.forceOcr ? 1 : 0)
    }
    fields.push('updated_at = ?')
    values.push(now)
    values.push(id)
    if (fields.length === 1) {
      return
    }
    await db.execute(
      `UPDATE ingest_jobs SET ${fields.join(', ')} WHERE id = ?`,
      values
    )
  })
}
