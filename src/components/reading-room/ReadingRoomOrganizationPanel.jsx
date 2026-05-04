import React from 'react'

function ReadingRoomOrganizationPanel({
  sharedShelves,
  allLibraryTags,
  activeShelf,
  selectedTags,
  onShelfChange,
  onToggleTag,
  onClearTags,
}) {
  return (
    <div className="reading-room-organization">
      <div className="reading-room-organization-block">
        <div className="reading-room-section-title">Shared Shelves</div>
        <div className="reading-room-chip-row">
          {sharedShelves.map((shelf) => (
            <button
              key={shelf.id}
              type="button"
              className={`reading-room-chip ${activeShelf === shelf.id ? 'active' : ''}`}
              onClick={() => onShelfChange(shelf.id)}
            >
              {shelf.id === 'all' ? 'All Shelves' : shelf.name}
            </button>
          ))}
        </div>
      </div>

      {allLibraryTags.length > 0 && (
        <div className="reading-room-organization-block">
          <div className="reading-room-section-title">Shared Tags</div>
          <div className="reading-room-chip-row">
            {allLibraryTags.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`reading-room-chip ${selectedTags.includes(tag) ? 'active' : ''}`}
                onClick={() => onToggleTag(tag)}
              >
                {tag}
              </button>
            ))}
            {selectedTags.length > 0 && (
              <button
                type="button"
                className="reading-room-chip"
                onClick={onClearTags}
              >
                Clear Tags
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ReadingRoomOrganizationPanel
