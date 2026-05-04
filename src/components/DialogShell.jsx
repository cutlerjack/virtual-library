import React, { useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useOverlayFocusTrap } from './useOverlayFocusTrap'

function DialogShell({
  open,
  title,
  onClose,
  children,
  footer = null,
  size = 'md',
  panelClassName = '',
  bodyClassName = '',
  closeDisabled = false,
}) {
  const panelRef = useRef(null)
  const titleId = useId()
  const effectiveOnClose = closeDisabled ? undefined : onClose

  useOverlayFocusTrap({ enabled: open, containerRef: panelRef, onClose: effectiveOnClose })

  if (!open) return null

  const dialog = (
    <motion.div
      className="modal-overlay app-dialog-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={effectiveOnClose}
    >
      <motion.div
        ref={panelRef}
        className={`modal-content app-dialog app-dialog-${size} ${panelClassName}`.trim()}
        initial={{ scale: 0.98, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.98, opacity: 0, y: 16 }}
        transition={{ duration: 0.18 }}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="app-dialog-header">
          <h2 id={titleId} className="app-dialog-title">{title}</h2>
          <button
            type="button"
            className="app-dialog-close"
            onClick={effectiveOnClose}
            disabled={closeDisabled}
            aria-label={`Close ${title}`}
          >
            Close
          </button>
        </div>
        <div className={`app-dialog-body ${bodyClassName}`.trim()}>{children}</div>
        {footer && <div className="app-dialog-footer">{footer}</div>}
      </motion.div>
    </motion.div>
  )

  return createPortal(dialog, document.body)
}

export default DialogShell
