import React from 'react'
import DialogShell from './DialogShell'

function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  onConfirm,
  onClose,
}) {
  return (
    <DialogShell
      open={open}
      title={title}
      onClose={onClose}
      size="sm"
      footer={(
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn-primary ${tone === 'danger' ? 'btn-danger' : ''}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </>
      )}
    >
      <p className="app-dialog-copy">{body}</p>
    </DialogShell>
  )
}

export default ConfirmDialog
