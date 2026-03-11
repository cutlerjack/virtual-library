import { describe, expect, it } from 'vitest'
import { toCloneSafeArrayBuffer, toExactUint8Array } from './binary'
import { computeSha256 } from './fileHash'

describe('binary helpers', () => {
  it('preserves exact byte windows for typed arrays', () => {
    const full = new Uint8Array([1, 2, 3, 4, 5, 6])
    const slice = new Uint8Array(full.buffer, 2, 3)
    const exact = toExactUint8Array(slice)
    expect(Array.from(exact)).toEqual([3, 4, 5])
  })

  it('creates clone-safe copied buffers', () => {
    const full = new Uint8Array([10, 20, 30, 40, 50, 60])
    const slice = new Uint8Array(full.buffer, 1, 4)
    const cloneSafe = toCloneSafeArrayBuffer(slice)
    const bytes = Array.from(new Uint8Array(cloneSafe))
    expect(bytes).toEqual([20, 30, 40, 50])
  })

  it('hashes offset views deterministically', async () => {
    const full = new Uint8Array([65, 66, 67, 68, 69])
    const view = new Uint8Array(full.buffer, 1, 3)
    const expected = await computeSha256(new Uint8Array([66, 67, 68]))
    const actual = await computeSha256(view)
    expect(actual).toBe(expected)
  })
})
