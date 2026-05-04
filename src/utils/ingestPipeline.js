import { readBinaryFile, readTextFile } from '@tauri-apps/api/fs'
import { buildSearchText } from '../data/dbTransform'
import { extractPdfText, extractEpubText, extractHtmlText } from './textExtract'
import { computeSha256 } from './fileHash'
import { ocrPdf } from './ocr'
import { selectAutomaticBookMatch } from './libraryRelations'
import { prepareCapturedHtml } from './htmlSanitizer'

const OCR_THRESHOLD = 200
const DEFAULT_CHUNK_SIZE = 1800

function guessMime(path, fallback) {
  if (fallback) return fallback
  const lower = path?.toLowerCase?.() || ''
  if (lower.endsWith('.pdf')) return 'application/pdf'
  if (lower.endsWith('.epub')) return 'application/epub+zip'
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'text/html'
  return 'application/octet-stream'
}

export function chunkText(text, size = DEFAULT_CHUNK_SIZE) {
  if (!text) return []
  const chunks = []
  let cursor = 0
  while (cursor < text.length) {
    const slice = text.slice(cursor, cursor + size)
    chunks.push({
      text: slice,
      tokenCount: slice.trim().split(/\s+/).filter(Boolean).length,
    })
    cursor += size
  }
  return chunks
}

export async function processIngestJob({
  job,
  doc,
  books = [],
  updateJob,
  updateDoc,
  saveChunks,
  saveOcrPages,
  updateSearchDoc,
}) {
  const path = job.target_path || doc?.filePath
  if (!path) {
    await updateJob(job.id, { status: 'failed', error: 'Missing file path.' })
    return
  }

  const forceOcr = job?.force_ocr === 1 || job?.force_ocr === true
  await updateJob(job.id, { status: 'processing', progress: 0, error: null })
  let searchText = ''
  let pageCount = doc?.pageCount || null
  let scanned = false
  let ocrConfidence = null
  let ocrPages = []
  let hash = doc?.fileHash || null
  let fileSize = doc?.fileSize || null
  const fileMtime = doc?.fileMtime || null
  let lastProgressTick = -1
  let sanitizedHtml = doc?.sanitizedHtml || null
  let plainText = doc?.plainText || null
  let quarantined = Boolean(doc?.quarantined)

  try {
    if (doc?.type === 'article') {
      const html = await readTextFile(path)
      const prepared = prepareCapturedHtml(html)
      sanitizedHtml = prepared.sanitizedHtml || null
      plainText = prepared.plainText || extractHtmlText(html)
      quarantined = prepared.quarantined
      searchText = plainText
      if (!fileSize) {
        try {
          fileSize = new TextEncoder().encode(html || '').length
        } catch {
          fileSize = html?.length || null
        }
      }
    } else if (doc?.type === 'epub') {
      const binary = await readBinaryFile(path)
      searchText = await extractEpubText(binary)
      if (!hash) hash = await computeSha256(binary)
      if (!fileSize) fileSize = binary?.byteLength ?? binary?.length ?? null
    } else {
      const binary = await readBinaryFile(path)
      searchText = await extractPdfText(binary)
      if (!hash) hash = await computeSha256(binary)
      if (!fileSize) fileSize = binary?.byteLength ?? binary?.length ?? null
      if (forceOcr || (searchText || '').length < OCR_THRESHOLD) {
        scanned = true
        const ocr = await ocrPdf(binary, (progress) => {
          const safeProgress = Math.max(0, Math.min(1, Number(progress) || 0))
          if (safeProgress < 1 && safeProgress - lastProgressTick < 0.02) return
          lastProgressTick = safeProgress
          updateJob(job.id, { progress: safeProgress })
        })
        searchText = ocr.text || searchText
        pageCount = ocr.pageCount || pageCount
        ocrConfidence = ocr.confidence
        ocrPages = ocr.pages
      }
    }

    const chunks = chunkText(searchText)
    await saveChunks(doc.id, chunks, scanned ? 'ocr' : 'extract')
    if (ocrPages.length > 0) {
      await saveOcrPages(doc.id, ocrPages)
    }
    const candidateDoc = {
      ...doc,
      searchText,
      pageCount,
      mime: guessMime(path, doc.mime),
      fileHash: hash,
      fileSize,
      fileMtime,
    }
    const existingLinkedBook = doc?.linkedBookId
      ? books.find((book) => book.id === doc.linkedBookId) || null
      : null
    const automaticMatch = !existingLinkedBook
      ? selectAutomaticBookMatch(candidateDoc, books)
      : null
    const linkedBook = existingLinkedBook || automaticMatch?.book || null
    const nextDocUpdates = {
      searchText,
      scanned,
      ocrConfidence,
      pageCount,
      mime: guessMime(path, doc.mime),
      fileHash: hash,
      fileSize,
      fileMtime,
      ...(doc?.type === 'article'
        ? {
            plainText,
            sanitizedHtml,
            quarantined,
            fileStatus: quarantined ? 'quarantined' : (doc?.fileStatus || 'ok'),
          }
        : {}),
    }
    if (automaticMatch?.book?.id) {
      nextDocUpdates.linkedBookId = automaticMatch.book.id
    }

    await updateDoc(doc.id, nextDocUpdates)
    await updateSearchDoc(
      doc.id,
      doc.type === 'article' ? 'article' : 'document',
      doc.title,
      buildSearchText(
        {
          kind: doc.type === 'article' ? 'article' : 'document',
          title: doc.title,
          author: doc.author || null,
          tags: [],
          docMeta: { searchText },
          annotations: { notes: [], highlights: [] },
        },
        { linkedBook }
      )
    )

    await updateJob(job.id, { status: 'done', progress: 1 })
  } catch (error) {
    await updateJob(job.id, { status: 'failed', error: error?.message || 'Ingest failed' })
  }
}
