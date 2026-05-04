import { useEffect } from 'react'

function isElementVisible(element) {
  if (!(element instanceof HTMLElement)) return false
  if (element.hasAttribute('hidden') || element.getAttribute('aria-hidden') === 'true') return false
  const style = window.getComputedStyle(element)
  if (style.display === 'none' || style.visibility === 'hidden') return false
  return element.getClientRects().length > 0
}

export function getFocusableElements(container) {
  if (!container) return []
  return Array.from(
    container.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter(isElementVisible)
}

export function useOverlayFocusTrap({ enabled = true, containerRef, onClose }) {
  useEffect(() => {
    if (!enabled) return undefined

    const previousActive = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusFrame = requestAnimationFrame(() => {
      const focusable = getFocusableElements(containerRef.current)
      const focusTarget = focusable[0] || containerRef.current
      focusTarget?.focus?.()
    })

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose?.()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = getFocusableElements(containerRef.current)
      if (focusable.length === 0) {
        event.preventDefault()
        containerRef.current?.focus?.()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement

      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      cancelAnimationFrame(focusFrame)
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      if (previousActive?.isConnected) {
        previousActive.focus?.()
      }
    }
  }, [containerRef, enabled, onClose])
}
