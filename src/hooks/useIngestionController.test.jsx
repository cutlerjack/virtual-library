/* @vitest-environment jsdom */

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  claimNextIngestJob,
  enqueueIngestJobUnique,
  listIngestJobsPaged,
  pruneIngestJobs,
  updateIngestJob,
} from '../data/libraryDb'
import { processIngestJob } from '../utils/ingestPipeline'
import { useIngestionController } from './useIngestionController'

vi.mock('../data/libraryDb', () => ({
  enqueueIngestJobUnique: vi.fn(),
  listIngestJobsPaged: vi.fn(),
  claimNextIngestJob: vi.fn(),
  pruneIngestJobs: vi.fn(),
  updateIngestJob: vi.fn(),
  saveTextChunks: vi.fn(),
  saveOcrPages: vi.fn(),
  updateSearchDoc: vi.fn(),
}))

vi.mock('../utils/ingestPipeline', () => ({
  processIngestJob: vi.fn(),
}))

let container = null
let root = null
let currentController = null
let warnSpy = null

function IngestionHarness(props) {
  currentController = useIngestionController({
    libraryPath: '/library',
    libraryReady: true,
    books: [],
    documents: [],
    updateDocumentMeta: vi.fn(),
    ...props,
  })
  return null
}

async function flushReact() {
  await act(async () => {
    await Promise.resolve()
  })
}

async function renderIngestion(props = {}) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root.render(<IngestionHarness {...props} />)
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  currentController = null
  listIngestJobsPaged.mockResolvedValue({ rows: [] })
  pruneIngestJobs.mockResolvedValue({ deleted: 0 })
  updateIngestJob.mockResolvedValue()
  enqueueIngestJobUnique.mockResolvedValue()
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  if (root) {
    act(() => {
      root.unmount()
    })
  }
  container?.remove()
  container = null
  root = null
  currentController = null
  warnSpy?.mockRestore()
  vi.useRealTimers()
})

describe('useIngestionController', () => {
  it('catches polling interval failures', async () => {
    await renderIngestion()
    listIngestJobsPaged.mockRejectedValue(new Error('database locked'))

    await act(async () => {
      vi.advanceTimersByTime(4000)
      await Promise.resolve()
    })
    await flushReact()

    expect(currentController.visibleIngestJobs).toEqual([])
    expect(warnSpy).toHaveBeenCalledWith('[ingest] Tick failed:', 'database locked')
  })

  it('catches prune interval failures', async () => {
    await renderIngestion()
    pruneIngestJobs.mockRejectedValue(new Error('prune locked'))

    await act(async () => {
      vi.advanceTimersByTime(5 * 60 * 1000)
      await Promise.resolve()
    })
    await flushReact()

    expect(warnSpy).toHaveBeenCalledWith('[ingest] Prune failed:', 'prune locked')
  })

  it('catches retry action failures', async () => {
    await renderIngestion()
    updateIngestJob.mockRejectedValue(new Error('retry locked'))

    await act(async () => {
      await expect(currentController.retryIngest({ id: 'job-1' })).resolves.toBeUndefined()
    })

    expect(warnSpy).toHaveBeenCalledWith('[ingest] Retry failed:', 'retry locked')
  })

  it('catches cancel action failures', async () => {
    await renderIngestion()
    updateIngestJob.mockRejectedValue(new Error('cancel locked'))

    await act(async () => {
      await expect(currentController.cancelIngest({ id: 'job-1' })).resolves.toBeUndefined()
    })

    expect(warnSpy).toHaveBeenCalledWith('[ingest] Cancel failed:', 'cancel locked')
  })

  it('catches OCR queue action failures', async () => {
    await renderIngestion({
      documents: [{
        id: 'doc-1',
        type: 'pdf',
        filePath: '/library/doc.pdf',
        fileStatus: 'ok',
      }],
    })
    enqueueIngestJobUnique.mockRejectedValue(new Error('queue locked'))

    await act(async () => {
      await expect(currentController.runAllOcr()).resolves.toBeUndefined()
    })

    expect(warnSpy).toHaveBeenCalledWith('[ingest] OCR queue failed:', 'queue locked')
  })

  it('auto-enqueues imported PDFs with empty extracted text for OCR', async () => {
    await renderIngestion({
      documents: [{
        id: 'doc-empty-pdf',
        type: 'pdf',
        filePath: '/library/empty.pdf',
        fileStatus: 'ok',
        searchText: '',
        scanned: false,
      }],
    })
    await flushReact()

    expect(enqueueIngestJobUnique).toHaveBeenCalledWith('/library', {
      itemId: 'doc-empty-pdf',
      sourcePath: '/library/empty.pdf',
      targetPath: '/library/empty.pdf',
    })
  })

  it('does not repeatedly auto-enqueue already-scanned PDFs with empty text', async () => {
    await renderIngestion({
      documents: [{
        id: 'doc-scanned-empty-pdf',
        type: 'pdf',
        filePath: '/library/scanned-empty.pdf',
        fileStatus: 'ok',
        searchText: '',
        scanned: true,
      }],
    })
    await flushReact()

    expect(enqueueIngestJobUnique).not.toHaveBeenCalled()
  })

  it('does not update busy state after unmounting during a long-running ingest job', async () => {
    let resolveIngest
    claimNextIngestJob
      .mockResolvedValueOnce({
        id: 'job-1',
        status: 'processing',
        doc: {
          id: 'doc-1',
          type: 'pdf',
          filePath: '/library/doc.pdf',
        },
      })
      .mockResolvedValue(null)
    processIngestJob.mockReturnValue(new Promise((resolve) => {
      resolveIngest = resolve
    }))
    await renderIngestion()
    await flushReact()

    expect(currentController.ingestBusy).toBe(true)

    act(() => {
      root.unmount()
    })
    root = null

    await act(async () => {
      resolveIngest()
      await Promise.resolve()
    })

    expect(processIngestJob).toHaveBeenCalledTimes(1)
  })
})
