import { useState } from 'react'

export function useModalController() {
  const [selectedBook, setSelectedBook] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [showCustomizer, setShowCustomizer] = useState(false)
  const [showDailyRitual, setShowDailyRitual] = useState(false)
  const [showPreferences, setShowPreferences] = useState(false)
  const [showInsights, setShowInsights] = useState(false)
  const [activePdf, setActivePdf] = useState(null)
  const [activeEpub, setActiveEpub] = useState(null)
  const [activeArticle, setActiveArticle] = useState(null)

  const isReaderOpen = Boolean(activePdf || activeEpub || activeArticle)

  return {
    selectedBook, setSelectedBook,
    showAddModal, setShowAddModal,
    showStats, setShowStats,
    showCustomizer, setShowCustomizer,
    showDailyRitual, setShowDailyRitual,
    showPreferences, setShowPreferences,
    showInsights, setShowInsights,
    activePdf, setActivePdf,
    activeEpub, setActiveEpub,
    activeArticle, setActiveArticle,
    isReaderOpen,
  }
}
