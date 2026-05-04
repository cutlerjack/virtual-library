// Barrel re-export — libraryDb.js was split into domain modules.
// Existing consumers can continue importing from this file unchanged.

export { closeLibraryDb } from './dbConnection'

export { loadLibraryStateFromDb, saveLibraryStateToDb } from './dbLibrary'

export { saveBookItemToDb, saveDocumentItemToDb, deleteItemFromDb } from './dbCatalog'

export { saveUserSettingsToDb } from './dbPreferences'

export { saveShelvesToDb, saveSpineLibraryToDb } from './dbLibraryMeta'

export {
  searchLibrary,
  rescanLibraryFiles,
  updateSearchDoc,
  rebuildSearchIndex,
} from './dbSearch'

export {
  enqueueIngestJobUnique,
  enqueueIngestJob,
  listIngestJobsPaged,
  getIngestJobs,
  claimNextIngestJob,
  pruneIngestJobs,
  updateIngestJob,
} from './dbIngest'

export {
  saveTextChunks,
  saveOcrPages,
  startReadingSession,
  endReadingSession,
  addSnapshotRecord,
  listSnapshots,
  addIntegrityCheck,
  listIntegrityChecks,
  runIntegrityCheck,
} from './dbSessions'
