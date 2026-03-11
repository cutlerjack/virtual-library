// Simple recommendation engine based on user's highly-rated books

export function getRecommendations(books) {
  // Get books rated 4-5 stars
  const lovedBooks = books.filter(book => book.rating >= 8)

  if (lovedBooks.length === 0) {
    return []
  }

  // Extract genres/tags from loved books
  const lovedGenres = {}
  lovedBooks.forEach(book => {
    const tags = book.tags || []
    tags.forEach(tag => {
      lovedGenres[tag] = (lovedGenres[tag] || 0) + 1
    })
  })

  // Sort genres by frequency
  const topGenres = Object.entries(lovedGenres)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([genre]) => genre)

  // Generate recommendations
  const recommendations = []

  if (topGenres.length > 0) {
    // Find a highly-rated book for each top genre
    topGenres.forEach(genre => {
      const booksWithGenre = lovedBooks.filter(book =>
        (book.tags || []).includes(genre)
      )

      if (booksWithGenre.length > 0) {
        const topBook = booksWithGenre.sort((a, b) => (b.rating || 0) - (a.rating || 0))[0]

        recommendations.push({
          type: 'genre',
          basedOn: topBook.title,
          genre: genre,
          message: `Since you loved "${topBook.title}", you might enjoy more ${genre} books!`,
        })
      }
    })
  }

  // Add author-based recommendation
  const authorCounts = {}
  lovedBooks.forEach(book => {
    if (book.author) {
      authorCounts[book.author] = (authorCounts[book.author] || 0) + 1
    }
  })

  const favoriteAuthors = Object.entries(authorCounts)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])

  if (favoriteAuthors.length > 0) {
    const [author, count] = favoriteAuthors[0]
    recommendations.push({
      type: 'author',
      author,
      count,
      message: `You've enjoyed ${count} books by ${author}. Explore more of their work!`,
    })
  }

  return recommendations.slice(0, 3)
}

export function getReadingInsights(books) {
  const insights = []

  // Reading pace
  const currentYear = new Date().getFullYear()
  const booksThisYear = books.filter(book => {
    const date = book.dateFinished ? new Date(book.dateFinished) : null
    return date && date.getFullYear() === currentYear
  })

  if (booksThisYear.length >= 3) {
    // Calculate average days between books
    const sortedByDate = booksThisYear
      .filter(b => b.dateFinished)
      .sort((a, b) => new Date(a.dateFinished) - new Date(b.dateFinished))

    if (sortedByDate.length >= 2) {
      const firstDate = new Date(sortedByDate[0].dateFinished)
      const lastDate = new Date(sortedByDate[sortedByDate.length - 1].dateFinished)
      const daysBetween = Math.floor((lastDate - firstDate) / (1000 * 60 * 60 * 24))
      const avgDaysPerBook = Math.round(daysBetween / (sortedByDate.length - 1))

      if (avgDaysPerBook > 0) {
        insights.push({
          type: 'pace',
          message: `You're averaging one book every ${avgDaysPerBook} days this year!`,
        })
      }
    }
  }

  // Longest book
  const booksWithPages = books.filter(b => b.pageCount)
  if (booksWithPages.length > 0) {
    const longest = booksWithPages.sort((a, b) => b.pageCount - a.pageCount)[0]
    insights.push({
      type: 'longest',
      message: `Your longest book: "${longest.title}" at ${longest.pageCount} pages`,
    })
  }

  // Rating insights
  const ratedBooks = books.filter(b => b.rating > 0)
  if (ratedBooks.length >= 5) {
    const avgRating = ratedBooks.reduce((sum, b) => sum + b.rating, 0) / ratedBooks.length
    const fiveStars = ratedBooks.filter(b => b.rating >= 10).length

    if (fiveStars > 0) {
      insights.push({
        type: 'rating',
        message: `You've given ${fiveStars} book${fiveStars > 1 ? 's' : ''} a perfect 5-star rating!`,
      })
    }
  }

  return insights
}
