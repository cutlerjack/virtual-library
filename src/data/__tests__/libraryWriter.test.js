import { describe, expect, it } from 'vitest'
import { awaitPendingLibraryWrites, enqueueLibraryWrite } from '../libraryWriter'

describe('libraryWriter', () => {
  it('waits for queued writes on a library path to finish', async () => {
    let releaseFirst
    let firstFinished = false

    enqueueLibraryWrite('library-a', async () => new Promise((resolve) => {
      releaseFirst = () => {
        firstFinished = true
        resolve()
      }
    }))

    let finished = false
    const pending = awaitPendingLibraryWrites('library-a').then(() => {
      finished = true
    })

    await Promise.resolve()
    expect(finished).toBe(false)

    releaseFirst()
    await pending

    expect(firstFinished).toBe(true)
    expect(finished).toBe(true)
  })

  it('resolves immediately when no writes are queued', async () => {
    await expect(awaitPendingLibraryWrites('missing-library')).resolves.toBeUndefined()
  })

  it('tracks the latest queued write for a path', async () => {
    const order = []

    enqueueLibraryWrite('library-b', async () => {
      order.push('first-start')
      await Promise.resolve()
      order.push('first-end')
    })

    enqueueLibraryWrite('library-b', async () => {
      order.push('second')
    })

    await awaitPendingLibraryWrites('library-b')
    expect(order).toEqual(['first-start', 'first-end', 'second'])
  })

  it('cleans up rejected writes without poisoning later pending-write waits', async () => {
    const failed = enqueueLibraryWrite('library-c', async () => {
      throw new Error('disk full')
    })

    await expect(failed).rejects.toThrow('disk full')
    await expect(awaitPendingLibraryWrites('library-c')).resolves.toBeUndefined()

    const order = []
    await enqueueLibraryWrite('library-c', async () => {
      order.push('recovered')
    })
    await expect(awaitPendingLibraryWrites('library-c')).resolves.toBeUndefined()
    expect(order).toEqual(['recovered'])
  })
})
