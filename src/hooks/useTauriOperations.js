import { useMaintenanceStatus } from './tauri/useMaintenanceStatus'
import { useTauriBootstrap } from './tauri/useTauriBootstrap'
import { useTauriImportOperations } from './tauri/useTauriImportOperations'
import { useTauriMaintenanceOperations } from './tauri/useTauriMaintenanceOperations'
import { useTauriRecoveryOperations } from './tauri/useTauriRecoveryOperations'

export function useTauriOperations({
  libraryPath,
  setLibraryPath,
  libraryReady,
  books,
  documents,
  shelves,
  userData,
  updateBookItem,
  insertBookItem,
  insertDocumentItem,
  updateUserState,
  updateShelvesState,
  refreshLibraryState,
  flushLibraryState,
  setVaultError,
  actions,
  ingestBusy,
}) {
  const { maintenanceStatus, showMaintenanceStatus } = useMaintenanceStatus()

  const importOperations = useTauriImportOperations({
    libraryPath,
    books,
    shelves,
    updateBookItem,
    insertBookItem,
    insertDocumentItem,
    updateShelvesState,
    updateUserState,
    flushLibraryState,
    setVaultError,
    showMaintenanceStatus,
  })

  const maintenanceOperations = useTauriMaintenanceOperations({
    libraryPath,
    libraryReady,
    flushLibraryState,
    refreshLibraryState,
    updateUserState,
    showMaintenanceStatus,
  })

  const recoveryOperations = useTauriRecoveryOperations({
    libraryPath,
    setLibraryPath,
    libraryReady,
    userData,
    flushLibraryState,
    updateUserState,
    showMaintenanceStatus,
  })

  useTauriBootstrap({
    libraryPath,
    libraryReady,
    ingestBusy,
    books,
    documents,
    userData,
    updateBookItem,
    insertDocumentItem,
    updateUserState,
    refreshLibraryState,
    actions,
  })

  return {
    maintenanceStatus,
    ...importOperations,
    ...maintenanceOperations,
    ...recoveryOperations,
  }
}
