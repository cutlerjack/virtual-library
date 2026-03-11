import { useMemo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const COLORS = ['#201819', '#8f8174', '#c7b9a8', '#b45309', '#5f4b3b', '#dbcfbf', '#9a8775', '#3b302b']
const COLORS_SCIFI = ['#b6c9e1', '#8fa8c7', '#6e8bb0', '#5b718e', '#9fb7d4', '#7a8ea8', '#a8bfd8', '#6f8198']

const DashboardIcons = {
  chronicle: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M5 4h12a2 2 0 012 2v12H7a2 2 0 01-2-2z" />
      <path d="M7 4v14" />
      <path d="M10 8h7M10 12h7" />
    </svg>
  ),
  level: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M4 16h16M6 12h12M8 8h8" />
    </svg>
  ),
  quests: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M6 6h12M6 12h12M6 18h12" />
      <circle cx="4" cy="6" r="1.5" />
      <circle cx="4" cy="12" r="1.5" />
      <circle cx="4" cy="18" r="1.5" />
    </svg>
  ),
  relics: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M12 3l3 6 6 .8-4.5 4.4 1.2 6.8L12 18l-5.7 3 1.2-6.8L3 9.8 9 9z" />
    </svg>
  ),
  genres: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
    </svg>
  ),
  monthly: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M5 6h14v14H5z" />
      <path d="M8 3v4M16 3v4M5 10h14" />
    </svg>
  ),
  past: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M4 19h16M6 15h12M8 11h8M10 7h4" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M6 6l12 12M18 6l-12 12" />
    </svg>
  ),
}

const QUEST_PRESETS = [
  { label: 'Finish 1 book this week', target: 1, type: 'books' },
  { label: 'Finish 2 books this month', target: 2, type: 'books' },
  { label: 'Finish 4 books this month', target: 4, type: 'books' },
  { label: 'Read 150 pages this week', target: 150, type: 'pages' },
  { label: 'Read 300 pages this month', target: 300, type: 'pages' },
  { label: 'Read 500 pages this month', target: 500, type: 'pages' },
  { label: 'Capture 2 quotes this week', target: 2, type: 'quotes' },
  { label: 'Capture 5 quotes this month', target: 5, type: 'quotes' },
  { label: 'Leave 3 ratings this month', target: 3, type: 'ratings' },
  { label: 'Finish 1 classic this month', target: 1, type: 'books' },
  { label: 'Read 100 pages today', target: 100, type: 'pages' },
  { label: 'Capture 1 memorable quote today', target: 1, type: 'quotes' },
]

