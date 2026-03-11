import { useCallback, useEffect, useRef } from 'react'

function pickNextTask(queue) {
  let selected = null
  queue.forEach((task) => {
    if (!selected) {
      selected = task
      return
    }
    if (task.priority < selected.priority) {
      selected = task
    }
  })
  return selected
}

export function usePdfRenderScheduler() {
  const queueRef = useRef(new Map())
  const runningRef = useRef(false)
  const disposedRef = useRef(false)

  const runLoop = useCallback(async () => {
    if (runningRef.current || disposedRef.current) return
    runningRef.current = true
    try {
      while (!disposedRef.current && queueRef.current.size > 0) {
        const next = pickNextTask(queueRef.current)
        if (!next) break
        queueRef.current.delete(next.key)
        if (next.cancelled?.()) continue
        try {
          await next.run()
        } catch {
          // ignore per-page render errors
        }
      }
    } finally {
      runningRef.current = false
      if (!disposedRef.current && queueRef.current.size > 0) {
        Promise.resolve().then(() => {
          void runLoop()
        })
      }
    }
  }, [])

  const enqueueRenderTask = useCallback(({ key, priority = 0, run, cancelled }) => {
    if (!key || typeof run !== 'function') return
    queueRef.current.set(key, { key, priority, run, cancelled })
    void runLoop()
  }, [runLoop])

  const clearRenderQueue = useCallback(() => {
    queueRef.current.clear()
  }, [])

  useEffect(() => {
    return () => {
      disposedRef.current = true
      queueRef.current.clear()
    }
  }, [])

  return {
    enqueueRenderTask,
    clearRenderQueue,
  }
}
