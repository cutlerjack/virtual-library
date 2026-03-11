import { readBinaryFile, readTextFile } from '@tauri-apps/api/fs'
import { extractPdfText, extractEpubText, extractHtmlText } from './textExtract'
import { computeSha256 } from './fileHash'
import { ocrPdf } from './ocr'

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

  try {
    if (doc?.type === 'article') {
      const html = await readTextFile(path)
      searchText = extractHtmlText(html)
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
    await updateDoc(doc.id, {
      searchText,
      scanned,
      ocrConfidence,
      pageCount,
      mime: guessMime(path, doc.mime),
      fileHash: hash,
      fileSize,
      fileMtime,
    })
    await updateSearchDoc(doc.id, doc.type, doc.title, searchText)

    await updateJob(job.id, { status: 'done', progress: 1 })
  } catch (error) {
    await updateJob(job.id, { status: 'failed', error: error?.message || 'Ingest failed' })
  }
}
