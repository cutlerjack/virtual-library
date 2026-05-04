/* @vitest-environment jsdom */

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useBookHandlers } from './useBookHandlers'

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock('../utils/tauri', () => ({
  isTauri: () => false,
}))

vi.mock('../utils/articleCapture', () => ({
  captureArticle: vi.fn(),
}))

let handlers = null

function Harness(props) {
  handlers = useBookHandlers(props)
  return null
}

function renderHandlers(overrides = {}) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const props = {
    actions: { addBook: vi.fn() },
    books: [],
    updateBookItem: vi.fn(),
    updateSpineLibraryState: vi.fn(),
    insertDocumentItem: vi.fn(),
    updateUserState: vi.fn(),
    setShowAddModal: vi.fn(),
    libraryPath: '/library',
    ...overrides,
  }
  act(() => {
    root.render(<Harness {...props} />)
  })
  return {
    props,
    cleanup: () => {
      act(() => {
        root.unmount()
      })
      container.remove()
      handlers = null
    },
  }
}

afterEach(() => {
  handlers = null
  vi.restoreAllMocks()
})

describe('useBookHandlers spine library updates', () => {
  it('ignores invalid ISBN updates instead of mutating malformed book records', () => {
    const { props, cleanup } = renderHandlers({
      books: [{ id: 'book-1', isbn: 'not an isbn' }],
    })

    act(() => {
      handlers.handleUpdateSpineLibraryEntry('not an isbn', 'data:image/png;base64,spine')
    })

    expect(props.updateSpineLibraryState).not.toHaveBeenCalled()
    expect(props.updateBookItem).not.toHaveBeenCalled()
    cleanup()
  })

  it('updates books that match a normalized ISBN', () => {
    const { props, cleanup } = renderHandlers({
      books: [{ id: 'book-1', isbn: '978-0-14-312774-1' }],
    })

    act(() => {
      handlers.handleUpdateSpineLibraryEntry('9780143127741', 'data:image/png;base64,spine', { x: 1 })
    })

    expect(props.updateSpineLibraryState).toHaveBeenCalled()
    expect(props.updateBookItem).toHaveBeenCalledWith('book-1', expect.objectContaining({
      spineImage: 'data:image/png;base64,spine',
      spineSource: 'photo',
      spineCrop: { x: 1 },
    }))
    cleanup()
  })
})
