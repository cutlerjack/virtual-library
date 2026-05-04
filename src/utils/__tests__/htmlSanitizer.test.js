/* @vitest-environment jsdom */

import { describe, expect, it } from 'vitest'
import { prepareCapturedHtml } from '../htmlSanitizer'

describe('prepareCapturedHtml', () => {
  it('strips blocked elements and event handlers from article HTML', () => {
    const prepared = prepareCapturedHtml(`
      <article>
        <h1 onclick="alert('x')">Hello</h1>
        <script>alert('boom')</script>
        <img src="https://example.com/track.png" />
        <a href="javascript:alert('x')">Bad Link</a>
        <p>Useful text</p>
      </article>
    `)

    expect(prepared.quarantined).toBe(false)
    expect(prepared.sanitizedHtml).toContain('<h1>Hello</h1>')
    expect(prepared.sanitizedHtml).toContain('<p>Useful text</p>')
    expect(prepared.sanitizedHtml).not.toContain('script')
    expect(prepared.sanitizedHtml).not.toContain('onclick')
    expect(prepared.sanitizedHtml).not.toContain('<img')
    expect(prepared.sanitizedHtml).not.toContain('javascript:')
    expect(prepared.plainText).toContain('Useful text')
  })

  it('falls back to plaintext and quarantines when sanitization crashes', () => {
    const OriginalDomParser = globalThis.DOMParser
    globalThis.DOMParser = class {
      parseFromString() {
        throw new Error('parser unavailable')
      }
    }

    try {
      const prepared = prepareCapturedHtml('<p>Hello</p><script>boom</script>')
      expect(prepared.quarantined).toBe(true)
      expect(prepared.sanitizedHtml).toBe('')
      expect(prepared.plainText).toContain('Hello')
      expect(prepared.plainText).not.toContain('script')
    } finally {
      globalThis.DOMParser = OriginalDomParser
    }
  })
})
