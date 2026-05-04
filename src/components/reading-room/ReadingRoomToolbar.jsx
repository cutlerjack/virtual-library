import React from 'react'

const FILTER_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'pdf', label: 'PDFs' },
  { id: 'epub', label: 'EPUBs' },
  { id: 'article', label: 'Articles' },
  { id: 'file', label: 'Other' },
]

function ReadingRoomToolbar({
  query,
  sortMode,
  filter,
  viewMode,
  onQueryChange,
  onSortModeChange,
  onFilterChange,
  onViewModeChange,
}) {
  return (
    <div className="reading-room-toolbar">
      <label className="reading-room-search">
        <span>Search</span>
        <input
          type="search"
          placeholder="Search titles or filenames"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </label>
      <label className="reading-room-sort">
        <span>Sort</span>
        <select value={sortMode} onChange={(event) => onSortModeChange(event.target.value)}>
          <option value="recent">Recent</option>
          <option value="title">Title</option>
          <option value="progress">Progress</option>
        </select>
      </label>
      <div className="reading-room-filters">
        {FILTER_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`reading-room-filter ${filter === option.id ? 'active' : ''}`}
            onClick={() => onFilterChange(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="reading-room-view-toggle">
        <button
          type="button"
          className={`reading-room-filter ${viewMode === 'grid' ? 'active' : ''}`}
          onClick={() => onViewModeChange('grid')}
        >
          Grid
        </button>
        <button
          type="button"
          className={`reading-room-filter ${viewMode === 'list' ? 'active' : ''}`}
          onClick={() => onViewModeChange('list')}
        >
          List
        </button>
      </div>
    </div>
  )
}

export default ReadingRoomToolbar
