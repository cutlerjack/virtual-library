import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf'
import workerSrc from 'pdfjs-dist/legacy/build/pdf.worker?url'
import ePub from 'epubjs'
import { toCloneSafeArrayBuffer } from './binary'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

export async function extractPdfText(data) {
  let loadingTask = null
  let pdfDoc = null
  try {
    loadingTask = pdfjsLib.getDocument({ data: toCloneSafeArrayBuffer(data) })
    pdfDoc = await loadingTask.promise
    const texts = []
    for (let i = 1; i <= pdfDoc.numPages; i += 1) {
      const page = await pdfDoc.getPage(i)
      const content = await page.getTextContent()
      const pageText = content.items.map((item) => item.str).join(' ')
      texts.push(pageText)
    }
    return texts.join('\n')
  } catch {
    return ''
  } finally {
    if (pdfDoc) {
      try {
        pdfDoc.cleanup?.()
      } finally {
        pdfDoc.destroy?.()
      }
    } else if (typeof loadingTask?.destroy === 'function') {
      try {
        await loadingTask.destroy()
      } catch {
        // Best-effort cleanup after a failed PDF load.
      }
    }
  }
}

export async function extractEpubText(data) {
  let book = null
  try {
    const buffer = toCloneSafeArrayBuffer(data)
    book = ePub(buffer)
    await book.ready
    const texts = []
    const spineItems = book.spine?.spineItems || []
    for (const item of spineItems) {
      try {
        const doc = await item.load(book.load.bind(book))
        if (doc?.body?.textContent) {
          texts.push(doc.body.textContent)
        }
      } catch {
        // ignore section errors
      } finally {
        try {
          item.unload()
        } catch {
          // ignore unload
        }
      }
    }
    return texts.join('\n')
  } catch {
    return ''
  } finally {
    book?.destroy?.()
  }
}

export function extractHtmlText(html) {
  if (!html) return ''
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    doc.querySelectorAll('script,style,noscript').forEach((node) => node.remove())
    return doc.body?.textContent?.replace(/\s+/g, ' ').trim() || ''
  } catch {
    return ''
  }
}

export function extractHtmlMetadata(html, url) {
  if (!html) return { title: url, site: null, publishedDate: null }
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const title =
      doc.querySelector('meta[property="og:title"]')?.getAttribute('content')
      || doc.querySelector('title')?.textContent
      || url
    const site =
      doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content')
      || (() => {
        try {
          return new URL(url).hostname
        } catch {
          return null
        }
      })()
    const publishedDate =
      doc.querySelector('meta[property="article:published_time"]')?.getAttribute('content')
      || doc.querySelector('meta[name="pubdate"]')?.getAttribute('content')
      || null
    return { title: title?.trim() || url, site, publishedDate }
  } catch {
    return { title: url, site: null, publishedDate: null }
  }
}
