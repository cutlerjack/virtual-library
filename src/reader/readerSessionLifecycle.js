import { endReadingSession, startReadingSession } from '../data/libraryDb'

export async function startReaderSessionBestEffort(libraryPath, session) {
  if (!libraryPath || !session?.itemId || !session?.mode) return null

  try {
    return await startReadingSession(libraryPath, {
      device: 'desktop',
      ...session,
    })
  } catch (error) {
    console.warn('[reader-session] Unable to start reading session:', error?.message || error)
    return null
  }
}

export async function endReaderSessionBestEffort(libraryPath, sessionId) {
  if (!libraryPath || !sessionId) return false

  try {
    await endReadingSession(libraryPath, sessionId)
    return true
  } catch (error) {
    console.warn('[reader-session] Unable to end reading session:', error?.message || error)
    return false
  }
}
