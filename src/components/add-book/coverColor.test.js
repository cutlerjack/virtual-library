import { beforeEach, describe, expect, it, vi } from 'vitest'
import { extractDominantColor } from '../../utils/colorExtract'
import { extractAddBookSpineColor } from './coverColor'

vi.mock('../../utils/colorExtract', () => ({
  extractDominantColor: vi.fn(),
}))

describe('extractAddBookSpineColor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the extracted cover color', async () => {
    extractDominantColor.mockResolvedValue('#123456')

    await expect(extractAddBookSpineColor('https://example.com/cover.jpg')).resolves.toBe('#123456')

    expect(extractDominantColor).toHaveBeenCalledWith('https://example.com/cover.jpg')
  })

  it('falls back when cover color extraction rejects', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    extractDominantColor.mockRejectedValue(new Error('image failed'))

    await expect(extractAddBookSpineColor('https://example.com/bad-cover.jpg')).resolves.toBe(null)

    expect(warnSpy).toHaveBeenCalledWith(
      '[add-book] Unable to extract cover color:',
      'image failed'
    )

    warnSpy.mockRestore()
  })
})
