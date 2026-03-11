import { describe, expect, it } from 'vitest'
import { buildLayoutOffsets, pageFromOffset } from './usePdfLayoutIndex'

describe('usePdfLayoutIndex math', () => {
  it('builds offsets for variable heights', () => {
    const { offsets, totalHeight } = buildLayoutOffsets([100, 120, 80], 10)
    expect(offsets).toEqual([0, 110, 240])
    expect(totalHeight).toBe(330)
  })

  it('maps offsets back to the correct page', () => {
    const heights = [100, 120, 80]
    const { offsets } = buildLayoutOffsets(heights, 10)
    expect(pageFromOffset(0, offsets, heights, 10)).toBe(1)
    expect(pageFromOffset(109, offsets, heights, 10)).toBe(1)
    expect(pageFromOffset(110, offsets, heights, 10)).toBe(2)
    expect(pageFromOffset(239, offsets, heights, 10)).toBe(2)
    expect(pageFromOffset(240, offsets, heights, 10)).toBe(3)
    expect(pageFromOffset(9999, offsets, heights, 10)).toBe(3)
  })
})
