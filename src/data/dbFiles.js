export function normalizeFilePathKey(filePath) {
  if (!filePath) return null
  const path = String(filePath).trim()
  return path ? path.toLowerCase() : null
}

export function buildDocumentFilePersistence(meta = {}, duplicate = false) {
  const nextMeta = { ...meta }
  let filePath = nextMeta.filePath || null
  let fileStatus = nextMeta.fileStatus || null

  if (duplicate) {
    filePath = null
    fileStatus = 'duplicate'
    nextMeta.filePath = null
    nextMeta.fileStatus = 'duplicate'
  }

  return {
    meta: nextMeta,
    filePath,
    fileStatus,
  }
}

export async function resolveDocumentFilePersistence(db, itemId, meta = {}) {
  const pathKey = normalizeFilePathKey(meta.filePath)
  let duplicate = false

  if (pathKey) {
    const existingRows = await db.select(
      `SELECT item_id FROM files
       WHERE path IS NOT NULL
         AND path <> ''
         AND lower(path) = ?
         AND item_id <> ?
       ORDER BY mtime DESC, id DESC
       LIMIT 1`,
      [pathKey, itemId]
    )
    duplicate = Boolean(existingRows?.[0]?.item_id)
  }

  return buildDocumentFilePersistence(meta, duplicate)
}

export function resolveStateDocumentFilePersistence(meta = {}, usedFilePathKeys) {
  const pathKey = normalizeFilePathKey(meta.filePath)
  const duplicate = Boolean(pathKey && usedFilePathKeys.has(pathKey))

  if (pathKey && !duplicate) {
    usedFilePathKeys.add(pathKey)
  }

  return buildDocumentFilePersistence(meta, duplicate)
}
