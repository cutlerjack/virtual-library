import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../dbConnection', () => ({
  withDb: vi.fn(),
  withWriteDb: vi.fn(),
  withTransaction: vi.fn(async (_db, fn) => fn()),
}))

const dbConnection = await import('../dbConnection')
const { claimNextIngestJob } = await import('../dbIngest')

function createDb(rows = []) {
  return {
    select: vi.fn(async () => rows),
    execute: vi.fn(),
  }
}

describe('dbIngest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-04T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('reclaims stale processing jobs when claiming the next ingest job', async () => {
    const db = createDb([{
      id: 'job-1',
      item_id: 'doc-1',
      source_path: '/library/doc.pdf',
      target_path: '/library/doc.pdf',
      force_ocr: 0,
      status: 'processing',
      progress: 50,
      error: null,
      attempt_count: 1,
      created_at: '2026-05-04T11:00:00.000Z',
      updated_at: '2026-05-04T11:10:00.000Z',
      item_kind: 'document',
      item_title: 'Queued PDF',
      item_author: 'Tester',
      item_meta_json: JSON.stringify({ type: 'pdf', filePath: '/library/doc.pdf' }),
      file_path: '/library/doc.pdf',
      file_mime: 'application/pdf',
    }])
    dbConnection.withWriteDb.mockImplementationOnce(async (_libraryPath, fn) => fn(db))

    const job = await claimNextIngestJob('/library')

    expect(db.select).toHaveBeenCalledWith(
      expect.stringContaining('OR (j.status = ? AND COALESCE(j.updated_at, j.created_at) < ?)'),
      ['queued', 'processing', '2026-05-04T11:45:00.000Z']
    )
    expect(db.execute).toHaveBeenCalledWith(
      expect.stringContaining('SET status = ?, progress = ?, error = NULL'),
      ['processing', 0, '2026-05-04T12:00:00.000Z', 'job-1']
    )
    expect(job).toEqual(expect.objectContaining({
      id: 'job-1',
      status: 'processing',
      attempt_count: 2,
      doc: expect.objectContaining({
        id: 'doc-1',
        title: 'Queued PDF',
        filePath: '/library/doc.pdf',
      }),
    }))
  })

  it('marks claim payloads without a joined item as missing items', async () => {
    const db = createDb([{
      id: 'job-orphan',
      item_id: 'deleted-doc',
      source_path: '/library/deleted.pdf',
      target_path: '/library/deleted.pdf',
      force_ocr: 0,
      status: 'queued',
      progress: 0,
      error: null,
      attempt_count: 0,
      created_at: '2026-05-04T11:55:00.000Z',
      updated_at: '2026-05-04T11:55:00.000Z',
      item_kind: null,
      item_title: null,
      item_author: null,
      item_meta_json: null,
      file_path: null,
      file_mime: null,
    }])
    dbConnection.withWriteDb.mockImplementationOnce(async (_libraryPath, fn) => fn(db))

    const job = await claimNextIngestJob('/library')

    expect(job.doc).toEqual(expect.objectContaining({
      id: null,
      title: null,
      filePath: '/library/deleted.pdf',
    }))
  })
})
