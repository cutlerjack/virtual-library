import { writeTextFile } from '@tauri-apps/api/fs'
import { join } from '@tauri-apps/api/path'
import { computeSha256 } from './fileHash'
import { extractHtmlMetadata, extractHtmlText } from './textExtract'
import { generateId } from './storage'
import { isTauri } from './tauri'

export async function captureArticle({ url, libraryPath }) {
  if (!isTauri() || !libraryPath) return null
  const response = await fetch(url)
  const html = await response.text()
  const { title, site, publishedDate } = extractHtmlMetadata(html, url)
  const id = generateId()
  const fileName = `${id}.html`
  const filePath = await join(libraryPath, 'articles', fileName)
  await writeTextFile(filePath, html)
  const encoded = new TextEncoder().encode(html)
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
    fileStatus: 'ok',
    searchText: extractHtmlText(html),
    addedAt: new Date().toISOString(),
  }
}
