export function isTauri() {
  return typeof window !== 'undefined' && Boolean(window.__TAURI__)
}
