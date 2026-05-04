import React, { useState, useMemo, useEffect, useRef, lazy, Suspense, useCallback } from 'react'
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import ErrorBoundary from './components/ErrorBoundary'
import AppHeader from './components/AppHeader'
import LibraryView from './features/library/LibraryView'
import { chooseLibraryFolder } from './utils/libraryVault'
const AddBookModal = lazy(() => import('./components/AddBookModal'))
const GlobalSearch = lazy(() => import('./components/GlobalSearch'))
const ReaderModals = lazy(() => import('./components/ReaderModals'))
const PreferencesPanel = lazy(() => import('./components/PreferencesPanel'))
const BookPage = lazy(() => import('./pages/BookPage'))
const ReadingRoomView = lazy(() => import('./features/reading-room/ReadingRoomView'))
const InsightsView = lazy(() => import('./features/insights/InsightsView'))
const MaintenanceView = lazy(() => import('./features/maintenance/MaintenanceView'))
import { useLibraryStore } from './store/useLibraryStore'
import { createLibraryActions } from './store/libraryActions'
import { selectAllLibraryTags } from './store/librarySelectors'
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
    libraryError,
    librarySyncError,
    libraryPath,
    setLibraryPath,
    books,
    documents,
    shelves,
    userData,
    spineLibraryMap,
    spineLibraryEntries,
    updateBookItem,
    updateDocumentItem,
    updateUserState,
    insertBookItem,
    insertDocumentItem,
    removeLibraryItem,
    updateShelvesState,
    updateSpineLibraryState,
    refreshLibraryState,
    flushLibraryState,
    retryLibraryLoad,
  } = useLibraryStore()

  const [viewMode, setViewMode] = useState('spine')
  const navigate = useNavigate()
  const location = useLocation()
  const normalizedActiveView = location.pathname.startsWith('/documents')
    ? 'documents'
    : location.pathname.startsWith('/insights')
      ? 'insights'
      : location.pathname.startsWith('/maintenance')
        ? 'maintenance'
      : 'library'
  const setActiveView = useCallback((view) => {
    navigate(
      view === 'documents'
        ? '/documents'
        : view === 'insights'
          ? '/insights'
          : view === 'maintenance'
            ? '/maintenance'
          : '/'
    )
  }, [navigate])
  const {
    showAddModal, setShowAddModal,
    showCustomizer, setShowCustomizer,
    showPreferences, setShowPreferences,
    activePdf, setActivePdf,
    activeEpub, setActiveEpub,
    activeArticle, setActiveArticle,
    isReaderOpen,
  } = useModalController()
  const openBookPage = useCallback((bookId) => {
    navigate(`/book/${bookId}`)
  }, [navigate])
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
    updateBookItem,
    updateDocumentItem,
    updateUserState,
    insertBookItem,
    removeLibraryItem,
    updateShelvesState,
    docUpdateTimersRef: docUpdateTimers,
  }), [
    books,
    documents,
    shelves,
    userData,
    spineLibraryMap,
    updateBookItem,
    updateDocumentItem,
    updateUserState,
    insertBookItem,
    removeLibraryItem,
    updateShelvesState,
  ])

  const flushPendingReaderState = useCallback(async () => {
    actions.flushPendingDocumentMetaUpdates?.()
    await flushLibraryState()
  }, [actions, flushLibraryState])

  const {
    ingestBusy,
    visibleIngestJobs,
    retryIngest: handleRetryIngest,
    cancelIngest: handleCancelIngest,
    runAllOcr: handleRunAllOcr,
  } = useIngestionController({
    libraryPath,
    libraryReady: libraryReady && isTauri(),
    books,
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
    books,
    documents,
    shelves,
    userData,
    updateBookItem,
    insertBookItem,
    insertDocumentItem,
    updateUserState,
    updateShelvesState,
    refreshLibraryState,
    flushLibraryState: flushPendingReaderState,
    setVaultError,
    actions,
    ingestBusy,
  })

  const allLibraryTags = useMemo(() => selectAllLibraryTags(books, documents), [books, documents])

  const handleChooseLibraryFolder = useCallback(async () => {
    const nextPath = await chooseLibraryFolder()
    if (!nextPath) return
    await retryLibraryLoad(nextPath)
  }, [retryLibraryLoad])

  const {
    handleReadDocument,
    addDocumentNote,
    updateDocumentMeta,
    scheduleDocumentMetaUpdate,
    handleOpenAnnotation,
    openStudyEntry,
    openSearchResult,
  } = useReaderController({
    libraryPath,
    books,
    documents,
    actions,
    onOpenBook: openBookPage,
    setActivePdf,
    setActiveEpub,
    setActiveArticle,
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
    handleLogPages,
    handleUndoLastPageLog,
    handleAddQuoteQuick,
    handleAddReflection,
    handlePinStudyEntry,
    handleRemoveStudyEntry,
    handleUpdateStudyEntry,
    handleMoveStudyEntry,
    handleReviewStudyEntry,
    handleToggleStudyEntryComplete,
    handleStartStudySession,
    handleResetStudySession,
    handleUpdateGoal,
    handleUpdateUserData,
  } = useBookHandlers({
    actions,
    books,
    updateBookItem,
    updateSpineLibraryState,
    insertDocumentItem,
    updateUserState,
    setShowAddModal,
    libraryPath,
  })

  useEffect(() => () => {
    docUpdateTimers.current.forEach((entry) => clearTimeout(entry?.timeout || entry))
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
      <AppHeader
        displayName={userData.displayName}
        normalizedActiveView={normalizedActiveView}
        showMaintenance={isTauri()}
        icons={Icons}
        searchSlot={isTauri() ? (
          <Suspense fallback={<div className="loading-placeholder" />}>
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
          </Suspense>
        ) : null}
        onOpenAdd={() => setShowAddModal(true)}
        onOpenPreferences={() => setShowPreferences((prev) => !prev)}
        onNavigateLibrary={() => navigate('/')}
        onNavigateDocuments={() => navigate('/documents')}
        onNavigateInsights={() => navigate('/insights')}
        onNavigateMaintenance={() => navigate('/maintenance')}
      />

      <div className="library-content relative z-10 max-w-6xl mx-auto px-6 py-8">
        <ErrorBoundary>
        {libraryReady && libraryError && (
          <LibraryFailureState
            error={libraryError}
            onRetry={() => retryLibraryLoad()}
            onChooseFolder={isTauri() ? handleChooseLibraryFolder : null}
          />
        )}
        {libraryReady && !libraryError && librarySyncError && (
          <LibrarySyncWarning
            error={librarySyncError}
            onReload={refreshLibraryState}
          />
        )}
        {!libraryReady && !libraryError && <div className="loading-placeholder" />}
        {libraryReady && !libraryError && (
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
                  actions={actions}
                  updateUserState={updateUserState}
                  onSelectBook={handleSelectBook}
                  onReadDocument={handleReadDocument}
                  onOpenAnnotation={handleOpenAnnotation}
                  onOpenBook={openBookPage}
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
                  books={books}
                  documents={documents}
                  shelves={shelves}
                  allLibraryTags={allLibraryTags}
                  libraryPath={libraryPath}
                  onImport={handleImportDocuments}
                  onReadDocument={handleReadDocument}
                  onUpdateDocument={updateDocumentMeta}
                  onNavigateToLibrary={() => navigate('/')}
                  onOpenBook={openBookPage}
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
                  documents={documents}
                  shelves={shelves}
                  onUpdate={handleUpdateBook}
                  onUpdateDocument={updateDocumentMeta}
                  onDelete={handleDeleteBook}
                  onLogPages={handleLogPages}
                  onUndoLastPageLog={handleUndoLastPageLog}
                  onAddQuote={handleAddQuoteQuick}
                  onAddReflection={handleAddReflection}
                  onPinStudyEntry={handlePinStudyEntry}
                  onRemoveStudyEntry={handleRemoveStudyEntry}
                  onUpdateStudyEntry={handleUpdateStudyEntry}
                  onMoveStudyEntry={handleMoveStudyEntry}
                  onReviewStudyEntry={handleReviewStudyEntry}
                  onToggleStudyEntryComplete={handleToggleStudyEntryComplete}
                  onStartStudySession={handleStartStudySession}
                  onResetStudySession={handleResetStudySession}
                  onOpenStudyEntry={openStudyEntry}
                  onSelectBook={handleSelectBook}
                  onReadDocument={handleReadDocument}
                  onOpenAnnotation={handleOpenAnnotation}
                  onNavigateToDocuments={() => navigate('/documents')}
                  viewMode={viewMode}
                />
              }
            />
            <Route
              path="/insights"
              element={(
                <InsightsView
                  books={books}
                  userData={userData}
                  actions={actions}
                  onOpenBook={openBookPage}
                  onUpdateGoal={handleUpdateGoal}
                  onUpdateUserData={handleUpdateUserData}
                  theme={theme}
                />
              )}
            />
            <Route
              path="/maintenance"
              element={
                <MaintenanceView
                  isDesktop={isTauri()}
                  libraryPath={libraryPath}
                  userData={userData}
                  maintenanceStatus={maintenanceStatus}
                  backupBusy={backupBusy}
                  restoreBusy={restoreBusy}
                  rescanBusy={rescanBusy}
                  lastRescanAt={userData.lastRescanAt}
                  snapshots={snapshots}
                  snapshotBusy={snapshotBusy}
                  integrityStatus={integrityStatus}
                  doctorBusy={doctorBusy}
                  onUpdateUserData={handleUpdateUserData}
                  onRescanLibrary={handleRescanLibrary}
                  onExportBackup={handleExportBackup}
                  onRestoreBackup={handleRestoreBackup}
                  onCreateSnapshot={handleCreateSnapshot}
                  onRestoreSnapshot={handleRestoreSnapshot}
                  onRunDoctor={handleRunDoctor}
                  onRebuildIndex={handleRebuildIndex}
                />
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        )}
        </ErrorBoundary>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showAddModal && (
          <Suspense fallback={<div className="loading-placeholder" />}>
            <AddBookModal
              onClose={() => setShowAddModal(false)}
              onAddBook={handleAddBook}
              onAddArticle={handleAddArticle}
              onMigrateExport={handleMigrateExportFile}
            />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPreferences && (
          <Suspense fallback={<div className="loading-placeholder" />}>
            <PreferencesPanel
              open={showPreferences}
              onClose={() => setShowPreferences(false)}
              viewMode={viewMode}
              setViewMode={setViewMode}
              showCustomizer={showCustomizer}
              setShowCustomizer={setShowCustomizer}
              isDesktop={isTauri()}
              userData={userData}
              onUpdateUserData={handleUpdateUserData}
              onOpenMaintenance={() => {
                setShowPreferences(false)
                navigate('/maintenance')
              }}
            />
          </Suspense>
        )}
      </AnimatePresence>

      <Suspense fallback={null}>
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
          flushPendingDocumentMetaUpdates={actions.flushPendingDocumentMetaUpdates}
          books={books}
          onOpenStudyEntry={openStudyEntry}
          onOpenBook={openBookPage}
          onToggleStudyEntryComplete={handleToggleStudyEntryComplete}
        />
      </Suspense>

    </div>
  )
}

export default App

function LibraryFailureState({ error, onRetry, onChooseFolder }) {
  return (
    <div className="library-failure-state" role="alert">
      <div className="library-failure-eyebrow">Library Unavailable</div>
      <h2 className="library-failure-title">The local library could not be opened.</h2>
      <p className="library-failure-copy">
        {error?.message || 'The database could not be initialized.'}
      </p>
      <div className="library-failure-actions">
        <button type="button" className="btn-secondary" onClick={onRetry}>
          Retry
        </button>
        {onChooseFolder && (
          <button type="button" className="btn-primary" onClick={onChooseFolder}>
            Choose Library Folder
          </button>
        )}
      </div>
    </div>
  )
}

export function LibrarySyncWarning({ error, onReload }) {
  const handleReload = () => {
    Promise.resolve(onReload?.()).catch((reloadError) => {
      console.warn(
        '[library-sync] Unable to reload library:',
        reloadError?.message || reloadError
      )
    })
  }

  return (
    <div className="library-sync-warning" role="alert">
      <div>
        <div className="library-sync-warning-title">Recent changes may not be fully saved.</div>
        <div className="library-sync-warning-copy">
          {error?.message || 'A local database write failed. Reload the library before exporting or restoring.'}
        </div>
      </div>
      <button
        type="button"
        className="btn-secondary"
        onClick={handleReload}
      >
        Reload Library
      </button>
    </div>
  )
}
