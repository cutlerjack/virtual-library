import { open as tauriOpen, save as tauriSave } from '@tauri-apps/api/dialog'

function shiftDialogOverride(queueName) {
  if (typeof window === 'undefined') return undefined
  const state = window.__VIRTUAL_LIBRARY_TEST_DIALOGS__
  if (!state || !Array.isArray(state[queueName]) || state[queueName].length === 0) {
    return undefined
  }
  return state[queueName].shift()
}

export async function openDialog(options) {
  const override = shiftDialogOverride('openQueue')
  if (override !== undefined) return override
  return tauriOpen(options)
}

export async function saveDialog(options) {
  const override = shiftDialogOverride('saveQueue')
  if (override !== undefined) return override
  return tauriSave(options)
}
