import { selectAutomaticBookMatch } from '../../utils/libraryRelations'

export function applyAutomaticBookLinks(docs = [], books = []) {
  let linkedCount = 0
  const linkedDocs = docs.map((doc) => {
    const automaticMatch = selectAutomaticBookMatch(doc, books)
    if (!automaticMatch?.book?.id) return doc
    linkedCount += 1
    return {
      ...doc,
      linkedBookId: automaticMatch.book.id,
    }
  })
  return { docs: linkedDocs, linkedCount }
}
