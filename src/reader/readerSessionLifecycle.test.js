import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { endReadingSession, startReadingSession } from '../data/libraryDb'
import {
  endReaderSessionBestEffort,
  startReaderSessionBestEffort,
} from './readerSessionLifecycle'

vi.mock('../data/libraryDb', () => ({
  endReadingSession: vi.fn(),
  startReadingSession: vi.fn(),
}))

describe('readerSessionLifecycle', () => {
  let warnSpy

  beforeEach(() => {
    vi.clearAllMocks()
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
  })

  it('starts a session when tracking is available', async () => {
    startReadingSession.mockResolvedValue('session-1')

    const sessionId = await startReaderSessionBestEffort('/library', {
      itemId: 'doc-1',
      mode: 'article',
    })

    expect(sessionId).toBe('session-1')
    expect(startReadingSession).toHaveBeenCalledWith('/library', {
      itemId: 'doc-1',
      mode: 'article',
      device: 'desktop',
    })
  })

  it('does not block the reader when session start fails', async () => {
    startReadingSession.mockRejectedValue(new Error('database locked'))

    const sessionId = await startReaderSessionBestEffort('/library', {
      itemId: 'doc-1',
      mode: 'pdf',
    })

    expect(sessionId).toBeNull()
    expect(warnSpy).toHaveBeenCalledWith(
      '[reader-session] Unable to start reading session:',
      'database locked'
    )
  })

  it('does not block close when session end fails', async () => {
    endReadingSession.mockRejectedValue(new Error('database locked'))

    const ended = await endReaderSessionBestEffort('/library', 'session-1')

    expect(ended).toBe(false)
    expect(endReadingSession).toHaveBeenCalledWith('/library', 'session-1')
    expect(warnSpy).toHaveBeenCalledWith(
      '[reader-session] Unable to end reading session:',
      'database locked'
    )
  })
})
