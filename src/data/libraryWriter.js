const writeQueues = new Map()

export function enqueueLibraryWrite(libraryPath, task) {
  if (!libraryPath) return Promise.resolve().then(task)

  const previous = writeQueues.get(libraryPath) || Promise.resolve()
  const next = previous.then(task, task)
  const tracked = next
    .catch(() => {})
    .finally(() => {
      if (writeQueues.get(libraryPath) === tracked) {
        writeQueues.delete(libraryPath)
      }
    })

  writeQueues.set(libraryPath, tracked)

  return next
}

export function awaitPendingLibraryWrites(libraryPath) {
  if (!libraryPath) return Promise.resolve()
  return writeQueues.get(libraryPath) || Promise.resolve()
}
