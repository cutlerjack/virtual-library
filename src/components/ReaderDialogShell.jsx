import React, { useId, useRef } from 'react'
import { motion } from 'framer-motion'
import { useOverlayFocusTrap } from './useOverlayFocusTrap'

function ReaderDialogShell({
  title,
  eyebrow = 'Reader',
  onClose,
  focusMode = false,
  sidebarOpen = true,
  onToggleSidebar,
  onToggleFocusMode,
  overlayClassName = '',
  panelClassName = '',
  headerClassName = '',
  eyebrowClassName = '',
  titleClassName = '',
  sessionPanel = null,
  banner = null,
  children,
}) {
  const panelRef = useRef(null)
  const titleId = useId()

  useOverlayFocusTrap({ containerRef: panelRef, onClose })

  return (
    <motion.div
      className={`modal-overlay ${overlayClassName}`.trim()}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        ref={panelRef}
        className={panelClassName}
        initial={{ scale: 0.98, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.98, opacity: 0, y: 20 }}
        transition={{ duration: 0.2 }}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className={headerClassName}>
          <div>
            <div className={eyebrowClassName}>{eyebrow}</div>
            <div id={titleId} className={titleClassName}>{title || `Untitled ${eyebrow}`}</div>
          </div>
          <div className="kindle-reader-actions">
            <button
              type="button"
              className="btn-secondary text-xs px-3 py-2"
              onClick={() => onToggleSidebar?.()}
            >
              {sidebarOpen ? 'Hide Notes' : 'Show Notes'}
            </button>
            <button
              type="button"
              className="btn-secondary text-xs px-3 py-2"
              onClick={() => onToggleFocusMode?.()}
            >
              {focusMode ? 'Exit Focus' : 'Focus Mode'}
            </button>
            <button type="button" className="btn-secondary text-xs px-3 py-2" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        {sessionPanel}
        {banner}
        {children}
      </motion.div>
    </motion.div>
  )
}

export default ReaderDialogShell
