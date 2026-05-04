import { extractDominantColor } from '../../utils/colorExtract'

export async function extractAddBookSpineColor(coverUrl) {
  try {
    return await extractDominantColor(coverUrl)
  } catch (error) {
    console.warn(
      '[add-book] Unable to extract cover color:',
      error?.message || error
    )
    return null
  }
}
