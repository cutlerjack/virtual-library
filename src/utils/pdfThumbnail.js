import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf'
import workerSrc from 'pdfjs-dist/legacy/build/pdf.worker?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

export async function generatePdfThumbnail(data, targetWidth = 220) {
  const loadingTask = pdfjsLib.getDocument({ data })
  const pdfDoc = await loadingTask.promise
  const page = await pdfDoc.getPage(1)
  const viewport = page.getViewport({ scale: 1 })
  const scale = targetWidth / viewport.width
  const scaledViewport = page.getViewport({ scale })

  const canvas = document.createElement('canvas')
  const outputScale = window.devicePixelRatio || 1
  canvas.width = Math.floor(scaledViewport.width * outputScale)
  canvas.height = Math.floor(scaledViewport.height * outputScale)
  canvas.style.width = `${scaledViewport.width}px`
  canvas.style.height = `${scaledViewport.height}px`

  const context = canvas.getContext('2d')
  context.setTransform(outputScale, 0, 0, outputScale, 0, 0)
  await page.render({ canvasContext: context, viewport: scaledViewport }).promise

  const dataUrl = canvas.toDataURL('image/png')
  pdfDoc.cleanup()
  pdfDoc.destroy()
  return dataUrl
}
