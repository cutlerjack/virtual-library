import React from 'react'
import DialogShell from '../../../components/DialogShell'

function CreateExhibitDialog({
  open,
  exhibitName,
  exhibitDescription,
  onChangeName,
  onChangeDescription,
  onClose,
  onCreate,
}) {
  return (
    <DialogShell
      open={open}
      title="Create Exhibit"
      onClose={onClose}
      size="sm"
      footer={(
        <>
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={onCreate}
            disabled={!exhibitName.trim()}
          >
            Create Exhibit
          </button>
        </>
      )}
    >
      <label className="book-page-field">
        Exhibit Name
        <input
          type="text"
          value={exhibitName}
          onChange={(event) => onChangeName(event.target.value)}
          placeholder="Modern Stoicism"
        />
      </label>
      <label className="book-page-field">
        Description
        <textarea
          className="book-page-textarea"
          value={exhibitDescription}
          onChange={(event) => onChangeDescription(event.target.value)}
          placeholder="Optional context for this curated shelf."
        />
      </label>
    </DialogShell>
  )
}

export default CreateExhibitDialog
