import { writeTextFile } from '@tauri-apps/api/fs'
import { join } from '@tauri-apps/api/path'
import { computeSha256 } from './fileHash'
import { extractHtmlMetadata, extractHtmlText } from './textExtract'
import { prepareCapturedHtml } from './htmlSanitizer'
import { generateId } from './storage'
import { isTauri } from './tauri'

const ARTICLE_FETCH_TIMEOUT_MS = 15000

async function fetchWithTimeout(url, timeoutMs = ARTICLE_FETCH_TIMEOUT_MS) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { signal: controller.signal })
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Article fetch timed out.')
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

export async function captureArticle({ url, libraryPath, timeoutMs = ARTICLE_FETCH_TIMEOUT_MS }) {
  if (!isTauri() || !libraryPath) return null
  const parsedUrl = new URL(url)
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('Only http and https article URLs are supported.')
  }

  const response = await fetchWithTimeout(parsedUrl.toString(), timeoutMs)
  if (!response.ok) {
    throw new Error(`Unable to fetch article (${response.status}).`)
  }
  const contentType = response.headers.get('content-type') || ''
  if (contentType && !/(text\/html|application\/xhtml\+xml)/i.test(contentType)) {
    throw new Error(`Unsupported article content type: ${contentType}`)
  }

  const html = await response.text()
  const { title, site, publishedDate } = extractHtmlMetadata(html, url)
  const prepared = prepareCapturedHtml(html)
  const id = generateId()
  const fileName = `${id}.html`
  const filePath = await join(libraryPath, 'articles', fileName)
  const persistedContent = prepared.sanitizedHtml || prepared.plainText
  await writeTextFile(filePath, persistedContent)
  const encoded = new TextEncoder().encode(persistedContent)
  const hash = await computeSha256(encoded)
  const fileSize = encoded?.length ?? null

  return {
    id,
    kind: 'article',
    title: title || url,
    author: site || null,
    fileName,
    originalName: title || url,
    filePath,
    type: 'article',
    sourceUrl: url,
    originalUrl: url,
    ingestSource: 'article',
    mime: 'text/html',
    publishedDate: publishedDate || null,
    fileHash: hash,
    fileSize,
    fileMtime: null,
    fileStatus: prepared.quarantined ? 'quarantined' : 'ok',
    searchText: prepared.plainText || extractHtmlText(html),
    plainText: prepared.plainText || '',
    sanitizedHtml: prepared.sanitizedHtml || null,
    quarantined: prepared.quarantined,
    addedAt: new Date().toISOString(),
  }
}
