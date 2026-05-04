/* @vitest-environment jsdom */

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ArticleReaderModal from './ArticleReaderModal'

vi.mock('./ReaderDialogShell', () => ({
  default: ({ banner, children }) => (
    <div>
      {banner}
      {children}
    </div>
  ),
}))

function renderArticle(props) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(
      <ArticleReaderModal
        title="Article"
        notes={[]}
        onClose={() => {}}
        {...props}
      />
    )
  })
  return {
    container,
    cleanup: () => {
      act(() => {
        root.unmount()
      })
      container.remove()
    },
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ArticleReaderModal content hardening', () => {
  it('sanitizes stored article HTML again before rendering it', () => {
    const { container, cleanup } = renderArticle({
      html: `
        <article>
          <h1 onclick="alert('x')">Title</h1>
          <script>window.evil = true</script>
          <a href="javascript:alert('x')">bad link</a>
          <p>Safe body</p>
        </article>
      `,
    })

    expect(container.querySelector('h1')?.getAttribute('onclick')).toBeNull()
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('a')?.getAttribute('href')).toBeNull()
    expect(container.textContent).toContain('Safe body')

    cleanup()
  })

  it('uses plaintext when an article has already been quarantined', () => {
    const { container, cleanup } = renderArticle({
      html: '<p>Unsafe rich body</p>',
      plainText: 'Plain fallback',
      quarantined: true,
    })

    expect(container.querySelector('[role="status"]')?.textContent).toContain('quarantined')
    expect(container.textContent).toContain('Plain fallback')
    expect(container.textContent).not.toContain('Unsafe rich body')

    cleanup()
  })
})