function StatsDashboard({ books, yearlyGoal, onUpdateGoal, quests = [], statsAdjustments = {}, onUpdateUserData, onClose, theme = 'classic' }) {
  const [isEditingGoal, setIsEditingGoal] = useState(false)
  const [tempGoal, setTempGoal] = useState(yearlyGoal)
  const [isEditingQuests, setIsEditingQuests] = useState(false)
  const [questDrafts, setQuestDrafts] = useState(quests)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [isEditingAdjustments, setIsEditingAdjustments] = useState(false)
  const [adjustmentDraft, setAdjustmentDraft] = useState({ books: 0, pages: 0 })

  useEffect(() => {
    if (!isEditingQuests) {
      setQuestDrafts(quests)
    }
  }, [quests, isEditingQuests])

  useEffect(() => {
    if (!isEditingGoal) {
      setTempGoal(yearlyGoal)
    }
  }, [yearlyGoal, isEditingGoal])

  const stats = useMemo(() => {
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
  }, [books, quests, selectedYear])

  const adjustmentsForYear = statsAdjustments[selectedYear] || { books: 0, pages: 0 }
  const adjustedBooks = stats.finishedThisYear + (adjustmentsForYear.books || 0)
  const adjustedPages = stats.pagesThisYear + (adjustmentsForYear.pages || 0)

  const availableYears = useMemo(() => {
    const years = new Set()
    books.forEach(book => {
      if (book.dateFinished) {
        const date = new Date(book.dateFinished)
        if (!Number.isNaN(date.getTime())) years.add(date.getFullYear())
      }
    })
    years.add(new Date().getFullYear())
    return Array.from(years).sort((a, b) => b - a)
  }, [books])

  const percentage = yearlyGoal > 0
    ? Math.min((adjustedBooks / yearlyGoal) * 100, 100)
    : 0

  const shareCards = useMemo(() => {
    const palette = theme === 'scifi'
      ? {
          bg: '#0b1016',
          fg: '#d7dde6',
          accent: '#9fb7d4',
          muted: '#7f90a8',
        }
      : {
          bg: '#f6f1e9',
          fg: '#201819',
          accent: '#b45309',
          muted: '#8f8174',
        }
    const topBooks = [...books]
      .sort((a, b) => (b.lastTouched || '').localeCompare(a.lastTouched || ''))
      .slice(0, 6)
      .map(book => book.title)

    return {
      chronicle: buildChronicleSvg({
        year: selectedYear,
        books: adjustedBooks,
        pages: adjustedPages,
        streak: stats.streak.current,
        level: stats.level,
        palette,
        theme,
      }),
      shelf: buildShelfSvg({
        year: selectedYear,
        titles: topBooks,
        palette,
        theme,
      }),
    }
  }, [theme, selectedYear, adjustedBooks, adjustedPages, stats.streak.current, stats.level, books])

  const handleSaveGoal = () => {
    onUpdateGoal(parseInt(tempGoal, 10) || 12)
    setIsEditingGoal(false)
  }

  const handleSaveAdjustments = () => {
    const booksAdjustment = parseInt(adjustmentDraft.books, 10) || 0
    const pagesAdjustment = parseInt(adjustmentDraft.pages, 10) || 0
    onUpdateUserData?.({
      statsAdjustments: {
        ...statsAdjustments,
        [selectedYear]: { books: booksAdjustment, pages: pagesAdjustment },
      },
    })
    setIsEditingAdjustments(false)
  }

  const handleSaveQuests = () => {
    const cleaned = questDrafts
      .filter(quest => quest.label && quest.type)
      .map(quest => ({
        ...quest,
        target: Math.max(parseInt(quest.target, 10) || 1, 1),
      }))
    onUpdateUserData?.({ quests: cleaned })
    setIsEditingQuests(false)
  }

  return (
    <motion.div
      className="dashboard-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="dashboard-content"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
      >
        <div className="dashboard-header">
          <div>
            <div className="dashboard-eyebrow">Archivist Ledger</div>
            <h2>Statistics & Rituals</h2>
            <p>Track the cadence of your reading and the relics you’ve earned.</p>
          </div>
          <div className="dashboard-actions">
            <select
              className="dashboard-year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <button className="btn-secondary flex items-center gap-2" onClick={onClose}>
              {theme === 'scifi' && <span className="dashboard-icon">{DashboardIcons.close}</span>}
              <span>Close</span>
            </button>
          </div>
        </div>

        <div className="dashboard-grid">
          <section className="dashboard-card">
            <div className="card-title">
              {theme === 'scifi' && <span className="dashboard-icon">{DashboardIcons.chronicle}</span>}
              The Chronicle
            </div>
            <div className="stat-grid">
              <div>
                <div className="stat-value">{stats.totalBooks}</div>
                <div className="stat-label">Total books</div>
              </div>
              <div>
                <div className="stat-value">{adjustedBooks}</div>
                <div className="stat-label">Read this year</div>
              </div>
              <div>
                <div className="stat-value">{stats.totalPages.toLocaleString()}</div>
                <div className="stat-label">Pages conquered</div>
              </div>
              <div>
                <div className="stat-value">{stats.avgRating}</div>
                <div className="stat-label">Avg rating</div>
              </div>
            </div>
            <div className="streak-panel">
              <div>
                <div className="streak-label">Cadence streak</div>
                <div className="streak-value">{stats.streak.current} weeks</div>
                <div className="streak-subtle">Best: {stats.streak.best} weeks</div>
              </div>
              <div>
                <div className="streak-label">Last finish</div>
                <div className="streak-value">
                  {stats.daysSinceLast === null ? '—' : `${stats.daysSinceLast}d ago`}
                </div>
                <div className="streak-subtle">Keep the flame lit.</div>
              </div>
            </div>
          </section>

          <section className="dashboard-card">
            <div className="card-title">
              {theme === 'scifi' && <span className="dashboard-icon">{DashboardIcons.level}</span>}
              Level of Lore
            </div>
            <div className="level-panel">
              <div className="level-circle">
                <div>
                  <span className="level-number">{stats.level}</span>
                  <span className="level-label">Lore</span>
                </div>
              </div>
              <div className="level-meta">
                <div>XP {stats.xp.toLocaleString()}</div>
                <div>{stats.xpToNext.toLocaleString()} XP to next level</div>
              </div>
            </div>
            <div className="goal-panel">
              <div className="goal-header">
                <div>{selectedYear} Goal</div>
                {stats.isCurrentYear && !isEditingGoal && (
                  <button className="text-xs text-muted" onClick={() => setIsEditingGoal(true)}>
                    Edit
                  </button>
                )}
              </div>
              {!stats.isCurrentYear ? (
                <div className="goal-subtitle">Goals are tracked for the current year.</div>
              ) : isEditingGoal ? (
                <div className="goal-edit">
                  <input
                    type="number"
                    value={tempGoal}
                    onChange={(e) => setTempGoal(e.target.value)}
                    min="1"
                  />
                  <button className="btn-primary" onClick={handleSaveGoal}>Save</button>
                  <button className="btn-secondary" onClick={() => setIsEditingGoal(false)}>Cancel</button>
                </div>
              ) : (
                <>
                  <div className="goal-track">
                    <div className="goal-progress">
                      <div style={{ width: `${percentage}%` }} />
                    </div>
                    <div className="goal-stats">
                      <span>{adjustedBooks} / {yearlyGoal} books</span>
                      <span>{Math.round(percentage)}%</span>
                    </div>
                  </div>
                  <div className="goal-subtitle">A covenant with your future self.</div>
                </>
              )}
            </div>
            <div className="adjustment-panel">
              <div className="goal-header">
                <div>Adjustments</div>
                {!isEditingAdjustments && (
                  <button
                    className="text-xs text-muted"
                    onClick={() => {
                      setAdjustmentDraft({
                        books: adjustmentsForYear.books || 0,
                        pages: adjustmentsForYear.pages || 0,
                      })
                      setIsEditingAdjustments(true)
                    }}
                  >
                    Edit
                  </button>
                )}
              </div>
              {isEditingAdjustments ? (
                <div className="goal-edit">
                  <input
                    type="number"
                    value={adjustmentDraft.books}
                    onChange={(e) => setAdjustmentDraft(prev => ({ ...prev, books: e.target.value }))}
                    placeholder="Books"
                  />
                  <input
                    type="number"
                    value={adjustmentDraft.pages}
                    onChange={(e) => setAdjustmentDraft(prev => ({ ...prev, pages: e.target.value }))}
                    placeholder="Pages"
                  />
                  <button className="btn-primary" onClick={handleSaveAdjustments}>Save</button>
                  <button className="btn-secondary" onClick={() => setIsEditingAdjustments(false)}>Cancel</button>
                </div>
              ) : (
                <div className="adjustment-summary">
                  <span>Books: {adjustmentsForYear.books || 0}</span>
                  <span>Pages: {adjustmentsForYear.pages || 0}</span>
                </div>
              )}
            </div>
          </section>

          <section className="dashboard-card">
            <div className="card-title">
              {theme === 'scifi' && <span className="dashboard-icon">{DashboardIcons.quests}</span>}
              Ritual Quests
            </div>
            {isEditingQuests ? (
              <div className="quest-editor">
                <div className="quest-presets">
                  {QUEST_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      className="quest-preset"
                      onClick={() => setQuestDrafts([
                        ...questDrafts,
                        { id: `quest-${Date.now()}`, ...preset },
                      ])}
                      type="button"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                {questDrafts.map((quest, index) => (
                  <div key={quest.id || index} className="quest-edit-row">
                    <input
                      type="text"
                      value={quest.label || ''}
                      onChange={(e) => {
                        const updated = [...questDrafts]
                        updated[index] = { ...quest, label: e.target.value }
                        setQuestDrafts(updated)
                      }}
                      placeholder="Quest label"
                    />
                    <input
                      type="number"
                      min="1"
                      value={quest.target || ''}
                      onChange={(e) => {
                        const updated = [...questDrafts]
                        updated[index] = { ...quest, target: e.target.value }
                        setQuestDrafts(updated)
                      }}
                      placeholder="Target"
                    />
                    <select
                      value={quest.type || 'books'}
                      onChange={(e) => {
                        const updated = [...questDrafts]
                        updated[index] = { ...quest, type: e.target.value }
                        setQuestDrafts(updated)
                      }}
                    >
                      <option value="books">Books</option>
                      <option value="pages">Pages</option>
                      <option value="quotes">Quotes</option>
                      <option value="ratings">Ratings</option>
                    </select>
                  </div>
                ))}
                <div className="quest-edit-actions">
                  <button
                    className="btn-secondary"
                    onClick={() => setQuestDrafts([...questDrafts, { id: `quest-${Date.now()}`, label: '', target: 1, type: 'books' }])}
                  >
                    Add Quest
                  </button>
                  <button className="btn-primary" onClick={handleSaveQuests}>Save</button>
                  <button className="btn-secondary" onClick={() => setIsEditingQuests(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div className="quest-list">
                  {stats.quests.map((quest) => (
                    <div key={quest.id} className="quest-item">
                      <div className="quest-header">
                        <span>{quest.label}</span>
                        <span>{quest.value}</span>
                      </div>
                      <div className="quest-bar">
                        <div style={{ width: `${quest.progress * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <button className="text-xs text-muted mt-3" onClick={() => {
                  setQuestDrafts(quests)
                  setIsEditingQuests(true)
                }}>
                  Edit quests
                </button>
              </>
            )}
          </section>

          <section className="dashboard-card">
            <div className="card-title">
              {theme === 'scifi' && <span className="dashboard-icon">{DashboardIcons.relics}</span>}
              Relics & Seals
            </div>
            <div className="achievement-grid">
              {stats.achievements.map((achievement) => {
                const progress = Math.min(achievement.value / achievement.threshold, 1)
                return (
                  <div key={achievement.label} className="achievement-item">
                    <div className="achievement-ring">
                      <div style={{ height: `${progress * 100}%` }} />
                    </div>
                    <div>
                      <div className="achievement-title">{achievement.label}</div>
                      <div className="achievement-subtitle">
                        {achievement.value}/{achievement.threshold}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="dashboard-card">
            <div className="card-title">
              {theme === 'scifi' && <span className="dashboard-icon">{DashboardIcons.genres}</span>}
              Genres by Volume
            </div>
            {stats.genreData.length === 0 ? (
              <div className="empty-state">Add genres or tags to reveal your map of taste.</div>
            ) : (
              <div className="chart-panel">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={stats.genreData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {stats.genreData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={(theme === 'scifi' ? COLORS_SCIFI : COLORS)[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: theme === 'scifi' ? '#0c0f14' : '#fefbf6',
                        border: theme === 'scifi'
                          ? '1px solid rgba(160, 190, 220, 0.2)'
                          : '1px solid rgba(32, 24, 25, 0.2)',
                        borderRadius: '8px',
                        color: theme === 'scifi' ? '#e8e0d0' : '#201819',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section className="dashboard-card">
            <div className="card-title">
              {theme === 'scifi' && <span className="dashboard-icon">{DashboardIcons.monthly}</span>}
              Monthly Chronicle
            </div>
            {stats.monthlyData.length === 0 ? (
              <div className="empty-state">Finish a book to begin the record.</div>
            ) : (
              <div className="chart-panel">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stats.monthlyData}>
                    <XAxis
                      dataKey="month"
                      tick={{
                        fill: theme === 'scifi'
                          ? 'rgba(180, 210, 235, 0.7)'
                          : 'rgba(196, 184, 150, 0.6)',
                        fontSize: 10,
                      }}
                      axisLine={{
                        stroke: theme === 'scifi'
                          ? 'rgba(160, 190, 220, 0.2)'
                          : 'rgba(196, 184, 150, 0.1)',
                      }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{
                        fill: theme === 'scifi'
                          ? 'rgba(180, 210, 235, 0.7)'
                          : 'rgba(196, 184, 150, 0.6)',
                        fontSize: 10,
                      }}
                      axisLine={{
                        stroke: theme === 'scifi'
                          ? 'rgba(160, 190, 220, 0.2)'
                          : 'rgba(196, 184, 150, 0.1)',
                      }}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: theme === 'scifi' ? '#0c0f14' : '#fefbf6',
                        border: theme === 'scifi'
                          ? '1px solid rgba(160, 190, 220, 0.2)'
                          : '1px solid rgba(32, 24, 25, 0.2)',
                        borderRadius: '8px',
                        color: theme === 'scifi' ? '#e8e0d0' : '#201819',
                        fontSize: '12px',
                      }}
                    />
                    <Bar
                      dataKey="books"
                      fill={theme === 'scifi' ? '#9fb7d4' : '#201819'}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section className="dashboard-card dashboard-card-wide">
            <div className="card-title">
              {theme === 'scifi' && <span className="dashboard-icon">{DashboardIcons.past}</span>}
              Past Years
            </div>
            <div className="past-years-grid">
              {availableYears.map((year) => {
                const finished = books.filter(book => {
                  if (!book.dateFinished) return false
                  const date = new Date(book.dateFinished)
                  return date.getFullYear() === year
                })
                const pages = finished.reduce((sum, book) => sum + (book.pageCount || 0), 0)
                return (
                  <div key={year} className="past-year-card">
                    <div className="past-year-title">{year}</div>
                    <div className="past-year-metric">{finished.length} books</div>
                    <div className="past-year-subtle">{pages.toLocaleString()} pages</div>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="dashboard-card dashboard-card-wide">
            <div className="card-title">Artifacts</div>
            <div className="artifact-grid">
              <div className="artifact-card">
                <img src={toSvgUrl(shareCards.chronicle)} alt="" />
                <div className="artifact-actions">
                  <button
                    className="btn-secondary"
                    onClick={() => downloadSvg(shareCards.chronicle, `chronicle-${selectedYear}.svg`)}
                  >
                    Download Chronicle
                  </button>
                </div>
              </div>
              <div className="artifact-card">
                <img src={toSvgUrl(shareCards.shelf)} alt="" />
                <div className="artifact-actions">
                  <button
                    className="btn-secondary"
                    onClick={() => downloadSvg(shareCards.shelf, `shelf-${selectedYear}.svg`)}
                  >
                    Download Shelf Snapshot
                  </button>
                </div>
              </div>
            </div>
            <div className="artifact-note">Private export. No uploads, no tracking.</div>
          </section>
        </div>
      </motion.div>
    </motion.div>
  )
}

function toSvgUrl(svg) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

function downloadSvg(svg, filename) {
  const link = document.createElement('a')
  link.href = toSvgUrl(svg)
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function buildChronicleSvg({ year, books, pages, streak, level, palette, theme }) {
  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="900" height="520" viewBox="0 0 900 520">
    <defs>
      <linearGradient id="bg" x1="0" x2="1">
        <stop offset="0%" stop-color="${palette.bg}"/>
        <stop offset="100%" stop-color="${theme === 'scifi' ? '#0f141c' : '#efe7dc'}"/>
      </linearGradient>
    </defs>
    <rect width="900" height="520" rx="28" fill="url(#bg)"/>
    <rect x="40" y="40" width="820" height="440" rx="22" fill="none" stroke="${palette.accent}" stroke-opacity="0.2"/>
    <text x="60" y="90" font-size="18" fill="${palette.muted}" letter-spacing="4" font-family="Space Grotesk, Inter, sans-serif">YEARLY CHRONICLE</text>
    <text x="60" y="140" font-size="44" fill="${palette.fg}" letter-spacing="6" font-family="Space Grotesk, Inter, sans-serif">${year}</text>

    <text x="60" y="220" font-size="16" fill="${palette.muted}" letter-spacing="2">BOOKS READ</text>
    <text x="60" y="265" font-size="36" fill="${palette.fg}">${books}</text>

    <text x="260" y="220" font-size="16" fill="${palette.muted}" letter-spacing="2">PAGES</text>
    <text x="260" y="265" font-size="36" fill="${palette.fg}">${pages.toLocaleString()}</text>

    <text x="460" y="220" font-size="16" fill="${palette.muted}" letter-spacing="2">STREAK</text>
    <text x="460" y="265" font-size="36" fill="${palette.fg}">${streak} days</text>

    <text x="660" y="220" font-size="16" fill="${palette.muted}" letter-spacing="2">LEVEL</text>
    <text x="660" y="265" font-size="36" fill="${palette.fg}">${level}</text>

    <rect x="60" y="320" width="780" height="8" rx="4" fill="${theme === 'scifi' ? '#1b2430' : '#e7ddd1'}"/>
    <rect x="60" y="320" width="${Math.min(780, 120 + books * 8)}" height="8" rx="4" fill="${palette.accent}"/>
    <text x="60" y="370" font-size="16" fill="${palette.muted}">A private archive of your reading year.</text>
  </svg>
  `
}

function buildShelfSvg({ year, titles, palette, theme }) {
  const rows = titles.slice(0, 6).map((title, index) => {
    const y = 150 + index * 40
    return `<text x="80" y="${y}" font-size="20" fill="${palette.fg}" font-family="Space Grotesk, Inter, sans-serif">${escapeXml(title)}</text>`
  }).join('')

  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="900" height="520" viewBox="0 0 900 520">
    <rect width="900" height="520" rx="28" fill="${palette.bg}"/>
    <text x="60" y="90" font-size="18" fill="${palette.muted}" letter-spacing="4" font-family="Space Grotesk, Inter, sans-serif">SHELF SNAPSHOT</text>
    <text x="60" y="130" font-size="28" fill="${palette.fg}" letter-spacing="3" font-family="Space Grotesk, Inter, sans-serif">${year}</text>
    <rect x="60" y="160" width="780" height="1" fill="${theme === 'scifi' ? '#1e2834' : '#d8cbbd'}"/>
    ${rows || `<text x="80" y="220" font-size="20" fill="${palette.muted}">No titles yet.</text>`}
    <text x="60" y="470" font-size="14" fill="${palette.muted}">private archive • virtual library</text>
  </svg>
  `
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function calculateCadenceStreak(dates, maxGapDays) {
  if (dates.length === 0) {
    return { current: 0, best: 0 }
  }
  let current = 1
  let best = 1
  let run = 1
  for (let i = 1; i < dates.length; i += 1) {
    const gap = Math.floor((dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24))
    if (gap <= maxGapDays) {
      run += 1
    } else {
      best = Math.max(best, run)
      run = 1
    }
  }
  best = Math.max(best, run)
  const lastGap = Math.floor((Date.now() - dates[dates.length - 1]) / (1000 * 60 * 60 * 24))
  current = lastGap <= maxGapDays ? run : 0
  return { current, best }
}

export default StatsDashboard
