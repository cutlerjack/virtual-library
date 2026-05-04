import { useState } from 'react'

export function useModalController() {
  const [showAddModal, setShowAddModal] = useState(false)
  const [showCustomizer, setShowCustomizer] = useState(false)
  const [showPreferences, setShowPreferences] = useState(false)
  const [activePdf, setActivePdf] = useState(null)
  const [activeEpub, setActiveEpub] = useState(null)
  const [activeArticle, setActiveArticle] = useState(null)

  const isReaderOpen = Boolean(activePdf || activeEpub || activeArticle)

  return {
    showAddModal, setShowAddModal,
    showCustomizer, setShowCustomizer,
    showPreferences, setShowPreferences,
    activePdf, setActivePdf,
    activeEpub, setActiveEpub,
    activeArticle, setActiveArticle,
    isReaderOpen,
  }
}
