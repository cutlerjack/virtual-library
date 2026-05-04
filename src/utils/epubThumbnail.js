import ePub from 'epubjs'

async function fetchAsDataUrl(url) {
  const response = await fetch(url)
  if (!response.ok) return null
  const blob = await response.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error || new Error('Unable to read EPUB cover image.'))
    reader.onabort = () => reject(new Error('EPUB cover image read was aborted.'))
    reader.readAsDataURL(blob)
  })
}

export async function generateEpubThumbnail(data) {
  const buffer = data instanceof ArrayBuffer ? data : data.buffer
  let book = null
  try {
    book = ePub(buffer)
    await book.ready
    const coverUrl = await book.coverUrl()
    if (!coverUrl) return null
    return await fetchAsDataUrl(coverUrl)
      .catch(() => null)
  } catch {
    return null
  } finally {
    book?.destroy?.()
  }
}
