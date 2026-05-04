# Desktop Hardening Runbook

This runbook covers the trust-critical desktop flows: file import, backup, snapshot, restore, and verification.

## Runtime Model

- Tauri desktop is the source of truth for file import, OCR, snapshots, backup, restore, and maintenance.
- The web shell is a development surface. It renders the library and keeps desktop-only actions disabled with explanatory copy.
- SQLite is opened through `src/data/dbConnection.js`; writes are serialized per library path.
- Native archive and cleanup commands live under `src-tauri/src/`.

## Import Flow

1. User-selected source files are never modified or deleted.
2. `importLibraryFiles()` copies each source file into `libraryPath/.staging/imports`.
3. Text extraction, hashing, HTML sanitization, and quarantine marking run against the staged copy.
4. The staged copy is renamed into `libraryPath/library` only after processing succeeds.
5. Failed staged copies are cleaned through the native `remove_import_staging_file` command.

Cleanup is intentionally narrow:

- Frontend cleanup only invokes native removal for direct children of `.staging/imports`.
- The native command refuses final library files, parent-directory traversal, and symlinked staging directories.
- If cleanup itself fails, the import failure is still reported and the rest of the selected batch continues.

## Backup And Snapshot Flow

Manual backups and snapshots follow the same safety sequence:

1. Flush pending library writes.
2. Close the cached SQLite handle for the active library.
3. Invoke native `export_backup`.
4. Native export writes to a partial archive first, then replaces the final backup path only after success.

Current limitation: native export still archives the SQLite database file set directly. The next deeper improvement is a SQLite-native backup snapshot using `VACUUM INTO` or the SQLite backup API.

## Restore Flow

- Restore validates the archive manifest and stages extracted files before replacing targets.
- Active-library restore compares normalized and canonical paths before deciding whether to flush and close the cached SQLite handle.
- Restore removes stale `library.db-wal` and `library.db-shm` sidecars when the backup contains only `library.db`.
- Restore preserves existing targets until validation passes.

## Verification

Use these commands before shipping changes:

```bash
npm run verify:fast
npm run verify
```

Useful focused checks:

```bash
npm test -- --run src/utils/libraryVault.test.js
npm test -- --run src/hooks/tauri/useTauriRecoveryOperations.test.jsx
npm test -- --run src/data/__tests__/dbConnection.test.js
cargo test --manifest-path src-tauri/Cargo.toml vault
```

Manual smoke with Computer Use should cover:

- Fresh app render on `http://127.0.0.1:5173/`.
- Quick Add open and close.
- Search, Bulk Import, and Manual tabs.
- Reading Room navigation.
- Preferences open and close.
- Return to Library.

## Known Security Debt

- `npm audit` still reports high-severity issues through `epubjs -> @xmldom/xmldom`.
- The automated fix upgrades `epubjs` across a semver-major boundary, so it should be handled as a dedicated EPUB compatibility pass.
- `tauri-plugin-sql` is still sourced from a git branch. `Cargo.lock` pins the current checkout, but reproducible dependency pinning should be revisited before distribution.
