/* @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { generatePdfThumbnail } from './pdfThumbnail'

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
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,thumb')
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('generatePdfThumbnail', () => {
  it('cleans up the loaded PDF document when rendering fails', async () => {
    const pdfDoc = {
      getPage: vi.fn().mockResolvedValue({
        getViewport: vi.fn(({ scale }) => ({ width: 100 * scale, height: 200 * scale })),
        render: vi.fn(() => ({ promise: Promise.reject(new Error('render failed')) })),
      }),
      cleanup: vi.fn(),
      destroy: vi.fn(),
    }
    pdfMock.getDocument.mockReturnValue({ promise: Promise.resolve(pdfDoc) })

    await expect(generatePdfThumbnail(new Uint8Array([1, 2, 3]))).rejects.toThrow('render failed')

    expect(pdfDoc.cleanup).toHaveBeenCalled()
    expect(pdfDoc.destroy).toHaveBeenCalled()
  })

  it('destroys the loaded PDF document after successful thumbnail generation', async () => {
    const pdfDoc = {
      getPage: vi.fn().mockResolvedValue({
        getViewport: vi.fn(({ scale }) => ({ width: 100 * scale, height: 200 * scale })),
        render: vi.fn(() => ({ promise: Promise.resolve() })),
      }),
      cleanup: vi.fn(),
      destroy: vi.fn(),
    }
    pdfMock.getDocument.mockReturnValue({ promise: Promise.resolve(pdfDoc) })

    await expect(generatePdfThumbnail(new Uint8Array([1, 2, 3]))).resolves.toBe('data:image/png;base64,thumb')

    expect(pdfDoc.cleanup).toHaveBeenCalled()
    expect(pdfDoc.destroy).toHaveBeenCalled()
  })

  it('destroys the loading task when the PDF document fails to load', async () => {
    const loadingTask = {
      promise: Promise.reject(new Error('load failed')),
      destroy: vi.fn().mockResolvedValue(undefined),
    }
    pdfMock.getDocument.mockReturnValue(loadingTask)

    await expect(generatePdfThumbnail(new Uint8Array([1, 2, 3]))).rejects.toThrow('load failed')

    expect(loadingTask.destroy).toHaveBeenCalled()
  })

  it('propagates synchronous PDF setup failures', async () => {
    pdfMock.getDocument.mockImplementationOnce(() => {
      throw new Error('setup failed')
    })

    await expect(generatePdfThumbnail(new Uint8Array([1, 2, 3]))).rejects.toThrow('setup failed')
  })
})
