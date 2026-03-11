import { motion } from 'framer-motion'

function PreferencesPanel({
  open,
  onClose,
  viewMode,
  setViewMode,
  showStats,
  setShowStats,
  showDailyRitual,
  setShowDailyRitual,
  showCustomizer,
  setShowCustomizer,
  isDesktop,
  onRescanLibrary,
  onExportBackup,
  onRestoreBackup,
  maintenanceStatus,
  backupBusy,
  restoreBusy,
  rescanBusy,
  lastRescanAt,
  userData,
  onUpdateUserData,
  snapshots = [],
  onCreateSnapshot,
  onRestoreSnapshot,
  snapshotBusy,
  integrityStatus,
  onRunDoctor,
  doctorBusy,
  onRebuildIndex,
}) {
  if (!open) return null

  return (
    <motion.div
      className="preferences-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="preferences-panel"
        initial={{ y: -10, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -10, opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="preferences-header">
          <div className="preferences-title">Preferences</div>
          <button type="button" className="preferences-close" onClick={onClose} aria-label="Close preferences">
            Close
          </button>
        </div>
        <div className="preferences-section">
          <div className="preferences-group">
            <div className="preferences-label">Interface</div>
          <button
            type="button"
            className={`preferences-toggle ${showStats ? 'active' : ''}`}
            onClick={() => setShowStats((prev) => !prev)}
          >
            Reading Statistics
          </button>
          <button
            type="button"
            className={`preferences-toggle ${showDailyRitual ? 'active' : ''}`}
            onClick={() => setShowDailyRitual((prev) => !prev)}
          >
            Daily Ritual
          </button>
          <button
            type="button"
            className={`preferences-toggle ${showCustomizer ? 'active' : ''}`}
            onClick={() => setShowCustomizer((prev) => !prev)}
          >
            Library Appearance
          </button>
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
              onClick={() => setViewMode('spine')}
            >
              Spine View
            </button>
            <button
              type="button"
              className={`preferences-toggle ${viewMode === 'front' ? 'active' : ''}`}
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
              <button
                type="button"
                className={`preferences-toggle ${userData?.semanticSearchEnabled ? 'active' : ''}`}
                onClick={() => onUpdateUserData?.({ semanticSearchEnabled: !userData?.semanticSearchEnabled })}
              >
                Semantic Search {userData?.semanticSearchEnabled ? 'On' : 'Off'}
              </button>
            </div>
            </div>
          </>
        )}
        {isDesktop && (
          <>
            <div className="preferences-divider" />
            <div className="preferences-section">
              <div className="preferences-group">
              <div className="preferences-label">Library Maintenance</div>
              <label className="preferences-field">
                Ingest retention (days)
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={userData?.ingestJobRetentionDays ?? 14}
                  onChange={(event) => onUpdateUserData?.({ ingestJobRetentionDays: Number(event.target.value) || 14 })}
                />
              </label>
              {lastRescanAt ? (
                <div className="preferences-hint">
                  Last scan: {new Date(lastRescanAt).toLocaleString()}
                </div>
              ) : (
                <div className="preferences-hint">Last scan: Never</div>
              )}
              <div className="preferences-row">
                <button
                  type="button"
                  className="preferences-toggle"
                  onClick={onRescanLibrary}
                  disabled={rescanBusy}
                >
                  {rescanBusy ? 'Rescanning...' : 'Rescan Files'}
                </button>
                <button
                  type="button"
                  className="preferences-toggle"
                  onClick={onExportBackup}
                  disabled={backupBusy}
                >
                  {backupBusy ? 'Saving...' : 'Export Backup'}
                </button>
              </div>
              <div className="preferences-row">
                <button
                  type="button"
                  className="preferences-toggle"
                  onClick={onRestoreBackup}
                  disabled={restoreBusy}
                >
                  {restoreBusy ? 'Restoring...' : 'Restore Backup'}
                </button>
              </div>
              {maintenanceStatus && (
                <div className="preferences-hint">{maintenanceStatus}</div>
              )}
            </div>
            </div>
            <div className="preferences-divider" />
            <div className="preferences-section">
              <div className="preferences-group">
              <div className="preferences-label">Version History</div>
              <label className="preferences-field">
                Auto snapshot (hours)
                <input
                  type="number"
                  min="0"
                  max="168"
                  value={userData?.autoSnapshotIntervalHours ?? 24}
                  onChange={(event) => onUpdateUserData?.({ autoSnapshotIntervalHours: Number(event.target.value) || 0 })}
                />
              </label>
              <button
                type="button"
                className="preferences-toggle"
                onClick={onCreateSnapshot}
                disabled={snapshotBusy}
              >
                {snapshotBusy ? 'Saving…' : 'Create Snapshot'}
              </button>
              <div className="preferences-list">
                {snapshots.length === 0 && (
                  <div className="preferences-hint">No snapshots yet.</div>
                )}
                {snapshots.map((snapshot) => (
                  <div key={snapshot.id} className="preferences-list-item">
                    <div>
                      <div className="preferences-list-title">
                        {snapshot.note || 'Library Snapshot'}
                      </div>
                      <div className="preferences-hint">
                        {snapshot.created_at ? new Date(snapshot.created_at).toLocaleString() : ''}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="preferences-toggle"
                      onClick={() => onRestoreSnapshot?.(snapshot)}
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            </div>
            </div>
            <div className="preferences-divider" />
            <div className="preferences-section">
              <div className="preferences-group">
              <div className="preferences-label">Library Doctor</div>
              <div className="preferences-hint">
                Status: {integrityStatus?.status || 'Unknown'}
              </div>
              <div className="preferences-row">
                <button
                  type="button"
                  className="preferences-toggle"
                  onClick={onRunDoctor}
                  disabled={doctorBusy}
                >
                  {doctorBusy ? 'Running…' : 'Run Doctor'}
                </button>
                <button
                  type="button"
                  className="preferences-toggle"
                  onClick={onRebuildIndex}
                >
                  Rebuild Search Index
                </button>
              </div>
              {integrityStatus?.details && (
                <div className="preferences-hint">
                  {integrityStatus.details}
                </div>
              )}
            </div>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}

export default PreferencesPanel
