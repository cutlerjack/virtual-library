import { DB_VERSION, withDb, withWriteDb, withTransaction } from './dbConnection'
import { buildUserSettingsEntries } from './dbPreferences'
import { normalizeBookItem, normalizeDocumentItem } from './librarySchema'
import {
  parseMetaJson,
  buildAnnotationsMap,
  hydrateBookAnnotations,
  hydrateDocumentAnnotations,
  buildBookAnnotations,
  buildDocumentAnnotations,
  buildSearchText,
  buildAnnotationAnchors,
  buildAnnotationLinks,
} from './dbTransform'
import { resolveStateDocumentFilePersistence } from './dbFiles'

export async function loadLibraryStateFromDb(libraryPath) {
  return withDb(libraryPath, async (db) => {
    const itemCountRows = await db.select('SELECT COUNT(*) as count FROM items')
    const itemCount = itemCountRows?.[0]?.count || 0
    if (itemCount === 0) return null

    const itemsRows = await db.select('SELECT * FROM items')
    const shelvesRows = await db.select('SELECT * FROM shelves ORDER BY sort_order ASC')
    const itemShelvesRows = await db.select('SELECT * FROM item_shelves')
    const tagsRows = await db.select('SELECT * FROM tags')
    const itemTagsRows = await db.select('SELECT * FROM item_tags')
    const readingRows = await db.select('SELECT * FROM reading_state')
    const readerRows = await db.select('SELECT * FROM reader_state')
    const fileRows = await db.select('SELECT * FROM files')
    const annotationRows = await db.select('SELECT * FROM annotations')
    const spineRows = await db.select('SELECT * FROM spine_library')
    const settingsRows = await db.select('SELECT * FROM settings')

  const shelfMap = new Map(shelvesRows.map((row) => [row.id, row]))
  const itemShelvesMap = new Map()
  itemShelvesRows.forEach((row) => {
    if (!itemShelvesMap.has(row.item_id)) itemShelvesMap.set(row.item_id, [])
    itemShelvesMap.get(row.item_id).push(row.shelf_id)
  })

  const tagMap = new Map(tagsRows.map((row) => [row.id, row.name]))
  const itemTagsMap = new Map()
  itemTagsRows.forEach((row) => {
    if (!itemTagsMap.has(row.item_id)) itemTagsMap.set(row.item_id, [])
    itemTagsMap.get(row.item_id).push(tagMap.get(row.tag_id))
  })

  const readingMap = new Map(readingRows.map((row) => [row.item_id, row]))
  const readerMap = new Map(readerRows.map((row) => [row.item_id, row]))
  const fileMap = new Map(fileRows.map((row) => [row.item_id, row]))
  const annotationMap = buildAnnotationsMap(annotationRows)

  const spineLibrary = {}
  spineRows.forEach((row) => {
    spineLibrary[row.isbn] = {
      isbn: row.isbn,
      spineImage: row.spine_image,
      crop: parseMetaJson(row.crop_json),
      title: row.title || null,
      author: row.author || null,
      updatedAt: row.updated_at || null,
    }
  })

  let userSettings = {}
  const settingsMap = new Map()
  settingsRows.forEach((row) => {
    settingsMap.set(row.key, row.value)
    if (row.key === 'user') {
      userSettings = parseMetaJson(row.value)
    }
  })
  if (settingsMap.has('reader_max_memory_mb')) {
    userSettings.readerMaxMemoryMb = Number(settingsMap.get('reader_max_memory_mb')) || userSettings.readerMaxMemoryMb
  }
  if (settingsMap.has('reader_cache_pages')) {
    userSettings.readerCachePages = Number(settingsMap.get('reader_cache_pages')) || userSettings.readerCachePages
  }
  if (settingsMap.has('auto_snapshot_interval_hours')) {
    userSettings.autoSnapshotIntervalHours = Number(settingsMap.get('auto_snapshot_interval_hours')) || userSettings.autoSnapshotIntervalHours
  }
  if (settingsMap.has('pdf_render_memory_mb')) {
    userSettings.pdfRenderMemoryMb = Number(settingsMap.get('pdf_render_memory_mb')) || userSettings.pdfRenderMemoryMb
  }
  if (settingsMap.has('pdf_virtual_overscan_pages')) {
    userSettings.pdfVirtualOverscanPages = Number(settingsMap.get('pdf_virtual_overscan_pages')) || userSettings.pdfVirtualOverscanPages
  }
  if (settingsMap.has('ingest_job_retention_days')) {
    userSettings.ingestJobRetentionDays = Number(settingsMap.get('ingest_job_retention_days')) || userSettings.ingestJobRetentionDays
  }

  const items = itemsRows.map((row) => {
    const meta = parseMetaJson(row.meta_json)
    const tags = itemTagsMap.get(row.id)?.filter(Boolean) || []
    const shelves = itemShelvesMap.get(row.id) || []
    const reading = readerMap.get(row.id) || readingMap.get(row.id)
    const file = fileMap.get(row.id)

    const base = {
      id: row.id,
      kind: row.kind,
      title: row.title || 'Untitled',
      author: row.author || (row.kind === 'book' ? 'Unknown Author' : null),
      isbn: row.isbn || null,
      publishedDate: row.published_date || null,
      rating: typeof row.rating === 'number' ? row.rating : 0,
      coverUrl: row.cover_url || null,
      createdAt: row.created_at || null,
      updatedAt: row.updated_at || null,
      tags,
      shelves,
    }

    if (row.kind === 'book') {
      const item = normalizeBookItem({
        ...base,
        bookMeta: {
          ...meta,
          isbn: row.isbn || meta.isbn || null,
          publishedDate: row.published_date || meta.publishedDate || null,
        },
      })
      const annotations = annotationMap.get(row.id) || []
      return hydrateBookAnnotations(item, annotations)
    }

    const hasFileRow = Boolean(file)
    const docMeta = {
      ...meta,
      filePath: hasFileRow ? file.path || null : meta.filePath || null,
      fileName: meta.fileName || null,
      originalName: meta.originalName || null,
      type: meta.type || (row.kind === 'article' ? 'article' : 'file'),
      publishedDate: meta.publishedDate || row.published_date || null,
      originalUrl: meta.originalUrl || null,
      ingestSource: meta.ingestSource || null,
      mime: meta.mime || file?.mime || null,
      pageCount: meta.pageCount || file?.page_count || null,
      scanned: typeof meta.scanned === 'boolean' ? meta.scanned : Boolean(file?.scanned),
      ocrConfidence: typeof meta.ocrConfidence === 'number' ? meta.ocrConfidence : null,
      fileHash: meta.fileHash || file?.hash || null,
      fileSize: meta.fileSize || file?.size || null,
      fileMtime: meta.fileMtime || file?.mtime || null,
      fileStatus: hasFileRow ? file.status || meta.fileStatus || null : meta.fileStatus || null,
    }

    const item = normalizeDocumentItem({
      ...base,
      kind: row.kind,
      docMeta,
      reading: reading
        ? {
            lastOpened: reading.last_opened || null,
            progressPercent: reading.progress || null,
            lastPage: reading.last_page || null,
            pageCount: reading.page_count || null,
            lastLocation: reading.last_location || null,
            lastLocationJson: reading.last_location_json ? parseMetaJson(reading.last_location_json) : null,
            mode: reading.mode || null,
            layout: reading.layout || null,
            fontSize: reading.font_size || null,
          }
        : {},
    })

    const annotations = annotationMap.get(row.id) || []
    return hydrateDocumentAnnotations(item, annotations)
  })

    return {
      version: DB_VERSION,
      items,
      shelves: shelvesRows.map((row) => ({
        id: row.id,
        name: row.name,
        color: row.color,
        order: row.sort_order,
      })),
      user: userSettings,
      spineLibrary,
    }
  })
}

