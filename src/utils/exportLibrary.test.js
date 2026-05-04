/* @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { exportLibrary } from './exportLibrary'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('exportLibrary', () => {
  it('treats malformed export inputs as empty lists', () => {
    const createObjectURL = vi.fn(() => 'blob:virtual-library-export')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', {
      createObjectURL,
      revokeObjectURL,
    })
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    expect(() => exportLibrary(null, null)).not.toThrow()

    expect(clickSpy).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:virtual-library-export')
  })

  it('revokes the export URL and removes the link when browser download fails', () => {
    const createObjectURL = vi.fn(() => 'blob:virtual-library-export')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', {
      createObjectURL,
      revokeObjectURL,
    })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      throw new Error('download blocked')
    })

    expect(() => exportLibrary([
      { title: 'Book', author: 'Author', shelves: ['all'] },
    ], [
      { id: 'all', name: 'All Books' },
    ])).toThrow('download blocked')

    expect(createObjectURL).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:virtual-library-export')
    expect(document.querySelector('a[download]')).toBeNull()
  })
})
