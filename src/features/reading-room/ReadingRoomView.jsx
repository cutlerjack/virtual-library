import LibraryVaultPanel from '../../components/LibraryVaultPanel'
import IngestionQueuePanel from '../../components/IngestionQueuePanel'

function ReadingRoomView({
  documents,
  libraryPath,
  onImport,
  onReadDocument,
  vaultError,
  lastRescanAt,
  ingestJobs,
  ingestBusy,
  onRetryIngest,
  onCancelIngest,
  onRunAllOcr,
}) {
  return (
    <div className="documents-page">
      <section className="press-hero documents-hero">
        <div>
          <div className="press-hero-eyebrow">Document Vault</div>
          <h2 className="press-hero-title">Keep your PDFs and articles together.</h2>
          <p className="press-hero-lede">
            Import PDFs, EPUBs, and articles to read them inside your library without
            interrupting your shelves.
          </p>
        </div>
        <div className="press-hero-metrics">
          <div className="press-hero-metric">
            <div className="press-hero-metric-value">{documents.length}</div>
            <div className="press-hero-metric-label">Documents</div>
          </div>
          <div className="press-hero-metric">
            <div className="press-hero-metric-value">{documents.filter((doc) => doc.type === 'pdf').length}</div>
            <div className="press-hero-metric-label">PDFs</div>
          </div>
          <div className="press-hero-metric">
            <div className="press-hero-metric-value">{documents.filter((doc) => doc.type === 'epub').length}</div>
            <div className="press-hero-metric-label">EPUBs</div>
          </div>
          <div className="press-hero-metric">
            <div className="press-hero-metric-value">{documents.filter((doc) => doc.type === 'article').length}</div>
            <div className="press-hero-metric-label">Articles</div>
          </div>
        </div>
      </section>

      <IngestionQueuePanel
        jobs={ingestJobs}
        busy={ingestBusy}
        onRetry={onRetryIngest}
        onCancel={onCancelIngest}
        onRunAllOcr={onRunAllOcr}
      />

      <LibraryVaultPanel
        libraryPath={libraryPath}
        documents={documents}
        onImport={onImport}
        onReadDocument={onReadDocument}
        vaultError={vaultError}
        lastRescanAt={lastRescanAt}
      />
    </div>
  )
}

export default ReadingRoomView
