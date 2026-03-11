import ePub from 'epubjs'

async function fetchAsDataUrl(url) {
  const response = await fetch(url)
  const blob = await response.blob()
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.readAsDataURL(blob)
  })
}

export async function generateEpubThumbnail(data) {
  const buffer = data instanceof ArrayBuffer ? data : data.buffer
  const book = ePub(buffer)
  try {
    await book.ready
    const coverUrl = await book.coverUrl()
    if (!coverUrl) return null
    return await fetchAsDataUrl(coverUrl)
  } finally {
    book.destroy()
  }
}
