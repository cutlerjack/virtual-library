import React from 'react'

function AppHeader({
  displayName,
  normalizedActiveView,
  showMaintenance,
  icons,
  searchSlot,
  onOpenAdd,
  onOpenPreferences,
  onNavigateLibrary,
  onNavigateDocuments,
  onNavigateInsights,
  onNavigateMaintenance,
}) {
  return (
    <header className="site-header">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between">
          <h1 className="logo-text">
            {displayName ? displayName : 'My '}
            {!displayName && <span>Library</span>}
          </h1>
          <div className="flex items-center gap-3">
            <div className="view-toggle">
              <button
                type="button"
                className={`view-toggle-btn ${normalizedActiveView === 'library' ? 'active' : ''}`}
                onClick={onNavigateLibrary}
              >
                Library
              </button>
              <button
                type="button"
                className={`view-toggle-btn ${normalizedActiveView === 'documents' ? 'active' : ''}`}
                onClick={onNavigateDocuments}
              >
                Reading Room
              </button>
              <button
                type="button"
                className={`view-toggle-btn ${normalizedActiveView === 'insights' ? 'active' : ''}`}
                onClick={onNavigateInsights}
              >
                Insights
              </button>
              {showMaintenance && (
                <button
                  type="button"
                  className={`view-toggle-btn ${normalizedActiveView === 'maintenance' ? 'active' : ''}`}
                  onClick={onNavigateMaintenance}
                >
                  Maintenance
                </button>
              )}
            </div>
            {searchSlot}
            {normalizedActiveView === 'library' && (
              <button
                type="button"
                onClick={onOpenAdd}
                className="btn-secondary flex items-center gap-2"
                aria-label="Add a book, article, or library export"
              >
                <span className="w-4 h-4">{icons.plus}</span>
                <span>Quick Add</span>
              </button>
            )}
            <button
              type="button"
              onClick={onOpenPreferences}
              className="btn-secondary flex items-center gap-2"
            >
              <span className="w-4 h-4">{icons.tune}</span>
              <span>Preferences</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

export default AppHeader
