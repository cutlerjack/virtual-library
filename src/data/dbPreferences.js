import { withTransaction, withWriteDb } from './dbConnection'

export function buildUserSettingsEntries(userSettings = {}, updatedAt = new Date().toISOString()) {
  return [
    ['user', JSON.stringify(userSettings), updatedAt],
    ['reader_max_memory_mb', String(userSettings.readerMaxMemoryMb ?? 800), updatedAt],
    ['reader_cache_pages', String(userSettings.readerCachePages ?? 8), updatedAt],
    ['auto_snapshot_interval_hours', String(userSettings.autoSnapshotIntervalHours ?? 24), updatedAt],
    ['pdf_render_memory_mb', String(userSettings.pdfRenderMemoryMb ?? userSettings.readerMaxMemoryMb ?? 512), updatedAt],
    ['pdf_virtual_overscan_pages', String(userSettings.pdfVirtualOverscanPages ?? 8), updatedAt],
    ['ingest_job_retention_days', String(userSettings.ingestJobRetentionDays ?? 14), updatedAt],
  ]
}

export async function saveUserSettingsToDb(libraryPath, userSettings) {
  return withWriteDb(libraryPath, async (db) => {
    await withTransaction(db, async () => {
      const settingsEntries = buildUserSettingsEntries(userSettings)
      for (const [key, value, updatedAt] of settingsEntries) {
        await db.execute(
          `INSERT INTO settings (key, value, updated_at)
           VALUES (?, ?, ?)
           ON CONFLICT(key) DO UPDATE SET
             value = excluded.value,
             updated_at = excluded.updated_at`,
          [key, value, updatedAt]
        )
      }
    })
  })
}
