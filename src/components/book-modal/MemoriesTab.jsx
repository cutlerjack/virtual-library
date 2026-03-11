import { useState } from 'react'

export default function MemoriesTab({ book, onUpdate }) {
  const [memoryTitle, setMemoryTitle] = useState('')
  const [memoryNote, setMemoryNote] = useState('')
  const [memoryImage, setMemoryImage] = useState('')

  const handleAddMemory = () => {
    if (!memoryTitle.trim() && !memoryNote.trim()) return
    const memories = book.memories || []
    const newMemory = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
      title: memoryTitle.trim() || 'Untitled Memory',
      note: memoryNote.trim(),
      imageUrl: memoryImage.trim() || null,
      createdAt: new Date().toISOString(),
    }
    onUpdate({ ...book, memories: [newMemory, ...memories] })
    setMemoryTitle('')
    setMemoryNote('')
    setMemoryImage('')
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          type="text"
          value={memoryTitle}
          onChange={(e) => setMemoryTitle(e.target.value)}
          placeholder="Memory title"
          className="input-field text-sm py-2"
        />
        <input
          type="url"
          value={memoryImage}
          onChange={(e) => setMemoryImage(e.target.value)}
          placeholder="Image URL (optional)"
          className="input-field text-sm py-2"
        />
      </div>
      <textarea
        value={memoryNote}
        onChange={(e) => setMemoryNote(e.target.value)}
        placeholder="Capture a memory tied to this book..."
        className="input-field h-28 resize-none"
      />
      <button onClick={handleAddMemory} className="btn-secondary">
        Add Memory
      </button>
      <div className="memories-grid">
        {(book.memories || []).length === 0 ? (
          <p className="text-muted text-sm italic">No memories saved yet</p>
        ) : (
          book.memories.map((memory) => (
            <div key={memory.id} className="memory-card">
              {memory.imageUrl && <img src={memory.imageUrl} alt="" />}
              <div className="memory-title">{memory.title}</div>
              {memory.note && <p>{memory.note}</p>}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
