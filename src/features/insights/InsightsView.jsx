import React from 'react'
import StatsDashboard from '../../components/StatsDashboard'
import MemoryResurface from '../../components/MemoryResurface'
import RecommendationsPanel from '../../components/RecommendationsPanel'
import TimelineShelf from '../../components/TimelineShelf'
import TodayPanel from '../../components/TodayPanel'
import {
  selectBooksFinishedThisYear,
  selectQuoteCount,
} from '../../store/librarySelectors'

function InsightsView({
  books,
  userData,
  actions,
  onOpenBook,
  onUpdateGoal,
  onUpdateUserData,
  theme,
}) {
  const booksFinishedThisYear = selectBooksFinishedThisYear(books)
  const quoteCount = selectQuoteCount(books)

  return (
    <div className="insights-page">
      <section className="press-hero insights-hero">
        <div>
          <div className="press-hero-eyebrow">Insights</div>
          <h2 className="press-hero-title">A private reading room for notes, patterns, and recommendations.</h2>
          <p className="press-hero-lede">
            Keep the home route focused on the bookshelf. Use this room for reading records,
            highlighted passages, recommendations, and the quieter patterns that grow around them.
          </p>
        </div>
        <div className="press-hero-metrics">
          <div className="press-hero-metric">
            <div className="press-hero-metric-value">{books.length}</div>
            <div className="press-hero-metric-label">Books Cataloged</div>
          </div>
          <div className="press-hero-metric">
            <div className="press-hero-metric-value">{booksFinishedThisYear}</div>
            <div className="press-hero-metric-label">Finished This Year</div>
          </div>
          <div className="press-hero-metric">
            <div className="press-hero-metric-value">{quoteCount}</div>
            <div className="press-hero-metric-label">Quotes Recorded</div>
          </div>
        </div>
      </section>

      <section className="insights-toolbar">
        <div className="insights-toolbar-copy">
          <div className="library-stage-eyebrow">Reading Record</div>
          <h3 className="library-stage-title">Reading patterns stay nearby without crowding the shelf.</h3>
        </div>
        <div className="insights-toolbar-note">
          Statistics, notes, and recommendations now live on this route instead of opening as a second surface.
        </div>
      </section>

      <StatsDashboard
        embedded
        books={books}
        yearlyGoal={userData.yearlyGoal}
        onUpdateGoal={onUpdateGoal}
        quests={userData.quests || []}
        statsAdjustments={userData.statsAdjustments || {}}
        onUpdateUserData={onUpdateUserData}
        theme={theme}
      />

      <TodayPanel
        books={books}
        streak={userData.readingStreak || { current: 0, best: 0 }}
        onLogPages={actions.logPages}
        onAddQuote={actions.addQuote}
        onAddReflection={actions.addReflection}
      />

      <div className="library-insights insights-page-grid">
        <MemoryResurface books={books} onOpenBook={onOpenBook} />
        <RecommendationsPanel books={books} />
        <TimelineShelf books={books} />
      </div>
    </div>
  )
}

export default InsightsView
