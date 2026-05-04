import React from 'react'
import DialogShell from './DialogShell'

function PreferencesPanel({
  open,
  onClose,
  viewMode,
  setViewMode,
  showCustomizer,
  setShowCustomizer,
  isDesktop,
  userData,
  onUpdateUserData,
  onOpenMaintenance,
}) {
  return (
    <DialogShell
      open={open}
      title="Preferences"
      onClose={onClose}
      size="sm"
      panelClassName="preferences-dialog"
      bodyClassName="preferences-dialog-body"
    >
      <div className="preferences-section">
        <div className="preferences-group">
          <div className="preferences-label">Interface</div>
          <button
            type="button"
            className={`preferences-toggle ${showCustomizer ? 'active' : ''}`}
            aria-pressed={showCustomizer}
            onClick={() => setShowCustomizer((prev) => !prev)}
          >
            {showCustomizer ? 'Hide Library Appearance' : 'Show Library Appearance'}
          </button>
          <div className="preferences-hint">
            Reading statistics, notes, and recommendations now live on the dedicated Insights route.
          </div>
        </div>
      </div>

      <div className="preferences-divider" />
      <div className="preferences-section">
        <div className="preferences-group">
          <div className="preferences-label">Shelf View</div>
          <div className="preferences-row">
            <button
              type="button"
              className={`preferences-toggle ${viewMode === 'spine' ? 'active' : ''}`}
              aria-pressed={viewMode === 'spine'}
              onClick={() => setViewMode('spine')}
            >
              Spine View
            </button>
            <button
              type="button"
              className={`preferences-toggle ${viewMode === 'front' ? 'active' : ''}`}
              aria-pressed={viewMode === 'front'}
              onClick={() => setViewMode('front')}
            >
              Front View
            </button>
          </div>
        </div>
      </div>

      {isDesktop && (
        <>
          <div className="preferences-divider" />
          <div className="preferences-section">
            <div className="preferences-group">
              <div className="preferences-label">Reader Performance</div>
              <label className="preferences-field">
                Cache pages
                <input
                  type="number"
                  min="2"
                  max="20"
                  value={userData?.readerCachePages ?? 8}
                  onChange={(event) => onUpdateUserData?.({ readerCachePages: Number(event.target.value) || 8 })}
                />
              </label>
              <label className="preferences-field">
                Max memory (MB)
                <input
                  type="number"
                  min="256"
                  max="4096"
                  value={userData?.pdfRenderMemoryMb ?? userData?.readerMaxMemoryMb ?? 800}
                  onChange={(event) => onUpdateUserData?.({
                    readerMaxMemoryMb: Number(event.target.value) || 800,
                    pdfRenderMemoryMb: Number(event.target.value) || 800,
                  })}
                />
              </label>
              <label className="preferences-field">
                PDF overscan pages
                <input
                  type="number"
                  min="2"
                  max="30"
                  value={userData?.pdfVirtualOverscanPages ?? 8}
                  onChange={(event) => onUpdateUserData?.({ pdfVirtualOverscanPages: Number(event.target.value) || 8 })}
                />
              </label>
              <div className="preferences-hint">
                Search is local and exact-match today, including OCR-backed text where available.
                AI retrieval stays out until the core library workflow is stable.
              </div>
            </div>
          </div>
        </>
      )}

      {isDesktop && (
        <>
          <div className="preferences-divider" />
          <div className="preferences-section">
            <div className="preferences-group">
              <div className="preferences-label">Maintenance</div>
              <div className="preferences-hint">
                Backups, restores, scans, snapshots, and repair tools live on the dedicated Maintenance route.
              </div>
              <button
                type="button"
                className="preferences-toggle"
                onClick={onOpenMaintenance}
              >
                Open Maintenance Tools
              </button>
            </div>
          </div>
        </>
      )}

      {!isDesktop && (
        <>
          <div className="preferences-divider" />
          <div className="preferences-section">
            <div className="preferences-group">
              <div className="preferences-label">Maintenance</div>
              <div className="preferences-hint">
                Backups, restores, scans, snapshots, and repair tools are available only in the desktop app.
              </div>
              <div className="preferences-hint">
                Open the desktop app to use them.
              </div>
            </div>
          </div>
        </>
      )}
    </DialogShell>
  )
}

export default PreferencesPanel
