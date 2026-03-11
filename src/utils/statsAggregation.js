import { calculateCadenceStreak } from './streakCalculation'

export function computeLibraryStats(books, quests, selectedYear) {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()
  const startOfMonth = new Date(currentYear, currentMonth, 1)
  const isCurrentYear = selectedYear === currentYear

  const finishedBooks = books.filter(book => book.dateFinished)
  const finishedThisYear = finishedBooks.filter(book => {
    const date = new Date(book.dateFinished)
    return date.getFullYear() === selectedYear
  })
  const finishedThisMonth = isCurrentYear
    ? finishedThisYear.filter(book => {
      const date = new Date(book.dateFinished)
      return date >= startOfMonth
    })
    : []

  const totalPages = books.reduce((sum, book) => sum + (book.pageCount || 0), 0)
  const pagesThisYear = finishedThisYear.reduce((sum, book) => sum + (book.pageCount || 0), 0)
  const pagesThisMonth = finishedThisMonth.reduce((sum, book) => sum + (book.pageCount || 0), 0)

  const ratedBooks = books.filter(book => book.rating > 0)
  const avgRating = ratedBooks.length > 0
    ? ratedBooks.reduce((sum, book) => sum + book.rating, 0) / ratedBooks.length
    : 0
  const avgRatingFiveStar = avgRating / 2

  const genreCounts = {}
  books.forEach(book => {
    const tags = book.tags || []
    tags.forEach(tag => {
      genreCounts[tag] = (genreCounts[tag] || 0) + 1
    })
  })
  const genreData = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }))

  const monthlyData = Array(12).fill(0).map((_, i) => ({
    month: new Date(selectedYear, i, 1).toLocaleString('default', { month: 'short' }),
    books: 0,
  }))
  finishedThisYear.forEach(book => {
    const month = new Date(book.dateFinished).getMonth()
    monthlyData[month].books++
  })

  const sortedFinishedDates = finishedThisYear
    .map(book => new Date(book.dateFinished))
    .sort((a, b) => a - b)

  const streak = calculateCadenceStreak(sortedFinishedDates, 7)
  const daysSinceLast = sortedFinishedDates.length > 0
    ? Math.floor((now - sortedFinishedDates[sortedFinishedDates.length - 1]) / (1000 * 60 * 60 * 24))
    : null

  const xp = totalPages
  const level = Math.max(1, Math.floor(xp / 1200) + 1)
  const nextLevelAt = level * 1200
  const xpToNext = Math.max(0, nextLevelAt - xp)

  const quoteCount = books.reduce((sum, book) => sum + (book.quotes?.length || 0), 0)
  const ratingsThisMonth = finishedThisMonth.filter(book => book.rating > 0).length

  const questProgress = (quests || []).map((quest) => {
    const target = Math.max(quest.target || 1, 1)
    let current = 0
    if (quest.type === 'books') current = finishedThisMonth.length
    if (quest.type === 'pages') current = pagesThisMonth
    if (quest.type === 'quotes') current = quoteCount
    if (quest.type === 'ratings') current = ratingsThisMonth
    return {
      ...quest,
      progress: Math.min(current / target, 1),
      value: `${current}/${target}`,
    }
  })

  const achievements = [
    { label: 'First Tome', threshold: 1, value: finishedBooks.length },
    { label: 'A Dozen Read', threshold: 12, value: finishedBooks.length },
    { label: 'Pages of the Realm', threshold: 1000, value: totalPages },
    { label: 'Five-Star Oracle', threshold: 3, value: ratedBooks.filter(b => b.rating >= 10).length },
  ]

  return {
    totalBooks: books.length,
    finishedThisYear: finishedThisYear.length,
    totalPages,
    pagesThisYear,
    avgRating: avgRatingFiveStar.toFixed(1),
    genreData,
    monthlyData: monthlyData.slice(0, isCurrentYear ? currentMonth + 1 : 12),
    streak,
    daysSinceLast,
    isCurrentYear,
    level,
    xp,
    xpToNext,
    quests: questProgress,
    achievements,
  }
}
