/* @vitest-environment jsdom */

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AddBookModal from './AddBookModal'

vi.mock('../utils/tauri', () => ({
  isTauri: () => true,
}))

let container = null
let root = null

function renderIntoDom(element) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(element)
  })
}

function findButton(label) {
  return Array.from(document.body.querySelectorAll('button')).find((button) => (
    button.textContent === label
  ))
}

afterEach(() => {
  if (root) {
    act(() => {
      root.unmount()
    })
  }
  container?.remove()
  container = null
  root = null
  document.body.style.overflow = ''
})

describe('AddBookModal migration mode', () => {
  it('keeps the dialog open when migration does not complete', async () => {
    const onClose = vi.fn()
    const onMigrateExport = vi.fn(() => Promise.resolve(false))
    renderIntoDom(
      <AddBookModal
        onClose={onClose}
        onAddBook={() => {}}
        onAddArticle={async () => {}}
        onMigrateExport={onMigrateExport}
      />
    )

    await act(async () => {
      findButton('Migrate').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await act(async () => {
      findButton('Choose Export JSON').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onMigrateExport).toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
    expect(document.body.querySelector('[role="dialog"]')).toBeTruthy()
    expect(document.body.textContent).toContain('Migration did not complete. Choose a valid export JSON.')
  })

  it('closes the dialog after a completed migration', async () => {
    const onClose = vi.fn()
    renderIntoDom(
      <AddBookModal
        onClose={onClose}
        onAddBook={() => {}}
        onAddArticle={async () => {}}
        onMigrateExport={() => Promise.resolve(true)}
      />
    )

    await act(async () => {
      findButton('Migrate').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await act(async () => {
      findButton('Choose Export JSON').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onClose).toHaveBeenCalled()
  })

  it('blocks closing while migration is running', async () => {
    const onClose = vi.fn()
    let resolveMigration
    const onMigrateExport = vi.fn(() => new Promise((resolve) => {
      resolveMigration = resolve
    }))
    renderIntoDom(
      <AddBookModal
        onClose={onClose}
        onAddBook={() => {}}
        onAddArticle={async () => {}}
        onMigrateExport={onMigrateExport}
      />
    )

    await act(async () => {
      findButton('Migrate').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await act(async () => {
      findButton('Choose Export JSON').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const closeButton = document.body.querySelector('button[aria-label="Close Add to Library"]')
    expect(closeButton.disabled).toBe(true)

    await act(async () => {
      closeButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onClose).not.toHaveBeenCalled()

    await act(async () => {
      resolveMigration(true)
      await Promise.resolve()
    })

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
