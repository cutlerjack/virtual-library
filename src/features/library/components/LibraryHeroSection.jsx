import React from 'react'

function LibraryHeroSection({ booksCount, booksFinishedThisYear, quoteCount }) {
  return (
    <section className="press-hero">
      <div>
        <div className="press-hero-eyebrow">Virtual Library</div>
        <h2 className="press-hero-title">Ideas for progress, shelved with care.</h2>
        <p className="press-hero-lede">
          Keep a living record of what you read, what you loved, and the notes that
          changed how you think.
        </p>
      </div>
      <div className="press-hero-metrics">
        <div className="press-hero-metric">
          <div className="press-hero-metric-value">{booksCount}</div>
          <div className="press-hero-metric-label">Volumes</div>
        </div>
        <div className="press-hero-metric">
          <div className="press-hero-metric-value">{booksFinishedThisYear}</div>
          <div className="press-hero-metric-label">Finished {new Date().getFullYear()}</div>
        </div>
        <div className="press-hero-metric">
          <div className="press-hero-metric-value">{quoteCount}</div>
          <div className="press-hero-metric-label">Quotes Saved</div>
        </div>
      </div>
    </section>
  )
}

export default LibraryHeroSection
