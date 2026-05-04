import React from 'react'
import ExhibitShelf from '../../../components/ExhibitShelf'
import SpineLibraryPanel from '../../../components/SpineLibraryPanel'

function LibraryCustomizerSection({
  showCustomizer,
  userData,
  shelfFontValue,
  books,
  shelves,
  spineLibraryEntries,
  onUpdateUserData,
  onExportLibrary,
  onCreateExhibit,
  onSelectBook,
  onUpdateSpineLibraryEntry,
  onRemoveSpineLibraryEntry,
}) {
  return (
    <>
      <ExhibitShelf
        exhibits={userData.exhibits || []}
        books={books}
        onCreateExhibit={onCreateExhibit}
        onSelectBook={onSelectBook}
        shelfFont={shelfFontValue}
      />

      {showCustomizer && (
        <div className="library-secondary-panel">
          <div className="customizer-panel">
            <div>
              <label>
                Library Name
                <input
                  type="text"
                  value={userData.displayName || ''}
                  onChange={(e) => onUpdateUserData({ displayName: e.target.value })}
                />
              </label>
              <label>
                Theme
                <select
                  value={userData.theme || 'classic'}
                  onChange={(e) => onUpdateUserData({ theme: e.target.value })}
                >
                  <option value="classic">Classic</option>
                  <option value="scifi">Sci-Fi</option>
                </select>
              </label>
              <label>
                Lighting
                <select
                  value={userData.lightingPreset || 'golden'}
                  onChange={(e) => onUpdateUserData({ lightingPreset: e.target.value })}
                >
                  <option value="golden">Golden Hour</option>
                  <option value="dawn">Dawn</option>
                  <option value="midnight">Midnight</option>
                </select>
              </label>
              <label>
                Wood Tone
                <select
                  value={userData.woodTone || 'walnut'}
                  onChange={(e) => onUpdateUserData({ woodTone: e.target.value })}
                >
                  <option value="walnut">Walnut</option>
                  <option value="mahogany">Mahogany</option>
                  <option value="maple">Maple</option>
                </select>
              </label>
            </div>
            <div>
              <label>
                Placard Font
                <select
                  value={userData.shelfFont || 'cinzel'}
                  onChange={(e) => onUpdateUserData({ shelfFont: e.target.value })}
                >
                  <option value="cinzel">Cinzel</option>
                  <option value="playfair">Playfair Display</option>
                  <option value="fell">IM Fell English</option>
                  <option value="baskerville">Libre Baskerville</option>
                </select>
              </label>
              <div style={{ marginTop: '16px' }}>
                <label>
                  Export Library
                  <button
                    type="button"
                    onClick={onExportLibrary}
                    className="btn-secondary mt-2"
                  >
                    Export books + notes
                  </button>
                </label>
              </div>
            </div>
          </div>
          <SpineLibraryPanel
            entries={spineLibraryEntries}
            onUpdateEntry={onUpdateSpineLibraryEntry}
            onRemoveEntry={onRemoveSpineLibraryEntry}
          />
        </div>
      )}
    </>
  )
}

export default LibraryCustomizerSection
