import React from 'react'

function IngestionQueuePanel({ jobs = [], busy = false, isDesktop = false, onRetry, onCancel, onRunAllOcr }) {
  const summary = jobs.reduce((acc, job) => {
    const key = job.status || 'queued'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
  const ocrDisabled = busy || !isDesktop || typeof onRunAllOcr !== 'function'

  return (
    <section className="ingest-queue">
      <div className="ingest-queue-header">
        <div>
          <div className="ingest-queue-eyebrow">Ingestion Queue</div>
          <h3 className="ingest-queue-title">Background processing for new files.</h3>
          {busy && (
            <div className="ingest-queue-busy">
              <span className="ingest-queue-busy-dot" />
              Processing queue
            </div>
          )}
        </div>
        <button
          type="button"
          className="btn-secondary text-xs px-3 py-2"
          onClick={onRunAllOcr}
          disabled={ocrDisabled}
          title={isDesktop ? 'Queue OCR for every eligible PDF' : 'OCR runs in the desktop app'}
        >
          {busy ? 'Processing...' : 'OCR Everything'}
        </button>
      </div>
      {!isDesktop && (
        <div className="ingest-queue-hint">
          OCR and file processing run in the desktop app.
        </div>
      )}
      <div className="ingest-queue-summary">
        <div className="ingest-queue-pill">Queued: {summary.queued || 0}</div>
        <div className="ingest-queue-pill">Processing: {summary.processing || 0}</div>
        <div className="ingest-queue-pill">Failed: {summary.failed || 0}</div>
        <div className="ingest-queue-pill">Orphaned: {summary.orphaned || 0}</div>
      </div>
      {busy && jobs.length === 0 && (
        <div className="ingest-queue-loading">
          <div className="ingest-queue-skeleton" />
          <div className="ingest-queue-skeleton" />
          <div className="ingest-queue-skeleton short" />
        </div>
      )}
      {jobs.length === 0 ? (
        <div className="ingest-queue-empty">{busy ? 'Queue warming up...' : 'No ingestion jobs running.'}</div>
      ) : (
        <div className="ingest-queue-list">
          {jobs.map((job) => (
            <div key={job.id} className="ingest-queue-item">
              <div>
                <div className="ingest-queue-title" title={job.target_path || job.source_path}>
                  {job.target_path || job.source_path}
                </div>
                <div className="ingest-queue-meta">
                  {job.status} · {Math.round((job.progress || 0) * 100)}%
                </div>
                <div className="ingest-queue-progress-track">
                  <div
                    className="ingest-queue-progress-fill"
                    style={{ width: `${Math.round((job.progress || 0) * 100)}%` }}
                  />
                </div>
                {job.error && <div className="ingest-queue-error">{job.error}</div>}
              </div>
              <div className="ingest-queue-actions">
                {(job.status === 'failed' || job.status === 'orphaned') && (
                  <button
                    type="button"
                    className="btn-secondary text-xs px-3 py-2"
                    onClick={() => onRetry?.(job)}
                  >
                    Retry
                  </button>
                )}
                {job.status === 'queued' && (
                  <button
                    type="button"
                    className="btn-secondary text-xs px-3 py-2"
                    onClick={() => onCancel?.(job)}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default IngestionQueuePanel
