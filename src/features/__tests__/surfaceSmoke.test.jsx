/* @vitest-environment jsdom */

import React, { act } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import LibraryView from '../library/LibraryView'
import MaintenanceView from '../maintenance/MaintenanceView'
import ReadingRoomView from '../reading-room/ReadingRoomView'
import InsightsView from '../insights/InsightsView'
import BookPage from '../../pages/BookPage'
import AddBookModal from '../../components/AddBookModal'
import PreferencesPanel from '../../components/PreferencesPanel'
import StarRating from '../../components/StarRating'
import MemoryResurface from '../../components/MemoryResurface'
import StatsDashboard from '../../components/StatsDashboard'
import TodayPanel from '../../components/TodayPanel'
import { getFocusableElements } from '../../components/useOverlayFocusTrap'

let container = null
let root = null

function renderIntoDom(element) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(element)
  })
  return container
}

async function setInputValue(input, value) {
  const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
  await act(async () => {
    valueSetter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

afterEach(() => {
  if (root) {
    act(() => {
      root.unmount()
    })
  }
  if (container?.parentNode) {
    container.parentNode.removeChild(container)
  }
  root = null
  container = null
  document.body.style.overflow = ''
})

function createLibraryViewProps() {
  return {
    books: [],
    documents: [],
    shelves: [{ id: 'all', name: 'All Books', color: '#8b4513', order: 0 }],
    userData: {},
    spineLibraryEntries: [],
    viewMode: 'spine',
    icons: { library: 'L', book: 'B' },
    showCustomizer: false,
    actions: {
      addShelf: () => {},
      deleteShelf: () => {},
    },
    updateUserState: () => {},
    onSelectBook: () => {},
    onReadDocument: () => {},
    onOpenAnnotation: () => {},
    onOpenBook: () => {},
    onRequestAddBook: () => {},
    onNavigateToDocuments: () => {},
    handleUpdateSpineLibraryEntry: () => {},
    handleRemoveSpineLibraryEntry: () => {},
  }
}

function createBookPageProps() {
  return {
    books: [],
    documents: [],
    shelves: [],
    onUpdate: () => {},
    onUpdateDocument: () => {},
    onDelete: () => {},
    onLogPages: () => {},
    onUndoLastPageLog: () => {},
    onAddQuote: () => {},
    onAddReflection: () => {},
    onPinStudyEntry: () => {},
    onRemoveStudyEntry: () => {},
    onUpdateStudyEntry: () => {},
    onMoveStudyEntry: () => {},
    onReviewStudyEntry: () => {},
    onToggleStudyEntryComplete: () => {},
    onStartStudySession: () => {},
    onResetStudySession: () => {},
    onOpenStudyEntry: () => {},
    onSelectBook: () => {},
    onReadDocument: () => {},
    onOpenAnnotation: () => {},
    onNavigateToDocuments: () => {},
    viewMode: 'spine',
  }
}

function createReadingRoomProps() {
  return {
    books: [],
    documents: [],
    shelves: [{ id: 'all', name: 'All Books', color: '#8b4513', order: 0 }],
    allLibraryTags: [],
    libraryPath: null,
    onImport: () => {},
    onReadDocument: () => {},
    onUpdateDocument: () => {},
    onNavigateToLibrary: () => {},
    onOpenBook: () => {},
    vaultError: '',
    lastRescanAt: null,
    ingestJobs: [],
    ingestBusy: false,
    onRetryIngest: () => {},
    onCancelIngest: () => {},
    onRunAllOcr: () => {},
  }
}

function createInsightsProps() {
  return {
    books: [],
    userData: {
      yearlyGoal: 12,
      quests: [],
      statsAdjustments: {},
      readingStreak: { current: 0, best: 0 },
    },
    actions: {
      logPages: () => {},
      addQuote: () => {},
      addReflection: () => {},
    },
    onOpenBook: () => {},
    onUpdateGoal: () => {},
    onUpdateUserData: () => {},
    theme: 'classic',
  }
}

describe('surface smoke', () => {
  it('renders the empty library home state', () => {
    const node = renderIntoDom(
      <MemoryRouter>
        <LibraryView {...createLibraryViewProps()} />
      </MemoryRouter>
    )

    expect(node.textContent).toContain('Build the shelf from here')
    expect(node.textContent).toContain('Add Your First Volume')
  })

  it('renders the desktop-only maintenance fallback in the web shell', () => {
    const node = renderIntoDom(
      <MemoryRouter>
        <MaintenanceView
          isDesktop={false}
          libraryPath={null}
          userData={{}}
          maintenanceStatus=""
          backupBusy={false}
          restoreBusy={false}
          rescanBusy={false}
          lastRescanAt={null}
          snapshots={[]}
          snapshotBusy={false}
          integrityStatus={null}
          doctorBusy={false}
          onUpdateUserData={() => {}}
          onRescanLibrary={() => {}}
          onExportBackup={() => {}}
          onRestoreBackup={() => {}}
          onCreateSnapshot={() => {}}
          onRestoreSnapshot={() => {}}
          onRunDoctor={() => {}}
          onRebuildIndex={() => {}}
        />
      </MemoryRouter>
    )

    expect(node.textContent).toContain('Desktop App Required')
  })

  it('opens snapshot restore confirmation and forwards the chosen snapshot', () => {
    const restored = []
    const node = renderIntoDom(
      <MemoryRouter>
        <MaintenanceView
          isDesktop
          libraryPath="/tmp/library"
          userData={{}}
          maintenanceStatus=""
          backupBusy={false}
          restoreBusy={false}
          rescanBusy={false}
          lastRescanAt={null}
          snapshots={[{ id: 'snap-1', note: 'Before import', created_at: '2026-03-10T12:00:00.000Z' }]}
          snapshotBusy={false}
          integrityStatus={{ status: 'Healthy' }}
          doctorBusy={false}
          onUpdateUserData={() => {}}
          onRescanLibrary={() => {}}
          onExportBackup={() => {}}
          onRestoreBackup={() => {}}
          onCreateSnapshot={() => {}}
          onRestoreSnapshot={(snapshot) => restored.push(snapshot)}
          onRunDoctor={() => {}}
          onRebuildIndex={() => {}}
        />
      </MemoryRouter>
    )

    const restoreButtons = Array.from(node.querySelectorAll('button')).filter((button) => (
      button.textContent === 'Restore'
    ))
    expect(restoreButtons.length).toBeGreaterThan(0)

    act(() => {
      restoreButtons[0].dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(document.body.textContent).toContain('Restore this snapshot and replace the current library state?')

    const confirmButton = Array.from(document.body.querySelectorAll('button')).find((button) => (
      button.textContent === 'Restore Snapshot'
    ))

    act(() => {
      confirmButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(restored).toEqual([
      { id: 'snap-1', note: 'Before import', created_at: '2026-03-10T12:00:00.000Z' },
    ])
  })

  it('creates snapshots without forwarding the click event as a note', () => {
    const created = []
    const node = renderIntoDom(
      <MemoryRouter>
        <MaintenanceView
          isDesktop
          libraryPath="/tmp/library"
          userData={{}}
          maintenanceStatus=""
          backupBusy={false}
          restoreBusy={false}
          rescanBusy={false}
          lastRescanAt={null}
          snapshots={[]}
          snapshotBusy={false}
          integrityStatus={{ status: 'Healthy' }}
          doctorBusy={false}
          onUpdateUserData={() => {}}
          onRescanLibrary={() => {}}
          onExportBackup={() => {}}
          onRestoreBackup={() => {}}
          onCreateSnapshot={(note) => created.push(note)}
          onRestoreSnapshot={() => {}}
          onRunDoctor={() => {}}
          onRebuildIndex={() => {}}
        />
      </MemoryRouter>
    )

    const createButton = Array.from(node.querySelectorAll('button')).find((button) => (
      button.textContent === 'Create Snapshot'
    ))

    act(() => {
      createButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(created).toEqual([undefined])
  })

  it('renders the missing-book fallback on the canonical book route', () => {
    const node = renderIntoDom(
      <MemoryRouter initialEntries={['/book/missing-book']}>
        <Routes>
          <Route path="/book/:bookId" element={<BookPage {...createBookPageProps()} />} />
        </Routes>
      </MemoryRouter>
    )

    expect(node.textContent).toContain('Book not found')
    expect(node.textContent).toContain('Back to Library')
  })

  it('renders the decomposed reading room surface', () => {
    const node = renderIntoDom(
      <MemoryRouter>
        <ReadingRoomView
          {...createReadingRoomProps()}
          books={[{ id: 'book-1', title: 'Arrangement', author: 'Jane Reader' }]}
          documents={[{
            id: 'doc-1',
            title: 'Arrangement Notes',
            type: 'article',
            linkedBookId: 'book-1',
            addedAt: '2026-03-01T00:00:00.000Z',
            lastOpened: '2026-03-02T00:00:00.000Z',
            tags: ['notes'],
          }]}
          allLibraryTags={['notes']}
        />
      </MemoryRouter>
    )

    expect(node.textContent).toContain('Documents share the same catalog as your shelves.')
    expect(node.textContent).toContain('Arrangement Notes')
    expect(node.textContent).toContain('Book: Arrangement')
    expect(node.textContent).toContain('OCR and file processing run in the desktop app.')
    expect(Array.from(node.querySelectorAll('button')).find((button) => button.textContent === 'OCR Everything')?.disabled).toBe(true)
    expect(Array.from(node.querySelectorAll('button')).find((button) => button.textContent === 'Import Files')?.disabled).toBe(true)
  })

  it('renders the secondary insights route without crowding the home surface', () => {
    const node = renderIntoDom(
      <MemoryRouter>
        <InsightsView
          {...createInsightsProps()}
          books={[{
            id: 'book-1',
            title: 'Arrangement',
            author: 'Jane Reader',
            status: 'read',
            dateFinished: '2026-03-05T00:00:00.000Z',
            pageCount: 320,
            rating: 4,
            quotes: [{ id: 'quote-1', text: 'Hold the line.' }],
            reflections: [],
            readingLogs: [],
            shelves: ['all'],
          }]}
        />
      </MemoryRouter>
    )

    expect(node.textContent).toContain('A private reading room for notes, patterns, and recommendations.')
    expect(node.textContent).toContain('Statistics and Reading Goals')
    expect(node.textContent).toContain('Today')
  })

  it('includes years that only have page logs in the stats selector', () => {
    const node = renderIntoDom(
      <StatsDashboard
        embedded
        books={[{
          id: 'book-1',
          title: 'Logged Book',
          readingLogs: [{ date: '2025-08-01T00:00:00.000Z', pages: 12 }],
        }]}
        yearlyGoal={12}
        onUpdateGoal={() => {}}
        onUpdateUserData={() => {}}
      />
    )

    expect(Array.from(node.querySelectorAll('option')).map((option) => option.value)).toContain('2025')
  })

  it('confirms today page logs with the clamped amount', async () => {
    const logged = []
    const node = renderIntoDom(
      <TodayPanel
        books={[{ id: 'book-1', title: 'Today Book', pageCount: 20, pagesRead: 15 }]}
        streak={{ current: 1, best: 2 }}
        onLogPages={(bookId, pagesLogged) => logged.push({ bookId, pagesLogged })}
        onAddQuote={() => {}}
        onAddReflection={() => {}}
      />
    )

    const add25 = Array.from(node.querySelectorAll('button')).find((button) => button.textContent === 'Add 25')
    await act(async () => {
      add25.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(logged).toEqual([{ bookId: 'book-1', pagesLogged: 5 }])
    expect(node.textContent).toContain('Logged 5 pages.')
  })

  it('exposes accessible preference toggles', () => {
    renderIntoDom(
      <MemoryRouter>
        <PreferencesPanel
          open
          onClose={() => {}}
          viewMode="spine"
          setViewMode={() => {}}
          showCustomizer={false}
          setShowCustomizer={() => {}}
          isDesktop={false}
          userData={{}}
          onUpdateUserData={() => {}}
          onOpenMaintenance={() => {}}
        />
      </MemoryRouter>
    )

    const appearanceButton = Array.from(document.body.querySelectorAll('button')).find((button) => (
      button.textContent === 'Show Library Appearance'
    ))
    expect(appearanceButton?.getAttribute('aria-pressed')).toBe('false')

    const spineButton = Array.from(document.body.querySelectorAll('button')).find((button) => (
      button.textContent === 'Spine View'
    ))
    expect(spineButton?.getAttribute('aria-pressed')).toBe('true')

    expect(document.body.textContent).toContain('available only in the desktop app.')
  })

  it('unmounts preferences after the close action', async () => {
    function PreferencesHarness() {
      const [open, setOpen] = React.useState(true)
      return (
        <PreferencesPanel
          open={open}
          onClose={() => setOpen(false)}
          viewMode="spine"
          setViewMode={() => {}}
          showCustomizer={false}
          setShowCustomizer={() => {}}
          isDesktop={false}
          userData={{}}
          onUpdateUserData={() => {}}
          onOpenMaintenance={() => {}}
        />
      )
    }

    renderIntoDom(<PreferencesHarness />)
    expect(document.body.querySelector('[role="dialog"]')?.textContent).toContain('Preferences')

    const closeButton = Array.from(document.body.querySelectorAll('button')).find((button) => (
      button.getAttribute('aria-label') === 'Close Preferences'
    ))

    await act(async () => {
      closeButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
  })

  it('restores scroll lock and focus after preferences close', async () => {
    function PreferencesHarness() {
      const [open, setOpen] = React.useState(false)
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>Open Preferences</button>
          <PreferencesPanel
            open={open}
            onClose={() => setOpen(false)}
            viewMode="spine"
            setViewMode={() => {}}
            showCustomizer={false}
            setShowCustomizer={() => {}}
            isDesktop={false}
            userData={{}}
            onUpdateUserData={() => {}}
            onOpenMaintenance={() => {}}
          />
        </>
      )
    }

    const node = renderIntoDom(<PreferencesHarness />)
    const openButton = Array.from(node.querySelectorAll('button')).find((button) => (
      button.textContent === 'Open Preferences'
    ))
    openButton.focus()

    await act(async () => {
      openButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(document.body.style.overflow).toBe('hidden')
    expect(document.body.querySelector('button[aria-label="Close Preferences"]')).toBeTruthy()

    await act(async () => {
      document.body
        .querySelector('button[aria-label="Close Preferences"]')
        .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(document.body.style.overflow).toBe('')
    expect(document.activeElement).toBe(openButton)
  })

  it('filters hidden controls out of focusable dialog elements', () => {
    const wrapper = document.createElement('div')
    const visible = document.createElement('button')
    const hidden = document.createElement('button')
    visible.textContent = 'Visible'
    hidden.textContent = 'Hidden'
    hidden.style.display = 'none'
    visible.getClientRects = () => [{ width: 10, height: 10 }]
    hidden.getClientRects = () => [{ width: 10, height: 10 }]
    wrapper.append(visible, hidden)

    expect(getFocusableElements(wrapper)).toEqual([visible])
  })

  it('unmounts add dialog after a manual book is submitted', async () => {
    let addedBook = null

    function AddDialogHarness() {
      const [open, setOpen] = React.useState(true)
      if (!open) return null
      return (
        <AddBookModal
          onClose={() => setOpen(false)}
          onAddBook={(book) => {
            addedBook = book
            setOpen(false)
          }}
          onAddArticle={async () => {}}
          onMigrateExport={() => {}}
        />
      )
    }

    renderIntoDom(<AddDialogHarness />)

    const manualTab = Array.from(document.body.querySelectorAll('[role="tab"]')).find((button) => (
      button.textContent === 'Manual'
    ))
    await act(async () => {
      manualTab.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    await setInputValue(document.body.querySelector('#manual-book-title'), 'Portal Test Volume')
    await setInputValue(document.body.querySelector('#manual-book-author'), 'Dialog Tester')

    const submitButton = Array.from(document.body.querySelectorAll('button')).find((button) => (
      button.textContent === 'Add Book'
    ))
    await act(async () => {
      submitButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(addedBook?.title).toBe('Portal Test Volume')
    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
  })

  it('shows disabled desktop-only tools in the web shell add dialog', () => {
    renderIntoDom(
      <AddBookModal
        onClose={() => {}}
        onAddBook={() => {}}
        onAddArticle={async () => {}}
        onMigrateExport={() => {}}
      />
    )

    const articleTab = Array.from(document.body.querySelectorAll('[role="tab"]')).find((button) => (
      button.textContent === 'Article'
    ))
    expect(articleTab).toBeTruthy()
    expect(articleTab.disabled).toBe(true)
    expect(articleTab.getAttribute('aria-disabled')).toBe('true')
    expect(document.body.textContent).toContain('Article capture and migration are available only in the desktop app.')
    expect(document.body.querySelector('#article-url-input')).toBeNull()
  })

  it('renders unrated stars as an accessible empty state', () => {
    renderIntoDom(<StarRating rating={0} onRate={() => {}} />)

    const slider = document.body.querySelector('[role="slider"]')
    expect(slider.getAttribute('aria-valuetext')).toBe('No rating')
    expect(slider.textContent).toBe('☆☆☆☆☆')
    expect(document.body.textContent).not.toContain('Clear')
  })

  it('renders rated stars with clear affordance', () => {
    renderIntoDom(<StarRating rating={8} onRate={() => {}} />)

    const slider = document.body.querySelector('[role="slider"]')
    expect(slider.getAttribute('aria-valuetext')).toBe('4 out of 5 stars')
    expect(document.body.textContent).toContain('Clear')
  })

  it('opens resurfaced memories by stable book id', async () => {
    const opened = []
    renderIntoDom(
      <MemoryResurface
        books={[{
          id: 'book-1',
          title: 'Memory Book',
          memories: [{ title: 'Saved Memory', note: 'Remember this.', createdAt: '2026-04-01T00:00:00.000Z' }],
          reflections: [],
        }]}
        onOpenBook={(bookId) => opened.push(bookId)}
      />
    )

    const openButton = Array.from(document.body.querySelectorAll('button')).find((button) => (
      button.textContent === 'Open Book'
    ))
    await act(async () => {
      openButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(opened).toEqual(['book-1'])
  })

  it('resurfaces latest dated memory before undated entries', () => {
    renderIntoDom(
      <MemoryResurface
        books={[{
          id: 'book-1',
          title: 'Memory Book',
          memories: [
            { title: 'Undated Memory', note: 'Do not surface first.' },
            { title: 'Dated Memory', note: 'Surface this.', createdAt: '2026-04-01T00:00:00.000Z' },
          ],
          reflections: [],
        }]}
        onOpenBook={() => {}}
      />
    )

    expect(document.body.textContent).toContain('Dated Memory')
    expect(document.body.textContent).not.toContain('Undated Memory')
  })

  it('renders the decomposed canonical book page for a real book', () => {
    const node = renderIntoDom(
      <MemoryRouter initialEntries={['/book/book-1']}>
        <Routes>
          <Route
            path="/book/:bookId"
            element={(
              <BookPage
                {...createBookPageProps()}
                books={[{
                  id: 'book-1',
                  title: 'Arrangement',
                  author: 'Jane Reader',
                  status: 'reading',
                  shelves: ['all'],
                  notes: 'Keep close to the center.',
                  studyStack: [],
                  quotes: [],
                  reflections: [],
                  readingLogs: [],
                  memories: [],
                }]}
                shelves={[{ id: 'all', name: 'All Books', color: '#8b4513', order: 0 }]}
              />
            )}
          />
        </Routes>
      </MemoryRouter>
    )

    expect(node.textContent).toContain('Arrangement')
    expect(node.textContent).toContain('Linked Reading')
    expect(node.textContent).toContain('Study Stack')
  })
})
