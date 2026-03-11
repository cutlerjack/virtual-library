// Barrel re-export — libraryDb.js was split into domain modules.
// Existing consumers can continue importing from this file unchanged.

export { loadLibraryStateFromDb, saveLibraryStateToDb } from './dbLibrary'

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
