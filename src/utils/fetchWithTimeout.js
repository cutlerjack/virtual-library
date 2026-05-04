const DEFAULT_FETCH_TIMEOUT_MS = 10000

function createAbortError() {
  if (typeof DOMException === 'function') {
    return new DOMException('The request was aborted.', 'AbortError')
  }
  const error = new Error('The request was aborted.')
  error.name = 'AbortError'
  return error
}

function createTimeoutError(message) {
  const error = new Error(message || 'Request timed out.')
  error.name = 'TimeoutError'
  return error
}

export async function fetchWithTimeout(
  input,
  options = {},
  {
    timeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
    timeoutMessage = 'Request timed out.',
  } = {}
) {
  const parentSignal = options.signal
  if (parentSignal?.aborted) {
    throw createAbortError()
  }

  const controller = new AbortController()
  let timedOut = false
  const timeoutId = window.setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)

  const abortFromParent = () => controller.abort()
  parentSignal?.addEventListener('abort', abortFromParent, { once: true })

  try {
    return await fetch(input, {
      ...options,
      signal: controller.signal,
    })
  } catch (error) {
    if (timedOut && error?.name === 'AbortError') {
      throw createTimeoutError(timeoutMessage)
    }
    throw error
  } finally {
    window.clearTimeout(timeoutId)
    parentSignal?.removeEventListener('abort', abortFromParent)
  }
}

