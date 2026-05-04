import React, { useState } from 'react'
import ConfirmDialog from '../../components/ConfirmDialog'

function MaintenanceView({
  isDesktop,
  libraryPath,
  userData,
  maintenanceStatus,
  backupBusy,
  restoreBusy,
  rescanBusy,
  lastRescanAt,
  snapshots = [],
  snapshotBusy,
  integrityStatus,
  doctorBusy,
  onUpdateUserData,
  onRescanLibrary,
  onExportBackup,
  onRestoreBackup,
  onCreateSnapshot,
  onRestoreSnapshot,
  onRunDoctor,
  onRebuildIndex,
}) {
  const [pendingSnapshot, setPendingSnapshot] = useState(null)

  const snapshotCount = snapshots.length
  const lastSnapshotAt = snapshots[0]?.created_at

  return (
    <>
      <div className="documents-page maintenance-page">
        <section className="press-hero maintenance-hero">
          <div>
            <div className="press-hero-eyebrow">Maintenance</div>
            <h2 className="press-hero-title">Protect, verify, and recover your local library.</h2>
            <p className="press-hero-lede">
              Backup, restore, and repair tools stay separate from day-to-day reading and are only
              available in the desktop app.
            </p>
          </div>
          <div className="press-hero-metrics">
            <div className="press-hero-metric">
              <div className="press-hero-metric-value">
                {isDesktop ? (libraryPath ? 'Ready' : 'Missing') : 'Desktop only'}
              </div>
              <div className="press-hero-metric-label">Library Folder</div>
            </div>
            <div className="press-hero-metric">
              <div className="press-hero-metric-value">{isDesktop ? snapshotCount : 'Desktop only'}</div>
              <div className="press-hero-metric-label">Snapshots</div>
            </div>
            <div className="press-hero-metric">
              <div className="press-hero-metric-value">
                {isDesktop
                  ? (lastRescanAt ? new Date(lastRescanAt).toLocaleDateString() : 'Never')
                  : 'Not available'}
              </div>
              <div className="press-hero-metric-label">Last Scan</div>
            </div>
            <div className="press-hero-metric">
              <div className="press-hero-metric-value">
                {isDesktop ? (integrityStatus?.status || 'Unknown') : 'Not available'}
              </div>
              <div className="press-hero-metric-label">Integrity</div>
            </div>
          </div>
        </section>

        {!isDesktop && (
          <section className="reading-room-card maintenance-card">
            <div className="card-title">Desktop App Required</div>
            <p className="maintenance-card-copy">
              This web shell can browse the library, but backups, restores, rescans, snapshots, and
              repair tools only run in the desktop app.
            </p>
          </section>
        )}

        {isDesktop && (
          <>
            {maintenanceStatus && (
              <div className="maintenance-status-banner" role="status">
                {maintenanceStatus}
              </div>
            )}

            <div className="maintenance-grid">
              <section className="reading-room-card maintenance-card">
                <div className="card-title">Library Operations</div>
                <p className="maintenance-card-copy">
                  Scan for new files, export the library, or restore from a known-good backup.
                </p>
                <label className="preferences-field">
                  Ingest retention (days)
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={userData?.ingestJobRetentionDays ?? 14}
                    onChange={(event) =>
                      onUpdateUserData?.({ ingestJobRetentionDays: Number(event.target.value) || 14 })
                    }
                  />
                </label>
                <div className="preferences-hint">
                  Folder: {libraryPath || 'No library selected'}
                </div>
                <div className="preferences-row">
                  <button
                    type="button"
                    className="preferences-toggle"
                    onClick={onRescanLibrary}
                    disabled={rescanBusy}
                  >
                    {rescanBusy ? 'Scanning…' : 'Scan Library'}
                  </button>
                  <button
                    type="button"
                    className="preferences-toggle"
                    onClick={onExportBackup}
                    disabled={backupBusy}
                  >
                    {backupBusy ? 'Saving…' : 'Export Backup'}
                  </button>
                </div>
                <div className="preferences-row">
                  <button
                    type="button"
                    className="preferences-toggle"
                    onClick={onRestoreBackup}
                    disabled={restoreBusy}
                  >
                    {restoreBusy ? 'Restoring…' : 'Restore Backup'}
                  </button>
                </div>
              </section>

              <section className="reading-room-card maintenance-card">
                <div className="card-title">Version History</div>
                <p className="maintenance-card-copy">
                  Keep a local timeline so you can roll back the library state if an import or sync goes wrong.
                </p>
                <label className="preferences-field">
                  Auto snapshot (hours)
                  <input
                    type="number"
                    min="0"
                    max="168"
                    value={userData?.autoSnapshotIntervalHours ?? 24}
                    onChange={(event) =>
                      onUpdateUserData?.({ autoSnapshotIntervalHours: Number(event.target.value) || 0 })
                    }
                  />
                </label>
                <button
                  type="button"
                  className="preferences-toggle"
                  onClick={() => onCreateSnapshot?.()}
                  disabled={snapshotBusy}
                >
                  {snapshotBusy ? 'Saving…' : 'Create Snapshot'}
                </button>
                <div className="preferences-list">
                  {snapshotCount === 0 && (
                    <div className="preferences-hint">No snapshots yet.</div>
                  )}
                  {snapshotCount > 0 && lastSnapshotAt && (
                    <div className="preferences-hint">
                      Latest snapshot: {new Date(lastSnapshotAt).toLocaleString()}
                    </div>
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
                        onClick={() => setPendingSnapshot(snapshot)}
                      >
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="reading-room-card maintenance-card">
                <div className="card-title">Integrity Check</div>
                <p className="maintenance-card-copy">
                  Verify integrity and rebuild search data when records drift out of sync.
                </p>
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
                    {doctorBusy ? 'Running…' : 'Run Integrity Check'}
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
              </section>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(pendingSnapshot)}
        title="Restore Snapshot"
        body="Restore this snapshot and replace the current library state? The app will reload after the restore finishes."
        confirmLabel="Restore Snapshot"
        cancelLabel="Keep Current Library"
        tone="danger"
        onClose={() => setPendingSnapshot(null)}
        onConfirm={() => {
          const snapshot = pendingSnapshot
          setPendingSnapshot(null)
          onRestoreSnapshot?.(snapshot)
        }}
      />
    </>
  )
}

export default MaintenanceView
