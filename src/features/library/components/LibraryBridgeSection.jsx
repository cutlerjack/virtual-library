import React from 'react'

function LibraryBridgeSection({ documents, onNavigateToDocuments }) {
  return (
    <section className="library-bridge">
      <div>
        <div className="library-bridge-eyebrow">One Library</div>
        <h3 className="library-bridge-title">Books stay on the shelf. Files live in the Reading Room. They still belong to the same collection.</h3>
        <p className="library-bridge-copy">
          Shelves, tags, search, annotations, and backups span both sides of the library.
        </p>
      </div>
      <div className="library-bridge-actions">
        <div className="library-bridge-stats">
          <span>{documents.length} documents</span>
          <span>{documents.filter((doc) => doc.lastOpened).length} recently opened</span>
        </div>
        <button
          type="button"
          className="btn-secondary text-xs px-3 py-2"
          onClick={onNavigateToDocuments}
        >
          Open Reading Room
        </button>
      </div>
    </section>
  )
}

export default LibraryBridgeSection
