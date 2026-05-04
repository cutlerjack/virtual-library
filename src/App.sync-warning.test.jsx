/* @vitest-environment jsdom */

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LibrarySyncWarning } from './App'

let container = null
let root = null
let warnSpy = null

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  if (root) {
    act(() => {
      root.unmount()
    })
  }
  container?.remove()
  container = null
  root = null
  warnSpy?.mockRestore()
  warnSpy = null
})

describe('LibrarySyncWarning', () => {
  it('catches reload failures from the UI action', async () => {
    const onReload = vi.fn(() => Promise.reject(new Error('database locked')))

    act(() => {
      root.render(<LibrarySyncWarning error={{ message: 'Unsaved' }} onReload={onReload} />)
    })

    const reloadButton = Array.from(container.querySelectorAll('button')).find((button) => (
      button.textContent === 'Reload Library'
    ))
    expect(reloadButton).toBeTruthy()

    await act(async () => {
      reloadButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    expect(onReload).toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledWith(
      '[library-sync] Unable to reload library:',
      'database locked'
    )
  })
})

