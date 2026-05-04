import { readTextFile } from '@tauri-apps/api/fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  endReaderSessionBestEffort,
  startReaderSessionBestEffort,
} from '../reader/readerSessionLifecycle'
import { useReaderController } from './useReaderController'

vi.mock('@tauri-apps/api/fs', () => ({
  readBinaryFile: vi.fn(),
  readTextFile: vi.fn(),
}))

vi.mock('../utils/tauri', () => ({
  isTauri: () => true,
}))

vi.mock('../utils/epubThumbnail', () => ({
  generateEpubThumbnail: vi.fn(),
}))

vi.mock('../utils/htmlSanitizer', () => ({
  prepareCapturedHtml: vi.fn((raw) => ({
    sanitizedHtml: raw,
    plainText: raw,
    quarantined: false,
  })),
}))

vi.mock('../reader/readerSessionLifecycle', () => ({
  endReaderSessionBestEffort: vi.fn(),
  startReaderSessionBestEffort: vi.fn(),
}))

function setupController(overrides = {}) {
  const actions = {
    addDocumentNote: vi.fn(),
    scheduleDocumentMetaUpdate: vi.fn(),
    updateDocumentMeta: vi.fn(),
    ...overrides.actions,
  }
  const setters = {
    setActiveArticle: vi.fn(),
    setActiveEpub: vi.fn(),
    setActivePdf: vi.fn(),
    setActiveView: vi.fn(),
    setSearchOpen: vi.fn(),
    setVaultError: vi.fn(),
  }

  const controller = useReaderController({
    libraryPath: '/library',
    books: [],
    documents: [],
    actions,
    onOpenBook: vi.fn(),
    ...setters,
    ...overrides,
  })

  return { actions, controller, setters }
}

describe('useReaderController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    startReaderSessionBestEffort.mockResolvedValue(null)
    endReaderSessionBestEffort.mockResolvedValue(false)
  })

  it('opens a PDF even when reading session tracking is unavailable', async () => {
    const { actions, controller, setters } = setupController()

    await controller.handleReadDocument({
      id: 'doc-1',
      type: 'pdf',
      filePath: '/library/book.pdf',
      fileStatus: 'ok',
      lastPage: 7,
      mode: 'scroll',
      layout: 'single',
    })

    expect(actions.updateDocumentMeta).toHaveBeenCalledWith('doc-1', {
      lastOpened: expect.any(String),
    })
    expect(startReaderSessionBestEffort).toHaveBeenCalledWith('/library', {
      itemId: 'doc-1',
      mode: 'pdf',
    })
    expect(setters.setActivePdf).toHaveBeenCalledWith(expect.objectContaining({
      filePath: '/library/book.pdf',
      initialLocation: expect.objectContaining({ page: 1 }),
      sessionId: null,
    }))
    expect(setters.setVaultError).toHaveBeenCalledWith('')
  })

  it('ends a started session when document open fails later', async () => {
    startReaderSessionBestEffort.mockResolvedValue('session-1')
    readTextFile.mockRejectedValue(new Error('missing file'))
    const { controller, setters } = setupController()

    await controller.handleReadDocument({
      id: 'doc-1',
      type: 'article',
      filePath: '/library/article.html',
      fileStatus: 'ok',
    })

    expect(endReaderSessionBestEffort).toHaveBeenCalledWith('/library', 'session-1')
    expect(setters.setVaultError).toHaveBeenLastCalledWith('Unable to open document. missing file')
    expect(setters.setActivePdf).toHaveBeenCalledWith(null)
    expect(setters.setActiveEpub).toHaveBeenCalledWith(null)
    expect(setters.setActiveArticle).toHaveBeenCalledWith(null)
  })

  it('surfaces note save failures without rejecting', async () => {
    const { actions, controller, setters } = setupController()
    actions.addDocumentNote.mockRejectedValue(new Error('db locked'))

    await expect(controller.addDocumentNote('doc-1', { text: 'A note' }))
      .resolves.toBe(false)

    expect(setters.setVaultError).toHaveBeenCalledWith('Unable to save note. db locked')
    expect(setters.setActivePdf).not.toHaveBeenCalled()
    expect(setters.setActiveEpub).not.toHaveBeenCalled()
    expect(setters.setActiveArticle).not.toHaveBeenCalled()
  })

  it('returns true and updates active readers after a note is saved', async () => {
    const nextNotes = [{ id: 'note-1', text: 'A note' }]
    const { actions, controller, setters } = setupController()
    actions.addDocumentNote.mockResolvedValue(nextNotes)

    await expect(controller.addDocumentNote('doc-1', { text: 'A note' }))
      .resolves.toBe(true)

    const updateActivePdf = setters.setActivePdf.mock.calls[0][0]
    expect(updateActivePdf({
      doc: { id: 'doc-1', title: 'Document', notes: [] },
      filePath: '/library/doc.pdf',
    })).toEqual(expect.objectContaining({
      doc: expect.objectContaining({ notes: nextNotes }),
    }))
  })
})
