import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf'
import workerSrc from 'pdfjs-dist/legacy/build/pdf.worker?url'
import { toCloneSafeArrayBuffer } from './binary'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

let workerPromise = null
let createWorkerPromise = null

async function loadCreateWorker() {
  if (!createWorkerPromise) {
    createWorkerPromise = import('tesseract.js').then((mod) => mod.createWorker)
  }
  return createWorkerPromise
}

async function withTimeout(promise, timeoutMs, message) {
  if (!timeoutMs || timeoutMs <= 0) return promise
  let timer = null
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message || 'Operation timed out')), timeoutMs)
    }),
  ]).finally(() => {
    if (timer) clearTimeout(timer)
  })
}

async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const createWorker = await loadCreateWorker()
      const worker = await createWorker('eng', 1, {
        logger: () => {},
      })
      await worker.setParameters({
        tessedit_pageseg_mode: '1',
      })
      return worker
    })()
  }
  return workerPromise
}

export async function ocrCanvas(canvas, options = {}) {
  const { timeoutMs = 45000 } = options
  const worker = await getWorker()
  const dataUrl = canvas.toDataURL('image/png')
  const { data } = await withTimeout(
    worker.recognize(dataUrl),
    timeoutMs,
    'OCR timed out for a page'
  )
  return {
    text: data?.text || '',
    confidence: typeof data?.confidence === 'number' ? data.confidence : null,
  }
}

export async function ocrPdf(data, onProgress) {
  const loadingTask = pdfjsLib.getDocument({ data: toCloneSafeArrayBuffer(data) })
  const pdfDoc = await loadingTask.promise
  const results = []
  let totalConfidence = 0

  for (let i = 1; i <= pdfDoc.numPages; i += 1) {
    const page = await pdfDoc.getPage(i)
    const viewport = page.getViewport({ scale: 1.5 })
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    await page.render({ canvasContext: context, viewport }).promise
    const result = await ocrCanvas(canvas, { timeoutMs: 45000 })
    results.push({
      pageIndex: i,
      text: result.text,
      confidence: result.confidence,
    })
    totalConfidence += result.confidence || 0
    onProgress?.(i / pdfDoc.numPages)
  }

  pdfDoc.cleanup()
  pdfDoc.destroy()

  const averageConfidence = results.length
    ? totalConfidence / results.length
    : null

  return {
    pages: results,
    text: results.map((page) => page.text).join('\n'),
    confidence: averageConfidence,
    pageCount: pdfDoc.numPages,
  }
}
