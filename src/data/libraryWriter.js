const writeQueues = new Map()

export function enqueueLibraryWrite(libraryPath, task) {
  if (!libraryPath) return Promise.resolve().then(task)

  const previous = writeQueues.get(libraryPath) || Promise.resolve()
  const next = previous.then(task, task)

  writeQueues.set(
    libraryPath,
    next.finally(() => {
      if (writeQueues.get(libraryPath) === next) {
        writeQueues.delete(libraryPath)
      }
    })
  )

  return next
}
