import { describe, expect, it } from 'vitest'
import { buildStudyStackNavigation, deriveStudySessionCompletedAt } from '../studyStack'

describe('buildStudyStackNavigation', () => {
  it('returns current and next incomplete entries in stored order', () => {
    const navigation = buildStudyStackNavigation({
      studyStack: [
        { id: 'entry-1', text: 'Current', completedAt: null },
        { id: 'entry-2', text: 'Completed', completedAt: '2026-03-11T10:00:00.000Z' },
        { id: 'entry-3', text: 'Next', completedAt: null },
      ],
    }, 'entry-1')

    expect(navigation.currentIndex).toBe(0)
    expect(navigation.currentEntry.text).toBe('Current')
    expect(navigation.nextEntry.text).toBe('Next')
  })

  it('falls back to the next incomplete entry elsewhere in the stack', () => {
    const navigation = buildStudyStackNavigation({
      studyStack: [
        { id: 'entry-1', text: 'Done first', completedAt: '2026-03-11T10:00:00.000Z' },
        { id: 'entry-2', text: 'Current', completedAt: null },
        { id: 'entry-3', text: 'Done later', completedAt: '2026-03-11T11:00:00.000Z' },
        { id: 'entry-4', text: 'Fallback', completedAt: null },
      ],
    }, 'entry-2')

    expect(navigation.nextEntry.text).toBe('Fallback')
  })
})

describe('deriveStudySessionCompletedAt', () => {
  it('returns the latest completion timestamp only when every entry is complete', () => {
    expect(deriveStudySessionCompletedAt([
      { id: 'entry-1', completedAt: '2026-03-11T10:00:00.000Z' },
      { id: 'entry-2', completedAt: '2026-03-11T11:00:00.000Z' },
    ])).toBe('2026-03-11T11:00:00.000Z')

    expect(deriveStudySessionCompletedAt([
      { id: 'entry-1', completedAt: '2026-03-11T10:00:00.000Z' },
      { id: 'entry-2', completedAt: null },
    ])).toBeNull()
  })
})
