/* @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ocrPdf } from './ocr'

const pdfMock = vi.hoisted(() => ({
  GlobalWorkerOptions: {},
  getDocument: vi.fn(),
}))

vi.mock('pdfjs-dist/legacy/build/pdf', () => pdfMock)
vi.mock('pdfjs-dist/legacy/build/pdf.worker?url', () => ({
  default: 'pdf-worker.js',
}))

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    setTransform: vi.fn(),
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ocrPdf cleanup', () => {
  it('cleans up the loaded PDF when page rendering fails', async () => {
    const pdfDoc = {
      numPages: 1,
      getPage: vi.fn().mockResolvedValue({
        getViewport: vi.fn(() => ({ width: 100, height: 100 })),
        render: vi.fn(() => ({ promise: Promise.reject(new Error('render failed')) })),
      }),
      cleanup: vi.fn(),
      destroy: vi.fn(),
    }
    pdfMock.getDocument.mockReturnValue({ promise: Promise.resolve(pdfDoc) })

    await expect(ocrPdf(new Uint8Array([1, 2, 3]))).rejects.toThrow('render failed')

    expect(pdfDoc.cleanup).toHaveBeenCalled()
    expect(pdfDoc.destroy).toHaveBeenCalled()
  })

  it('destroys the loading task when PDF loading fails', async () => {
    const loadingTask = {
      promise: Promise.reject(new Error('load failed')),
      destroy: vi.fn().mockResolvedValue(undefined),
    }
    pdfMock.getDocument.mockReturnValue(loadingTask)

    await expect(ocrPdf(new Uint8Array([1, 2, 3]))).rejects.toThrow('load failed')

    expect(loadingTask.destroy).toHaveBeenCalled()
  })

  it('propagates synchronous PDF setup failures', async () => {
    pdfMock.getDocument.mockImplementationOnce(() => {
      throw new Error('setup failed')
    })

    await expect(ocrPdf(new Uint8Array([1, 2, 3]))).rejects.toThrow('setup failed')
  })
})