export async function saveLibraryStateToDb(libraryPath, state) {
  return withWriteDb(libraryPath, async (db) => {
    await withTransaction(db, async () => {
      await db.execute('UPDATE change_log_control SET enabled = 0 WHERE id = 1')
      await db.execute('DELETE FROM items')
      await db.execute('DELETE FROM shelves')
      await db.execute('DELETE FROM item_shelves')
      await db.execute('DELETE FROM tags')
      await db.execute('DELETE FROM item_tags')
      await db.execute('DELETE FROM files')
      await db.execute('DELETE FROM reading_state')
      await db.execute('DELETE FROM reader_state')
      await db.execute('DELETE FROM annotations')
      await db.execute('DELETE FROM annotation_anchors')
      await db.execute('DELETE FROM annotation_links')
      await db.execute('DELETE FROM spine_library')
      await db.execute('DELETE FROM search_docs')
      await db.execute('DELETE FROM settings')

      for (const shelf of state.shelves || []) {
        await db.execute(
          'INSERT INTO shelves (id, name, color, sort_order) VALUES (?, ?, ?, ?)',
          [shelf.id, shelf.name, shelf.color, shelf.order || 0]
        )
      }

      const tagIdMap = new Map()
      let tagIndex = 0
      const usedFilePathKeys = new Set()
      const booksById = new Map(
        (state.items || [])
          .filter((item) => item.kind === 'book')
          .map((item) => [item.id, item])
      )
      const ensureTagId = async (tag) => {
        if (!tagIdMap.has(tag)) {
          const id = `tag-${tagIndex += 1}`
          tagIdMap.set(tag, id)
          await db.execute('INSERT INTO tags (id, name) VALUES (?, ?)', [id, tag])
        }
        return tagIdMap.get(tag)
      }

      for (const [isbn, entry] of Object.entries(state.spineLibrary || {})) {
        await db.execute(
          'INSERT INTO spine_library (isbn, spine_image, crop_json, title, author, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
          [
            isbn,
            entry.spineImage || null,
            entry.crop ? JSON.stringify(entry.crop) : null,
            entry.title || null,
            entry.author || null,
            entry.updatedAt || null,
          ]
        )
      }

      const userSettings = state.user || {}
      for (const [key, value, updatedAt] of buildUserSettingsEntries(userSettings)) {
        await db.execute(
          'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)',
          [key, value, updatedAt]
        )
      }

      for (const item of state.items || []) {
        const kind = item.kind || (item.docMeta?.type === 'article' ? 'article' : 'document')
        let meta = item.kind === 'book'
          ? {
              ...(item.bookMeta || {}),
              status: item.status || null,
            }
          : (item.docMeta || {})
        const publishedDate = item.publishedDate || meta.publishedDate || null
        let filePath = null
        let fileStatus = null
        if (kind === 'document' || kind === 'article') {
          const filePersistence = resolveStateDocumentFilePersistence(meta, usedFilePathKeys)
          meta = filePersistence.meta
          filePath = filePersistence.filePath
          fileStatus = filePersistence.fileStatus
        }

      await db.execute(
        `INSERT INTO items (id, kind, title, author, isbn, published_date, rating, cover_url, created_at, updated_at, meta_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
        [
          item.id,
          kind,
          item.title || null,
          item.author || null,
          item.isbn || meta.isbn || null,
          publishedDate,
          item.rating || 0,
          item.coverUrl || null,
          item.createdAt || null,
          item.updatedAt || null,
          JSON.stringify(meta),
        ]
      )

      for (const shelfId of item.shelves || []) {
        await db.execute('INSERT INTO item_shelves (item_id, shelf_id) VALUES (?, ?)', [item.id, shelfId])
      }

      for (const tag of item.tags || []) {
        const tagId = await ensureTagId(tag)
        await db.execute('INSERT INTO item_tags (item_id, tag_id) VALUES (?, ?)', [item.id, tagId])
      }

      if (kind === 'document' || kind === 'article') {
        const reading = item.reading || {}
        await db.execute(
          `INSERT INTO reading_state
          (item_id, last_opened, progress, last_page, page_count, last_location, mode, layout, font_size)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.id,
            reading.lastOpened || null,
            reading.progressPercent ?? null,
            reading.lastPage ?? null,
            reading.pageCount ?? null,
            reading.lastLocation || null,
            reading.mode || null,
            reading.layout || null,
            reading.fontSize ?? null,
          ]
        )
        await db.execute(
          `INSERT INTO reader_state
          (item_id, last_location_json, last_page, progress, font_size, layout, mode, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.id,
            reading.lastLocationJson ? JSON.stringify(reading.lastLocationJson) : null,
            reading.lastPage ?? null,
            reading.progressPercent ?? null,
            reading.fontSize ?? null,
            reading.layout || null,
            reading.mode || null,
            item.updatedAt || null,
          ]
        )

        const fileId = `${item.id}-file`
        const docMeta = meta
        await db.execute(
          `INSERT INTO files (id, item_id, path, hash, size, mtime, mime, page_count, scanned, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            fileId,
            item.id,
            filePath,
            docMeta.fileHash || null,
            docMeta.fileSize || null,
            docMeta.fileMtime || null,
            docMeta.mime || null,
            docMeta.pageCount ?? null,
            docMeta.scanned ? 1 : 0,
            fileStatus,
          ]
        )
      }

      const annotations = kind === 'book'
        ? buildBookAnnotations(item)
        : buildDocumentAnnotations(item)
      const anchors = buildAnnotationAnchors(item, annotations)
      const links = buildAnnotationLinks(anchors)

      for (const annotation of annotations) {
        await db.execute(
          `INSERT INTO annotations (id, item_id, type, body, locator_json, title, color, source, body_rich, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            annotation.id,
            item.id,
            annotation.type,
            annotation.body || null,
            annotation.locator ? JSON.stringify(annotation.locator) : null,
            annotation.title || null,
            annotation.color || null,
            annotation.source || null,
            annotation.bodyRich ? JSON.stringify(annotation.bodyRich) : null,
            annotation.createdAt || null,
          ]
        )
      }

      for (const anchor of anchors) {
        await db.execute(
          `INSERT INTO annotation_anchors
          (id, annotation_id, item_id, kind, locator_json, text_snippet, page, cfi, scroll_offset, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            anchor.id,
            anchor.annotationId,
            anchor.itemId,
            anchor.kind,
            anchor.locator ? JSON.stringify(anchor.locator) : null,
            anchor.textSnippet || null,
            anchor.page ?? null,
            anchor.cfi ?? null,
            anchor.scrollOffset ?? null,
            anchor.createdAt || null,
          ]
        )
      }

      for (const link of links) {
        await db.execute(
          `INSERT INTO annotation_links (id, from_annotation_id, to_annotation_id, created_at)
           VALUES (?, ?, ?, ?)`,
          [
            link.id,
            link.from,
            link.to,
            link.createdAt || null,
          ]
        )
      }

      await db.execute(
        'INSERT INTO search_docs (item_id, kind, title, body, updated_at) VALUES (?, ?, ?, ?, ?)',
        [
          item.id,
          kind,
          item.title || '',
          buildSearchText(item, {
            linkedBook: kind === 'document' || kind === 'article'
              ? booksById.get(item.docMeta?.linkedBookId)
              : null,
          }),
          item.updatedAt || null,
        ]
      )
      }

      await db.execute('UPDATE change_log_control SET enabled = 1 WHERE id = 1')
    })
  })
}
