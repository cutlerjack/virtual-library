export function parseMetaJson(raw) {
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

export function buildAnnotationsMap(rows) {
  const map = new Map()
  rows.forEach((row) => {
    if (!map.has(row.item_id)) map.set(row.item_id, [])
    map.get(row.item_id).push(row)
  })
  return map
}

export function hydrateBookAnnotations(item, rows) {
  const notes = []
  const quotes = []
  const reflections = []
  rows.forEach((row) => {
    if (row.type === 'note' && row.body) notes.push(row.body)
    if (row.type === 'quote' && row.body) quotes.push(row.body)
    if (row.type === 'reflection' && row.body) {
      reflections.push({
        date: row.created_at || null,
        text: row.body,
      })
    }
  })
  return {
    ...item,
    notes: notes.join('\n\n'),
    quotes,
    reflections,
  }
}

export function hydrateDocumentAnnotations(item, rows) {
  const notes = []
  const highlights = []
  rows.forEach((row) => {
    if (!row.body) return
    const locator = parseMetaJson(row.locator_json)
    const entry = {
      id: row.id,
      text: row.body,
      title: row.title || null,
      color: row.color || null,
      bodyRich: row.body_rich ? parseMetaJson(row.body_rich) : null,
      page: locator.page ?? null,
      cfi: locator.cfi ?? null,
      scrollOffset: locator.scrollOffset ?? null,
      anchorId: locator.anchorId ?? null,
      createdAt: row.created_at || null,
    }
    if (row.type === 'highlight') {
      highlights.push(entry)
    } else {
      notes.push(entry)
    }
  })
  return {
    ...item,
    annotations: {
      notes,
      highlights,
    },
  }
}

export function buildBookAnnotations(item) {
  const annotations = []
  if (item.notes) {
    annotations.push({
      id: `${item.id}-note`,
      type: 'note',
      body: item.notes,
      title: null,
      color: null,
      source: 'book',
      bodyRich: null,
      createdAt: item.updatedAt || new Date().toISOString(),
    })
  }
  ;(item.quotes || []).forEach((quote, index) => {
    annotations.push({
      id: `${item.id}-quote-${index}`,
      type: 'quote',
      body: typeof quote === 'string' ? quote : quote?.text || '',
      title: null,
      color: null,
      source: 'book',
      bodyRich: null,
      createdAt: item.updatedAt || new Date().toISOString(),
    })
  })
  ;(item.reflections || []).forEach((reflection, index) => {
    annotations.push({
      id: `${item.id}-reflection-${index}`,
      type: 'reflection',
      body: reflection.text,
      title: null,
      color: null,
      source: 'book',
      bodyRich: null,
      createdAt: reflection.date || item.updatedAt || new Date().toISOString(),
    })
  })
  return annotations
}

export function buildDocumentAnnotations(item) {
  const annotations = []
  ;(item.annotations?.notes || []).forEach((note, index) => {
    annotations.push({
      id: note.id || `${item.id}-note-${index}`,
      type: 'note',
      body: note.text,
      title: note.title || null,
      color: note.color || null,
      source: item.kind || 'document',
      bodyRich: note.bodyRich || null,
      locator: {
        page: note.page || null,
        cfi: note.cfi || null,
        scrollOffset: note.scrollOffset ?? null,
        anchorId: note.anchorId ?? null,
      },
      createdAt: note.createdAt || new Date().toISOString(),
    })
  })
  ;(item.annotations?.highlights || []).forEach((note, index) => {
    annotations.push({
      id: note.id || `${item.id}-highlight-${index}`,
      type: 'highlight',
      body: note.text,
      title: note.title || null,
      color: note.color || null,
      source: item.kind || 'document',
      bodyRich: note.bodyRich || null,
      locator: {
        page: note.page || null,
        cfi: note.cfi || null,
        scrollOffset: note.scrollOffset ?? null,
        anchorId: note.anchorId ?? null,
      },
      createdAt: note.createdAt || new Date().toISOString(),
    })
  })
  return annotations
}

export function buildSearchText(item, relationContext = {}) {
  if (item.kind === 'book') {
    const chunks = [item.title, item.author, ...(item.tags || [])]
    const studyStack = item.studyStack || item.bookMeta?.studyStack || []
    if (item.notes) chunks.push(item.notes)
    if (item.quotes?.length) chunks.push(item.quotes.map((q) => typeof q === 'string' ? q : q?.text || '').join('\n'))
    if (studyStack.length) {
      chunks.push(studyStack.map((entry) => entry?.text).filter(Boolean).join('\n'))
      chunks.push(studyStack.map((entry) => entry?.note).filter(Boolean).join('\n'))
    }
    return chunks.filter(Boolean).join('\n')
  }

  const meta = item.docMeta || {}
  const annotations = item.annotations || {}
  const linkedBook = relationContext.linkedBook || null
  const notes = (annotations.notes || [])
    .map((note) => (note?.text ?? note))
    .filter(Boolean)
    .join('\n')
  const highlights = (annotations.highlights || [])
    .map((note) => (note?.text ?? note))
    .filter(Boolean)
    .join('\n')
  const tags = (item.tags || []).filter(Boolean).join('\n')
  const relationLines = linkedBook
    ? [
        `Attached to ${linkedBook.title}`,
        linkedBook.author || null,
      ]
    : []
  return [item.title, item.author, tags, ...relationLines, meta.searchText, notes, highlights]
    .filter(Boolean)
    .join('\n')
}

export function buildAnnotationAnchors(item, annotations) {
  const anchors = []
  annotations.forEach((annotation) => {
    const locator = annotation.locator || {}
    const textSnippet = annotation.body
      ? String(annotation.body).slice(0, 180)
      : ''
    anchors.push({
      id: `${annotation.id}-anchor`,
      annotationId: annotation.id,
      itemId: item.id,
      kind: item.kind,
      locator,
      textSnippet,
      page: locator.page ?? null,
      cfi: locator.cfi ?? null,
      scrollOffset: locator.scrollOffset ?? null,
      createdAt: annotation.createdAt || new Date().toISOString(),
    })
  })
  return anchors
}

export function buildAnnotationLinks(anchors) {
  const links = []
  const byItem = new Map()
  anchors.forEach((anchor) => {
    if (!byItem.has(anchor.itemId)) byItem.set(anchor.itemId, [])
    byItem.get(anchor.itemId).push(anchor)
  })

  const tokenize = (text) => (
    (text || '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 3)
  )

  byItem.forEach((itemAnchors) => {
    const tokenSets = itemAnchors.map((anchor) => new Set(tokenize(anchor.textSnippet)))
    for (let i = 0; i < itemAnchors.length; i += 1) {
      for (let j = i + 1; j < itemAnchors.length; j += 1) {
        const setA = tokenSets[i]
        const setB = tokenSets[j]
        if (setA.size === 0 || setB.size === 0) continue
        let overlap = 0
        setA.forEach((token) => {
          if (setB.has(token)) overlap += 1
        })
        if (overlap >= 3) {
          const createdAt = new Date().toISOString()
          links.push({
            id: `link-${itemAnchors[i].id}-${itemAnchors[j].id}`,
            from: itemAnchors[i].annotationId,
            to: itemAnchors[j].annotationId,
            createdAt,
          })
          links.push({
            id: `link-${itemAnchors[j].id}-${itemAnchors[i].id}`,
            from: itemAnchors[j].annotationId,
            to: itemAnchors[i].annotationId,
            createdAt,
          })
        }
      }
    }
  })

  return links
}
