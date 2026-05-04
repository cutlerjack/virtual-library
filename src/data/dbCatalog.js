import { withTransaction, withWriteDb } from './dbConnection'
import { normalizeBookItem, normalizeDocumentItem } from './librarySchema'
import {
  buildAnnotationAnchors,
  buildAnnotationLinks,
  buildBookAnnotations,
  buildDocumentAnnotations,
  buildSearchText,
} from './dbTransform'
import { resolveDocumentFilePersistence } from './dbFiles'

function makeId(prefix) {
  if (crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

async function syncItemTags(db, itemId, tags = []) {
  await db.execute('DELETE FROM item_tags WHERE item_id = ?', [itemId])
  for (const rawTag of tags) {
    const tag = String(rawTag || '').trim()
    if (!tag) continue
    const existing = await db.select('SELECT id FROM tags WHERE name = ? LIMIT 1', [tag])
    const tagId = existing?.[0]?.id || makeId('tag')
    if (!existing?.[0]?.id) {
      await db.execute('INSERT OR IGNORE INTO tags (id, name) VALUES (?, ?)', [tagId, tag])
    }
    await db.execute(
      'INSERT OR REPLACE INTO item_tags (item_id, tag_id) VALUES (?, ?)',
      [itemId, tagId]
    )
  }
  await db.execute('DELETE FROM tags WHERE id NOT IN (SELECT DISTINCT tag_id FROM item_tags)')
}

async function syncItemShelves(db, itemId, shelves = []) {
  await db.execute('DELETE FROM item_shelves WHERE item_id = ?', [itemId])
  for (const shelfId of shelves) {
    await db.execute(
      'INSERT OR REPLACE INTO item_shelves (item_id, shelf_id) VALUES (?, ?)',
      [itemId, shelfId]
    )
  }
}

async function syncItemAnnotations(db, item, annotations) {
  await db.execute(
    `DELETE FROM annotation_links
     WHERE from_annotation_id IN (SELECT id FROM annotations WHERE item_id = ?)
        OR to_annotation_id IN (SELECT id FROM annotations WHERE item_id = ?)`,
    [item.id, item.id]
  )
  await db.execute('DELETE FROM annotation_anchors WHERE item_id = ?', [item.id])
  await db.execute('DELETE FROM annotations WHERE item_id = ?', [item.id])

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
      [link.id, link.from, link.to, link.createdAt || null]
    )
  }
}

async function syncSearchDoc(db, item, kind, body) {
  await db.execute('DELETE FROM search_docs WHERE item_id = ?', [item.id])
  await db.execute(
    'INSERT INTO search_docs (item_id, kind, title, body, updated_at) VALUES (?, ?, ?, ?, ?)',
    [item.id, kind, item.title || '', body || '', item.updatedAt || null]
  )
}

export async function saveBookItemToDb(libraryPath, item) {
  const book = normalizeBookItem(item)
  return withWriteDb(libraryPath, async (db) => {
    await withTransaction(db, async () => {
      const meta = {
        ...(book.bookMeta || {}),
        status: book.status || null,
      }
      const publishedDate = meta.publishedDate || null
      await db.execute(
        `INSERT INTO items (id, kind, title, author, isbn, published_date, rating, cover_url, created_at, updated_at, meta_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           kind = excluded.kind,
           title = excluded.title,
           author = excluded.author,
           isbn = excluded.isbn,
           published_date = excluded.published_date,
           rating = excluded.rating,
           cover_url = excluded.cover_url,
           created_at = excluded.created_at,
           updated_at = excluded.updated_at,
           meta_json = excluded.meta_json`,
        [
          book.id,
          'book',
          book.title || null,
          book.author || null,
          meta.isbn || null,
          publishedDate,
          book.rating || 0,
          book.coverUrl || null,
          book.createdAt || null,
          book.updatedAt || null,
          JSON.stringify(meta),
        ]
      )

      await syncItemShelves(db, book.id, book.shelves || [])
      await syncItemTags(db, book.id, book.tags || [])
      await syncItemAnnotations(db, book, buildBookAnnotations(book))
      await syncSearchDoc(db, book, 'book', buildSearchText(book))
    })
  })
}

