import { useState, useMemo, useEffect, useRef, lazy, Suspense, useCallback } from 'react'
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import AddBookModal from './components/AddBookModal'
import BookModal from './components/BookModal'
import StatsDashboard from './components/StatsDashboard'
import PreferencesPanel from './components/PreferencesPanel'
const BookPage = lazy(() => import('./pages/BookPage'))
import GlobalSearch from './components/GlobalSearch'
import ErrorBoundary from './components/ErrorBoundary'
import ReaderModals from './components/ReaderModals'
import LibraryView from './features/library/LibraryView'
import ReadingRoomView from './features/reading-room/ReadingRoomView'
import { useLibraryStore } from './store/useLibraryStore'
import { createLibraryActions } from './store/libraryActions'
import { selectAllTags } from './store/librarySelectors'
import { isTauri } from './utils/tauri'
import { getIconSet } from './components/icons'
import { resolveShelfFont } from './utils/fonts'
import { useSearchController } from './hooks/useSearchController'
import { useIngestionController } from './hooks/useIngestionController'
import { useModalController } from './hooks/useModalController'
import { useTauriOperations } from './hooks/useTauriOperations'
import { useReaderController } from './hooks/useReaderController'
import { useBookHandlers } from './hooks/useBookHandlers'

function App() {
  const {
    libraryReady,
    libraryDirty,
    libraryPath,
    setLibraryPath,
    books,
    documents,
    shelves,
    userData,
    spineLibraryMap,
    spineLibraryEntries,
    updateLibraryState,
    updateBookItem,
    updateDocumentItem,
    updateUserState,
    updateShelvesState,
    refreshLibraryState,
    flushLibraryState,
  } = useLibraryStore()

  const [viewMode, setViewMode] = useState('spine')
  const navigate = useNavigate()
  const location = useLocation()
  const activeView = location.pathname.startsWith('/documents') ? 'documents' : 'library'
  const setActiveView = useCallback((view) => {
    navigate(view === 'documents' ? '/documents' : '/')
  }, [navigate])
  const {
    selectedBook, setSelectedBook,
    showAddModal, setShowAddModal,
    showStats, setShowStats,
    showCustomizer, setShowCustomizer,
    showDailyRitual, setShowDailyRitual,
    showPreferences, setShowPreferences,
    showInsights, setShowInsights,
    activePdf, setActivePdf,
    activeEpub, setActiveEpub,
    activeArticle, setActiveArticle,
    isReaderOpen,
  } = useModalController()
  const [vaultError, setVaultError] = useState('')
  const docUpdateTimers = useRef(new Map())
  const theme = userData.theme || 'classic'
  const Icons = getIconSet(theme)
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    searchOpen,
    setSearchOpen,
    searchStatus,
    searchBusy,
  } = useSearchController({ libraryPath })

  const actions = useMemo(() => createLibraryActions({
    books,
    documents,
    shelves,
    userData,
    spineLibraryMap,
    updateLibraryState,
    updateBookItem,
    updateDocumentItem,
    updateUserState,
    updateShelvesState,
    docUpdateTimersRef: docUpdateTimers,
  }), [
    books,
    documents,
    shelves,
    userData,
    spineLibraryMap,
    updateLibraryState,
    updateBookItem,
    updateDocumentItem,
    updateUserState,
    updateShelvesState,
  ])

  const {
    ingestBusy,
    visibleIngestJobs,
    retryIngest: handleRetryIngest,
    cancelIngest: handleCancelIngest,
    runAllOcr: handleRunAllOcr,
  } = useIngestionController({
    libraryPath,
    libraryReady: libraryReady && isTauri(),
    documents,
    ingestRetentionDays: userData.ingestJobRetentionDays,
    updateDocumentMeta: actions.updateDocumentMeta,
  })

  const {
    maintenanceStatus,
    backupBusy,
    restoreBusy,
    rescanBusy,
    snapshots,
    snapshotBusy,
    integrityStatus,
    doctorBusy,
    handleImportDocuments,
    handleRescanLibrary,
    handleExportBackup,
    handleRestoreBackup,
    handleMigrateExportFile,
    handleCreateSnapshot,
    handleRestoreSnapshot,
    handleRunDoctor,
    handleRebuildIndex,
  } = useTauriOperations({
    libraryPath,
    setLibraryPath,
    libraryReady,
    libraryDirty,
    books,
    documents,
    shelves,
    userData,
    updateLibraryState,
    updateUserState,
    refreshLibraryState,
    flushLibraryState,
    setVaultError,
    actions,
    ingestBusy,
  })

  const allTags = useMemo(() => selectAllTags(books), [books])

  const {
    handleReadDocument,
    addDocumentNote,
    updateDocumentMeta,
    scheduleDocumentMetaUpdate,
    handleOpenAnnotation,
    openSearchResult,
  } = useReaderController({
    libraryPath,
    books,
    documents,
    actions,
    setActivePdf,
    setActiveEpub,
    setActiveArticle,
    setSelectedBook,
    setVaultError,
    setActiveView,
    setSearchOpen,
  })

  const {
    handleUpdateSpineLibraryEntry,
    handleRemoveSpineLibraryEntry,
    handleAddBook,
    handleAddArticle,
    handleUpdateBook,
    handleDeleteBook,
    handleSelectBook,
    handleViewBookPage,
    handleLogPages,
    handleAddQuoteQuick,
    handleAddReflection,
    handleApplyFontToAll,
    handleUpdateGoal,
    handleUpdateUserData,
    handleAddToExhibit,
    handleSaveSpineToLibrary,
  } = useBookHandlers({
    actions,
    updateLibraryState,
    updateUserState,
    setShowAddModal,
    setSelectedBook,
    userData,
    libraryPath,
  })

  useEffect(() => () => {
    docUpdateTimers.current.forEach((timer) => clearTimeout(timer))
    docUpdateTimers.current.clear()
  }, [])

  const readerSettings = useMemo(() => ({
    cachePages: Number(userData.readerCachePages) || 8,
    maxMemoryMb: Number(userData.pdfRenderMemoryMb ?? userData.readerMaxMemoryMb) || 512,
    overscanPages: Number(userData.pdfVirtualOverscanPages) || 8,
  }), [userData.readerCachePages, userData.pdfRenderMemoryMb, userData.readerMaxMemoryMb, userData.pdfVirtualOverscanPages])

  return (
    <div
      className={`library-wrapper theme-${userData.theme || 'classic'} lighting-${userData.lightingPreset || 'golden'} wood-${userData.woodTone || 'walnut'} ${isReaderOpen ? 'reader-open' : ''}`}
      style={{ '--placard-font': resolveShelfFont(userData.shelfFont) }}
    >
      <div className="library-atmosphere" aria-hidden="true" />
      {/* Header */}
      <header className="site-header">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between">
            <h1 className="logo-text">
              {userData.displayName ? userData.displayName : 'My '}
              {!userData.displayName && <span>Library</span>}
            </h1>
            <div className="flex items-center gap-3">
              <div className="view-toggle">
                <button
                  type="button"
                  className={`view-toggle-btn ${activeView === 'library' ? 'active' : ''}`}
                  onClick={() => navigate('/')}
                >
                  Library
                </button>
                <button
                  type="button"
                  className={`view-toggle-btn ${activeView === 'documents' ? 'active' : ''}`}
                  onClick={() => navigate('/documents')}
                >
                  Documents
                </button>
              </div>
              {isTauri() && (
                <GlobalSearch
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  searchResults={searchResults}
                  searchOpen={searchOpen}
                  setSearchOpen={setSearchOpen}
                  searchBusy={searchBusy}
                  searchStatus={searchStatus}
                  onOpenResult={openSearchResult}
                />
              )}
              {activeView === 'library' && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="btn-primary flex items-center gap-2"
                >
                  <span className="w-4 h-4">{Icons.plus}</span>
                  <span>Add Book</span>
                </button>
              )}
              <button
                onClick={() => setShowPreferences((prev) => !prev)}
                className="btn-secondary flex items-center gap-2"
              >
                <span className="w-4 h-4">{Icons.tune}</span>
                <span>Preferences</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="library-content relative z-10 max-w-6xl mx-auto px-6 py-8">
        <ErrorBoundary>
        <Suspense fallback={<div className="loading-placeholder" />}>
          <Routes>
            <Route
              path="/"
              element={
                <LibraryView
                  books={books}
                  documents={documents}
                  shelves={shelves}
                  userData={userData}
                  spineLibraryEntries={spineLibraryEntries}
                  viewMode={viewMode}
                  icons={Icons}
                  showCustomizer={showCustomizer}
                  showDailyRitual={showDailyRitual}
                  actions={actions}
                  updateUserState={updateUserState}
                  updateLibraryState={updateLibraryState}
                  onSelectBook={handleSelectBook}
                  onReadDocument={handleReadDocument}
                  onOpenAnnotation={handleOpenAnnotation}
                  onRequestAddBook={() => setShowAddModal(true)}
                  onNavigateToDocuments={() => navigate('/documents')}
                  handleUpdateSpineLibraryEntry={handleUpdateSpineLibraryEntry}
                  handleRemoveSpineLibraryEntry={handleRemoveSpineLibraryEntry}
                />
              }
            />
            <Route
              path="/documents"
              element={
                <ReadingRoomView
                  documents={documents}
                  libraryPath={libraryPath}
                  onImport={handleImportDocuments}
                  onReadDocument={handleReadDocument}
                  vaultError={vaultError}
                  lastRescanAt={userData.lastRescanAt}
                  ingestJobs={visibleIngestJobs}
                  ingestBusy={ingestBusy}
                  onRetryIngest={handleRetryIngest}
                  onCancelIngest={handleCancelIngest}
                  onRunAllOcr={handleRunAllOcr}
                />
              }
            />
            <Route
              path="/book/:bookId"
              element={
                <BookPage
                  books={books}
                  shelves={shelves}
                  allTags={allTags}
                  onUpdate={handleUpdateBook}
                  onDelete={handleDeleteBook}
                  onLogPages={handleLogPages}
                  onAddQuote={handleAddQuoteQuick}
                  onAddReflection={handleAddReflection}
                />
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        </ErrorBoundary>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showAddModal && (
          <AddBookModal
            onClose={() => setShowAddModal(false)}
            onAddBook={handleAddBook}
            onAddArticle={handleAddArticle}
            onMigrateExport={handleMigrateExportFile}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPreferences && (
          <PreferencesPanel
            open={showPreferences}
            onClose={() => setShowPreferences(false)}
            viewMode={viewMode}
            setViewMode={setViewMode}
            showStats={showStats}
            setShowStats={setShowStats}
            showDailyRitual={showDailyRitual}
            setShowDailyRitual={setShowDailyRitual}
            showCustomizer={showCustomizer}
            setShowCustomizer={setShowCustomizer}
            isDesktop={isTauri()}
            onRescanLibrary={handleRescanLibrary}
            onExportBackup={handleExportBackup}
            onRestoreBackup={handleRestoreBackup}
            maintenanceStatus={maintenanceStatus}
            backupBusy={backupBusy}
            restoreBusy={restoreBusy}
            rescanBusy={rescanBusy}
            lastRescanAt={userData.lastRescanAt}
            userData={userData}
            onUpdateUserData={handleUpdateUserData}
            snapshots={snapshots}
            onCreateSnapshot={handleCreateSnapshot}
            onRestoreSnapshot={handleRestoreSnapshot}
            snapshotBusy={snapshotBusy}
            integrityStatus={integrityStatus}
            onRunDoctor={handleRunDoctor}
            doctorBusy={doctorBusy}
            onRebuildIndex={handleRebuildIndex}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedBook && (
          <BookModal
            book={selectedBook}
            shelves={shelves}
            allTags={allTags}
            onClose={() => setSelectedBook(null)}
            onUpdate={handleUpdateBook}
            onDelete={handleDeleteBook}
            onApplyFontToAll={handleApplyFontToAll}
            exhibits={userData.exhibits || []}
            onAddToExhibit={handleAddToExhibit}
            spineLibrary={spineLibraryMap}
            onSaveSpineToLibrary={handleSaveSpineToLibrary}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showStats && (
          <StatsDashboard
            books={books}
            yearlyGoal={userData.yearlyGoal}
            onUpdateGoal={handleUpdateGoal}
            quests={userData.quests || []}
            statsAdjustments={userData.statsAdjustments || {}}
            onUpdateUserData={handleUpdateUserData}
            theme={theme}
            onClose={() => setShowStats(false)}
          />
        )}
      </AnimatePresence>

      <ReaderModals
        activePdf={activePdf}
        setActivePdf={setActivePdf}
        activeEpub={activeEpub}
        setActiveEpub={setActiveEpub}
        activeArticle={activeArticle}
        setActiveArticle={setActiveArticle}
        libraryPath={libraryPath}
        readerSettings={readerSettings}
        addDocumentNote={addDocumentNote}
        updateDocumentMeta={updateDocumentMeta}
        scheduleDocumentMetaUpdate={scheduleDocumentMetaUpdate}
      />

    </div>
  )
}

export default App
