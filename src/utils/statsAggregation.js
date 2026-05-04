import { calculateCadenceStreak } from './streakCalculation'

function positiveNumber(value) {
  return Number.isFinite(value) && value > 0 ? value : 0
}

function dateIsInYear(value, year) {
  if (!value) return false
  const date = new Date(value)
  return !Number.isNaN(date.getTime()) && date.getFullYear() === year
}

function loggedPagesAllTime(book) {
  const logTotal = (book.readingLogs || []).reduce((sum, log) => {
    return sum + positiveNumber(log.pages)
  }, 0)
  return Math.max(positiveNumber(book.pagesRead), logTotal)
}

function loggedPagesForYear(book, year) {
  return (book.readingLogs || []).reduce((sum, log) => {
    return dateIsInYear(log.date, year) ? sum + positiveNumber(log.pages) : sum
  }, 0)
}

function loggedPagesForRange(book, startDate, endDate) {
  return (book.readingLogs || []).reduce((sum, log) => {
    if (!log.date) return sum
    const date = new Date(log.date)
    if (Number.isNaN(date.getTime()) || date < startDate || date >= endDate) return sum
    return sum + positiveNumber(log.pages)
  }, 0)
}

export function computeLibraryStats(books, quests, selectedYear) {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()
  const startOfMonth = new Date(currentYear, currentMonth, 1)
  const startOfNextMonth = new Date(currentYear, currentMonth + 1, 1)
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

  const totalPagesCataloged = books.reduce((sum, book) => sum + positiveNumber(book.pageCount), 0)
  const pagesLoggedAllTime = books.reduce((sum, book) => sum + loggedPagesAllTime(book), 0)
  const pagesLoggedThisYear = books.reduce((sum, book) => sum + loggedPagesForYear(book, selectedYear), 0)
  const pagesFinishedThisYear = finishedThisYear.reduce((sum, book) => sum + positiveNumber(book.pageCount), 0)
  const pagesLoggedThisMonth = isCurrentYear
    ? books.reduce((sum, book) => sum + loggedPagesForRange(book, startOfMonth, startOfNextMonth), 0)
    : 0
  const finishedBooksThisYear = finishedThisYear.length

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

  const xp = pagesLoggedAllTime
  const level = Math.max(1, Math.floor(xp / 1200) + 1)
  const nextLevelAt = level * 1200
  const xpToNext = Math.max(0, nextLevelAt - xp)

  const quoteCount = books.reduce((sum, book) => sum + (book.quotes?.length || 0), 0)
  const ratingsThisMonth = finishedThisMonth.filter(book => book.rating > 0).length

  const questProgress = (quests || []).map((quest) => {
    const target = Math.max(quest.target || 1, 1)
    let current = 0
    if (quest.type === 'books') current = finishedThisMonth.length
    if (quest.type === 'pages') current = pagesLoggedThisMonth
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
    { label: 'Pages of the Realm', threshold: 1000, value: pagesLoggedAllTime },
    { label: 'Five-Star Oracle', threshold: 3, value: ratedBooks.filter(b => b.rating >= 10).length },
  ]

  return {
    totalBooks: books.length,
    finishedBooksThisYear,
    totalPagesCataloged,
    pagesLoggedAllTime,
    pagesLoggedThisYear,
    pagesFinishedThisYear,
    finishedThisYear: finishedBooksThisYear,
    totalPages: totalPagesCataloged,
    pagesThisYear: pagesFinishedThisYear,
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