export async function saveDocumentItemToDb(libraryPath, item) {
  const document = normalizeDocumentItem(item)
  return withWriteDb(libraryPath, async (db) => {
    await withTransaction(db, async () => {
      const { meta, filePath, fileStatus } = await resolveDocumentFilePersistence(
        db,
        document.id,
        document.docMeta || {}
      )
      const publishedDate = meta.publishedDate || null
      const kind = document.kind === 'article' ? 'article' : 'document'

      await db.execute(
        `INSERT INTO items (id, kind, title, author, isbn, published_date, rating, cover_url, created_at, updated_at, meta_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           kind = excluded.kind,
           title = excluded.title,
           author = excluded.author,
           isbn = excluded.isbn,
           published_date = excluded.published_date,
           rating = excluded.rating,
           cover_url = excluded.cover_url,
           created_at = excluded.created_at,
           updated_at = excluded.updated_at,
           meta_json = excluded.meta_json`,
        [
          document.id,
          kind,
          document.title || null,
          document.author || null,
          null,
          publishedDate,
          0,
          document.coverUrl || null,
          document.createdAt || null,
          document.updatedAt || null,
          JSON.stringify(meta),
        ]
      )

      await syncItemShelves(db, document.id, document.shelves || [])
      await syncItemTags(db, document.id, document.tags || [])

      const reading = document.reading || {}
      await db.execute(
        `INSERT INTO reading_state
         (item_id, last_opened, progress, last_page, page_count, last_location, mode, layout, font_size)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(item_id) DO UPDATE SET
           last_opened = excluded.last_opened,
           progress = excluded.progress,
           last_page = excluded.last_page,
           page_count = excluded.page_count,
           last_location = excluded.last_location,
           mode = excluded.mode,
           layout = excluded.layout,
           font_size = excluded.font_size`,
        [
          document.id,
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
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(item_id) DO UPDATE SET
           last_location_json = excluded.last_location_json,
           last_page = excluded.last_page,
           progress = excluded.progress,
           font_size = excluded.font_size,
           layout = excluded.layout,
           mode = excluded.mode,
           updated_at = excluded.updated_at`,
        [
          document.id,
          reading.lastLocationJson ? JSON.stringify(reading.lastLocationJson) : null,
          reading.lastPage ?? null,
          reading.progressPercent ?? null,
          reading.fontSize ?? null,
          reading.layout || null,
          reading.mode || null,
          document.updatedAt || null,
        ]
      )

      await db.execute(
        `INSERT INTO files (id, item_id, path, hash, size, mtime, mime, page_count, scanned, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           item_id = excluded.item_id,
           path = excluded.path,
           hash = excluded.hash,
           size = excluded.size,
           mtime = excluded.mtime,
           mime = excluded.mime,
           page_count = excluded.page_count,
           scanned = excluded.scanned,
           status = excluded.status`,
        [
          `${document.id}-file`,
          document.id,
          filePath,
          meta.fileHash || null,
          meta.fileSize || null,
          meta.fileMtime || null,
          meta.mime || null,
          meta.pageCount ?? null,
          meta.scanned ? 1 : 0,
          fileStatus,
        ]
      )

      const annotations = buildDocumentAnnotations(document)
      await syncItemAnnotations(db, document, annotations)

      let linkedBook = null
      if (meta.linkedBookId) {
        const rows = await db.select('SELECT title, author FROM items WHERE id = ? LIMIT 1', [meta.linkedBookId])
        if (rows?.[0]) {
          linkedBook = {
            title: rows[0].title || '',
            author: rows[0].author || null,
          }
        }
      }

      await syncSearchDoc(
        db,
        document,
        kind,
        buildSearchText(
          {
            kind,
            title: document.title,
            author: document.author || null,
            tags: document.tags || [],
            docMeta: meta,
            annotations: document.annotations || { notes: [], highlights: [] },
          },
          { linkedBook }
        )
      )
    })
  })
}

export async function deleteItemFromDb(libraryPath, itemId) {
  if (!itemId) return
  return withWriteDb(libraryPath, async (db) => {
    await withTransaction(db, async () => {
      await db.execute(
        `DELETE FROM annotation_links
         WHERE from_annotation_id IN (SELECT id FROM annotations WHERE item_id = ?)
            OR to_annotation_id IN (SELECT id FROM annotations WHERE item_id = ?)`,
        [itemId, itemId]
      )
      await db.execute('DELETE FROM annotation_anchors WHERE item_id = ?', [itemId])
      await db.execute('DELETE FROM annotations WHERE item_id = ?', [itemId])
      await db.execute('DELETE FROM item_shelves WHERE item_id = ?', [itemId])
      await db.execute('DELETE FROM item_tags WHERE item_id = ?', [itemId])
      await db.execute('DELETE FROM files WHERE item_id = ?', [itemId])
      await db.execute('DELETE FROM reading_state WHERE item_id = ?', [itemId])
      await db.execute('DELETE FROM reader_state WHERE item_id = ?', [itemId])
      await db.execute('DELETE FROM reading_sessions WHERE item_id = ?', [itemId])
      await db.execute('DELETE FROM text_chunks WHERE item_id = ?', [itemId])
      await db.execute('DELETE FROM ocr_pages WHERE item_id = ?', [itemId])
      await db.execute('DELETE FROM ingest_jobs WHERE item_id = ?', [itemId])
      await db.execute('DELETE FROM search_docs WHERE item_id = ?', [itemId])
      await db.execute('DELETE FROM items WHERE id = ?', [itemId])
      await db.execute('DELETE FROM tags WHERE id NOT IN (SELECT DISTINCT tag_id FROM item_tags)')
    })
  })
}
