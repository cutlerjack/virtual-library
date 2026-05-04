/* @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { copyFile, exists, readBinaryFile, renameFile } from '@tauri-apps/api/fs'
import { basename, join } from '@tauri-apps/api/path'
import { invoke } from '@tauri-apps/api/tauri'
import { openDialog } from './tauriDialog'
import {
  chooseLibraryFolder,
  cleanupImportStagingFile,
  getStoredLibraryPath,
  importLibraryFiles,
  migrateExportToLibraryState,
  setStoredLibraryPath,
} from './libraryVault'

vi.mock('@tauri-apps/api/fs', () => ({
  createDir: vi.fn(),
  exists: vi.fn(),
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
  copyFile: vi.fn(),
  readDir: vi.fn(),
  readBinaryFile: vi.fn(),
  renameFile: vi.fn(),
}))

vi.mock('@tauri-apps/api/path', () => ({
  homeDir: vi.fn(() => Promise.resolve('/Users/test')),
  downloadDir: vi.fn(),
  join: vi.fn((...parts) => Promise.resolve(parts.join('/'))),
  basename: vi.fn(),
}))

vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn(),
}))

vi.mock('./tauri', () => ({
  isTauri: () => true,
}))

vi.mock('./tauriDialog', () => ({
  openDialog: vi.fn(),
}))

vi.mock('./fileHash', () => ({
  computeSha256: vi.fn(() => Promise.resolve('hash')),
}))

vi.mock('./textExtract', () => ({
  extractPdfText: vi.fn(() => Promise.resolve('')),
  extractEpubText: vi.fn(() => Promise.resolve('')),
  extractHtmlText: vi.fn(() => ''),
}))

describe('libraryVault', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    exists.mockResolvedValue(false)
    copyFile.mockResolvedValue()
    readBinaryFile.mockResolvedValue(new Uint8Array([1, 2, 3]))
    renameFile.mockResolvedValue()
    invoke.mockResolvedValue()
    join.mockImplementation((...parts) => Promise.resolve(parts.join('/')))
    basename.mockImplementation((path) => Promise.resolve(String(path).split('/').pop()))
  })

  it('normalizes a selected library folder path', async () => {
    openDialog.mockResolvedValue('~/VirtualLibrary')

    await expect(chooseLibraryFolder()).resolves.toBe('/Users/test/VirtualLibrary')
  })

  it('returns null when the folder chooser fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    openDialog.mockRejectedValue(new Error('dialog denied'))

    await expect(chooseLibraryFolder()).resolves.toBeNull()
    expect(warnSpy).toHaveBeenCalledWith(
      '[library-vault] Unable to choose library folder:',
      'dialog denied'
    )

    warnSpy.mockRestore()
  })

  it('returns successful imports when a later selected file fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    openDialog.mockResolvedValue(['/source/first.pdf', '/source/second.pdf'])
    readBinaryFile.mockImplementation((path) => (
      String(path).endsWith('second.pdf')
        ? Promise.reject(new Error('unreadable'))
        : Promise.resolve(new Uint8Array([1, 2, 3]))
    ))

    const imported = await importLibraryFiles('/library')

    expect(imported).toHaveLength(1)
    expect(imported.failures).toEqual(['Unable to copy second.pdf. unreadable'])
    expect(imported[0]).toEqual(expect.objectContaining({
      title: 'first',
      originalName: 'first.pdf',
      filePath: '/library/library/first.pdf',
      type: 'pdf',
    }))
    expect(copyFile).toHaveBeenCalledWith(
      '/source/first.pdf',
      expect.stringMatching(/^\/library\/\.staging\/imports\/import-.+-first\.pdf$/)
    )
    expect(renameFile).toHaveBeenCalledWith(
      expect.stringMatching(/^\/library\/\.staging\/imports\/import-.+-first\.pdf$/),
      '/library/library/first.pdf'
    )
    expect(invoke).toHaveBeenCalledWith(
      'remove_import_staging_file',
      {
        libraryPath: '/library',
        candidatePath: expect.stringMatching(/^\/library\/\.staging\/imports\/import-.+-second\.pdf$/),
      }
    )
    expect(invoke).not.toHaveBeenCalledWith(
      'remove_import_staging_file',
      expect.objectContaining({ candidatePath: '/source/second.pdf' })
    )
    expect(invoke).not.toHaveBeenCalledWith(
      'remove_import_staging_file',
      expect.objectContaining({ candidatePath: '/library/library/second.pdf' })
    )
    expect(warnSpy).toHaveBeenCalledWith(
      '[library-vault] Import failed:',
      'Unable to copy second.pdf. unreadable'
    )

    warnSpy.mockRestore()
  })

  it('removes the staging copy and reports failure when finalizing an import fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    openDialog.mockResolvedValue('/source/book.pdf')
    renameFile.mockRejectedValue(new Error('target locked'))

    await expect(importLibraryFiles('/library')).rejects.toThrow(
      'Unable to copy book.pdf. target locked'
    )

    expect(copyFile).toHaveBeenCalledWith(
      '/source/book.pdf',
      expect.stringMatching(/^\/library\/\.staging\/imports\/import-.+-book\.pdf$/)
    )
    expect(invoke).toHaveBeenCalledWith(
      'remove_import_staging_file',
      {
        libraryPath: '/library',
        candidatePath: expect.stringMatching(/^\/library\/\.staging\/imports\/import-.+-book\.pdf$/),
      }
    )
    expect(invoke).not.toHaveBeenCalledWith(
      'remove_import_staging_file',
      expect.objectContaining({ candidatePath: '/source/book.pdf' })
    )
    expect(invoke).not.toHaveBeenCalledWith(
      'remove_import_staging_file',
      expect.objectContaining({ candidatePath: '/library/library/book.pdf' })
    )
    expect(warnSpy).toHaveBeenCalledWith(
      '[library-vault] Import failed:',
      'Unable to copy book.pdf. target locked'
    )

    warnSpy.mockRestore()
  })

  it('refuses to clean up paths outside the app-owned import staging folder', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await expect(cleanupImportStagingFile('/library', '/library/library/book.pdf')).resolves.toBe(false)

    expect(invoke).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledWith(
      '[library-vault] Refusing to remove non-staging import file:',
      '/library/library/book.pdf'
    )

    warnSpy.mockRestore()
  })

  it('reports cleanup success and failure for app-owned staging paths', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await expect(
      cleanupImportStagingFile('/library', '/library/.staging/imports/import-book.pdf')
    ).resolves.toBe(true)
    expect(invoke).toHaveBeenCalledWith('remove_import_staging_file', {
      libraryPath: '/library',
      candidatePath: '/library/.staging/imports/import-book.pdf',
    })

    invoke.mockRejectedValueOnce(new Error('permission denied'))
    await expect(
      cleanupImportStagingFile('/library', '/library/.staging/imports/import-failed.pdf')
    ).resolves.toBe(false)
    expect(warnSpy).toHaveBeenCalledWith(
      '[library-vault] Unable to remove import staging file:',
      'permission denied'
    )

    warnSpy.mockRestore()
  })

  it('accepts Windows-style staging paths at the frontend cleanup gate', async () => {
    join.mockImplementation((...parts) => Promise.resolve(parts.join('\\')))

    await expect(
      cleanupImportStagingFile('C:\\Library', 'C:\\Library\\.staging\\imports\\import-book.pdf')
    ).resolves.toBe(true)

    expect(invoke).toHaveBeenCalledWith('remove_import_staging_file', {
      libraryPath: 'C:\\Library',
      candidatePath: 'C:\\Library\\.staging\\imports\\import-book.pdf',
    })
  })

  it('continues a batch import when staging cleanup itself fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    openDialog.mockResolvedValue(['/source/first.pdf', '/source/second.pdf'])
    readBinaryFile.mockImplementation((path) => (
      String(path).endsWith('first.pdf')
        ? Promise.reject(new Error('unreadable'))
        : Promise.resolve(new Uint8Array([1, 2, 3]))
    ))
    invoke.mockRejectedValueOnce(new Error('cleanup denied'))

    const imported = await importLibraryFiles('/library')

    expect(imported).toHaveLength(1)
    expect(imported[0]).toEqual(expect.objectContaining({
      originalName: 'second.pdf',
      filePath: '/library/library/second.pdf',
    }))
    expect(imported.failures).toEqual(['Unable to copy first.pdf. unreadable'])
    expect(warnSpy).toHaveBeenCalledWith(
      '[library-vault] Unable to remove import staging file:',
      'cleanup denied'
    )
    expect(warnSpy).toHaveBeenCalledWith(
      '[library-vault] Import failed:',
      'Unable to copy first.pdf. unreadable'
    )

    warnSpy.mockRestore()
  })

  it('treats stored library path access as best effort', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('read blocked')
    })
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('write blocked')
    })

    expect(getStoredLibraryPath()).toBeNull()
    expect(() => setStoredLibraryPath('/library')).not.toThrow()
    expect(warnSpy).toHaveBeenCalledWith(
      '[library-vault] Unable to read stored library path:',
      'read blocked'
    )
    expect(warnSpy).toHaveBeenCalledWith(
      '[library-vault] Unable to persist library path:',
      'write blocked'
    )

    getItemSpy.mockRestore()
    setItemSpy.mockRestore()
    warnSpy.mockRestore()
  })

  it('normalizes malformed list fields while migrating an export', () => {
    const migrated = migrateExportToLibraryState([
      {
        title: 'Malformed Lists',
        author: 'Codex QA',
        shelves: 'Favorites',
        tags: 'imported',
        quotes: { text: 'not an array' },
      },
    ], [], [])

    expect(migrated.books).toHaveLength(1)
    expect(migrated.books[0]).toEqual(expect.objectContaining({
      title: 'Malformed Lists',
      shelves: [],
      tags: [],
      quotes: [],
    }))
  })

  it('treats malformed migration inputs as empty lists', () => {
    const migrated = migrateExportToLibraryState(null, null, {
      id: 'book-1',
      title: 'Not an array',
    })

    expect(migrated.shelves).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'all', name: 'All Books' }),
    ]))
    expect(migrated.books).toEqual([])
  })
})
