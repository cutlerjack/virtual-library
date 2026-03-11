import { DB_VERSION, safeExec, withTransaction } from './dbConnection'

export async function migrateDb(db) {
  const versionRow = await db.select('PRAGMA user_version')
  let currentVersion = Array.isArray(versionRow) ? versionRow[0]?.user_version : 0
  if (currentVersion >= DB_VERSION) {
    await ensureDbIndexes(db)
    await ensureSettingsDefaults(db)
    return
  }

  await withTransaction(db, async () => {
    if (currentVersion === 0) {
      await createAllTables(db)
      currentVersion = DB_VERSION
    } else {
      if (currentVersion < 2) {
        await db.execute(`
          CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT,
            updated_at TEXT
          )
        `)
        currentVersion = 2
      }

      if (currentVersion < 3) {
        await addColumnIfMissing(db, 'annotations', 'title TEXT')
        await addColumnIfMissing(db, 'annotations', 'color TEXT')
        await addColumnIfMissing(db, 'annotations', 'source TEXT')
        await addColumnIfMissing(db, 'annotations', 'body_rich TEXT')
        await db.execute(`
          CREATE TABLE IF NOT EXISTS annotation_anchors (
            id TEXT PRIMARY KEY,
            annotation_id TEXT NOT NULL,
            item_id TEXT NOT NULL,
            kind TEXT,
            locator_json TEXT,
            text_snippet TEXT,
            page INTEGER,
            cfi TEXT,
            scroll_offset REAL,
            created_at TEXT
          )
        `)
        await db.execute(`
          CREATE TABLE IF NOT EXISTS annotation_links (
            id TEXT PRIMARY KEY,
            from_annotation_id TEXT NOT NULL,
            to_annotation_id TEXT NOT NULL,
            created_at TEXT
          )
        `)
        await db.execute(`
          CREATE TABLE IF NOT EXISTS reader_state (
            item_id TEXT PRIMARY KEY,
            last_location_json TEXT,
            last_page INTEGER,
            progress REAL,
            font_size INTEGER,
            layout TEXT,
            mode TEXT,
            updated_at TEXT
          )
        `)
        await db.execute(`
          CREATE TABLE IF NOT EXISTS reading_sessions (
            id TEXT PRIMARY KEY,
            item_id TEXT NOT NULL,
            started_at TEXT,
            ended_at TEXT,
            duration_sec INTEGER,
            mode TEXT,
            device TEXT
          )
        `)
        currentVersion = 3
      }

      if (currentVersion < 4) {
        await db.execute(`
          CREATE TABLE IF NOT EXISTS ingest_jobs (
            id TEXT PRIMARY KEY,
            item_id TEXT,
            source_path TEXT,
            target_path TEXT,
            force_ocr INTEGER,
            status TEXT,
            progress REAL,
            error TEXT,
            created_at TEXT,
            updated_at TEXT
          )
        `)
        await db.execute(`
          CREATE TABLE IF NOT EXISTS text_chunks (
            id TEXT PRIMARY KEY,
            item_id TEXT NOT NULL,
            source TEXT,
            chunk_index INTEGER,
            text TEXT,
            token_count INTEGER,
            created_at TEXT
          )
        `)
        await db.execute(`
          CREATE TABLE IF NOT EXISTS ocr_pages (
            id TEXT PRIMARY KEY,
            item_id TEXT NOT NULL,
            page_index INTEGER,
            confidence REAL,
            text TEXT,
            created_at TEXT
          )
        `)
        await addColumnIfMissing(db, 'files', 'mime TEXT')
        await addColumnIfMissing(db, 'files', 'page_count INTEGER')
        await addColumnIfMissing(db, 'files', 'scanned INTEGER')
        currentVersion = 4
      }

      if (currentVersion < 5) {
        await db.execute(`
          CREATE TABLE IF NOT EXISTS change_log (
            id TEXT PRIMARY KEY,
            table_name TEXT,
            row_id TEXT,
            operation TEXT,
            before_json TEXT,
            after_json TEXT,
            timestamp TEXT
          )
        `)
        await db.execute(`
          CREATE TABLE IF NOT EXISTS snapshots (
            id TEXT PRIMARY KEY,
            created_at TEXT,
            note TEXT,
            snapshot_path TEXT,
            hash TEXT
          )
        `)
        await db.execute(`
          CREATE TABLE IF NOT EXISTS integrity_checks (
            id TEXT PRIMARY KEY,
            type TEXT,
            status TEXT,
            details_json TEXT,
            created_at TEXT
          )
        `)
        await db.execute(`
          CREATE TABLE IF NOT EXISTS change_log_control (
            id INTEGER PRIMARY KEY,
            enabled INTEGER
          )
        `)
        await db.execute(`INSERT OR IGNORE INTO change_log_control (id, enabled) VALUES (1, 1)`)
        await createChangeLogTriggers(db)
        currentVersion = 5
      }

      if (currentVersion < 6) {
        await addColumnIfMissing(db, 'ingest_jobs', 'force_ocr INTEGER')
        currentVersion = 6
      }

      if (currentVersion < 7) {
        await addColumnIfMissing(db, 'ingest_jobs', 'attempt_count INTEGER NOT NULL DEFAULT 0')
        await addColumnIfMissing(db, 'ingest_jobs', 'last_error_code TEXT')
        currentVersion = 7
      }
    }

    await ensureDbIndexes(db)
    await ensureSettingsDefaults(db)
    await db.execute(`PRAGMA user_version = ${currentVersion}`)
    await db.execute('DELETE FROM text_chunks WHERE item_id NOT IN (SELECT id FROM items)')
    await db.execute('DELETE FROM ocr_pages WHERE item_id NOT IN (SELECT id FROM items)')
    await db.execute('DELETE FROM annotation_anchors WHERE item_id NOT IN (SELECT id FROM items)')
    await db.execute('DELETE FROM annotation_links WHERE from_annotation_id NOT IN (SELECT id FROM annotations)')
    await db.execute('UPDATE change_log_control SET enabled = 1 WHERE id = 1')
  })
}

async function createAllTables(db) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      title TEXT,
      author TEXT,
      isbn TEXT,
      published_date TEXT,
      rating REAL,
      cover_url TEXT,
      created_at TEXT,
      updated_at TEXT,
      meta_json TEXT
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS shelves (
      id TEXT PRIMARY KEY,
      name TEXT,
      color TEXT,
      sort_order INTEGER
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS item_shelves (
      item_id TEXT NOT NULL,
      shelf_id TEXT NOT NULL,
      PRIMARY KEY (item_id, shelf_id)
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS item_tags (
      item_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (item_id, tag_id)
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      path TEXT,
      hash TEXT,
      size INTEGER,
      mtime INTEGER,
      mime TEXT,
      page_count INTEGER,
      scanned INTEGER,
      status TEXT
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS reading_state (
      item_id TEXT PRIMARY KEY,
      last_opened TEXT,
      progress REAL,
      last_page INTEGER,
      page_count INTEGER,
      last_location TEXT,
      mode TEXT,
      layout TEXT,
      font_size INTEGER
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS reader_state (
      item_id TEXT PRIMARY KEY,
      last_location_json TEXT,
      last_page INTEGER,
      progress REAL,
      font_size INTEGER,
      layout TEXT,
      mode TEXT,
      updated_at TEXT
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS reading_sessions (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      started_at TEXT,
      ended_at TEXT,
      duration_sec INTEGER,
      mode TEXT,
      device TEXT
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS annotations (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      type TEXT NOT NULL,
      body TEXT,
      locator_json TEXT,
      title TEXT,
      color TEXT,
      source TEXT,
      body_rich TEXT,
      created_at TEXT
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS annotation_anchors (
      id TEXT PRIMARY KEY,
      annotation_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      kind TEXT,
      locator_json TEXT,
      text_snippet TEXT,
      page INTEGER,
      cfi TEXT,
      scroll_offset REAL,
      created_at TEXT
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS annotation_links (
      id TEXT PRIMARY KEY,
      from_annotation_id TEXT NOT NULL,
      to_annotation_id TEXT NOT NULL,
      created_at TEXT
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS ingest_jobs (
      id TEXT PRIMARY KEY,
      item_id TEXT,
      source_path TEXT,
      target_path TEXT,
      force_ocr INTEGER,
      status TEXT,
      progress REAL,
      error TEXT,
      attempt_count INTEGER NOT NULL DEFAULT 0,
      last_error_code TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS text_chunks (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      source TEXT,
      chunk_index INTEGER,
      text TEXT,
      token_count INTEGER,
      created_at TEXT
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS ocr_pages (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      page_index INTEGER,
      confidence REAL,
      text TEXT,
      created_at TEXT
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS spine_library (
      isbn TEXT PRIMARY KEY,
      spine_image TEXT,
      crop_json TEXT,
      title TEXT,
      author TEXT,
      updated_at TEXT
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS change_log (
      id TEXT PRIMARY KEY,
      table_name TEXT,
      row_id TEXT,
      operation TEXT,
      before_json TEXT,
      after_json TEXT,
      timestamp TEXT
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS snapshots (
      id TEXT PRIMARY KEY,
      created_at TEXT,
      note TEXT,
      snapshot_path TEXT,
      hash TEXT
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS integrity_checks (
      id TEXT PRIMARY KEY,
      type TEXT,
      status TEXT,
      details_json TEXT,
      created_at TEXT
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS change_log_control (
      id INTEGER PRIMARY KEY,
      enabled INTEGER
    )
  `)
  await db.execute(`INSERT OR IGNORE INTO change_log_control (id, enabled) VALUES (1, 1)`)
  await createChangeLogTriggers(db)
  await db.execute(`
    CREATE VIRTUAL TABLE IF NOT EXISTS search_docs USING fts5(
      item_id,
      kind,
      title,
      body,
      updated_at
    )
  `)
}

async function ensureDbIndexes(db) {
  const duplicatePaths = await db.select(`
    SELECT path
    FROM files
    WHERE path IS NOT NULL AND path <> ''
    GROUP BY path
    HAVING COUNT(*) > 1
  `)

  for (const row of duplicatePaths || []) {
    const path = row.path
    const matches = await db.select(
      'SELECT id FROM files WHERE path = ? ORDER BY mtime DESC, id DESC',
      [path]
    )
    if (!matches || matches.length <= 1) continue
    for (let i = 1; i < matches.length; i += 1) {
      await db.execute(
        'UPDATE files SET path = NULL, status = CASE WHEN status IS NULL OR status = "" THEN ? ELSE status END WHERE id = ?',
        ['duplicate', matches[i].id]
      )
    }
  }

  await db.execute('CREATE INDEX IF NOT EXISTS idx_ingest_jobs_status_updated ON ingest_jobs(status, updated_at DESC)')
  await db.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_files_path_unique ON files(path) WHERE path IS NOT NULL AND path <> ""')
  await db.execute('CREATE INDEX IF NOT EXISTS idx_files_hash ON files(hash)')
  await db.execute('CREATE INDEX IF NOT EXISTS idx_annotations_item_created ON annotations(item_id, created_at DESC)')
  await db.execute('CREATE INDEX IF NOT EXISTS idx_reader_state_updated ON reader_state(updated_at DESC)')
}

async function ensureSettingsDefaults(db) {
  const now = new Date().toISOString()
  const defaults = [
    ['pdf_render_memory_mb', '512'],
    ['pdf_virtual_overscan_pages', '8'],
    ['ingest_job_retention_days', '14'],
  ]
  for (const [key, value] of defaults) {
    await db.execute(
      'INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES (?, ?, ?)',
      [key, value, now]
    )
  }
}

async function addColumnIfMissing(db, table, columnDef) {
  const [columnName] = columnDef.split(/\s+/)
  const columns = await db.select(`PRAGMA table_info(${table})`)
  const exists = columns?.some((col) => col.name === columnName)
  if (!exists) {
    await db.execute(`ALTER TABLE ${table} ADD COLUMN ${columnDef}`)
  }
}

async function createChangeLogTriggers(db) {
  await db.execute(`
    CREATE TRIGGER IF NOT EXISTS change_log_items_insert
    AFTER INSERT ON items
    WHEN (SELECT enabled FROM change_log_control WHERE id = 1) = 1
    BEGIN
      INSERT INTO change_log (id, table_name, row_id, operation, before_json, after_json, timestamp)
      VALUES (lower(hex(randomblob(16))), 'items', NEW.id, 'insert', NULL, NEW.meta_json, strftime('%Y-%m-%dT%H:%M:%fZ','now'));
    END;
  `)
  await db.execute(`
    CREATE TRIGGER IF NOT EXISTS change_log_items_update
    AFTER UPDATE ON items
    WHEN (SELECT enabled FROM change_log_control WHERE id = 1) = 1
    BEGIN
      INSERT INTO change_log (id, table_name, row_id, operation, before_json, after_json, timestamp)
      VALUES (lower(hex(randomblob(16))), 'items', NEW.id, 'update', OLD.meta_json, NEW.meta_json, strftime('%Y-%m-%dT%H:%M:%fZ','now'));
    END;
  `)
  await db.execute(`
    CREATE TRIGGER IF NOT EXISTS change_log_items_delete
    AFTER DELETE ON items
    WHEN (SELECT enabled FROM change_log_control WHERE id = 1) = 1
    BEGIN
      INSERT INTO change_log (id, table_name, row_id, operation, before_json, after_json, timestamp)
      VALUES (lower(hex(randomblob(16))), 'items', OLD.id, 'delete', OLD.meta_json, NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'));
    END;
  `)
  await db.execute(`
    CREATE TRIGGER IF NOT EXISTS change_log_annotations_update
    AFTER INSERT ON annotations
    WHEN (SELECT enabled FROM change_log_control WHERE id = 1) = 1
    BEGIN
      INSERT INTO change_log (id, table_name, row_id, operation, before_json, after_json, timestamp)
      VALUES (lower(hex(randomblob(16))), 'annotations', NEW.id, 'insert', NULL, NEW.body, strftime('%Y-%m-%dT%H:%M:%fZ','now'));
    END;
  `)
  await db.execute(`
    CREATE TRIGGER IF NOT EXISTS change_log_files_update
    AFTER UPDATE ON files
    WHEN (SELECT enabled FROM change_log_control WHERE id = 1) = 1
    BEGIN
      INSERT INTO change_log (id, table_name, row_id, operation, before_json, after_json, timestamp)
      VALUES (lower(hex(randomblob(16))), 'files', NEW.id, 'update', OLD.status, NEW.status, strftime('%Y-%m-%dT%H:%M:%fZ','now'));
    END;
  `)
  await db.execute(`
    CREATE TRIGGER IF NOT EXISTS change_log_reader_state_update
    AFTER UPDATE ON reader_state
    WHEN (SELECT enabled FROM change_log_control WHERE id = 1) = 1
    BEGIN
      INSERT INTO change_log (id, table_name, row_id, operation, before_json, after_json, timestamp)
      VALUES (lower(hex(randomblob(16))), 'reader_state', NEW.item_id, 'update', OLD.last_location_json, NEW.last_location_json, strftime('%Y-%m-%dT%H:%M:%fZ','now'));
    END;
  `)
  await db.execute(`
    CREATE TRIGGER IF NOT EXISTS change_log_settings_update
    AFTER UPDATE ON settings
    WHEN (SELECT enabled FROM change_log_control WHERE id = 1) = 1
    BEGIN
      INSERT INTO change_log (id, table_name, row_id, operation, before_json, after_json, timestamp)
      VALUES (lower(hex(randomblob(16))), 'settings', NEW.key, 'update', OLD.value, NEW.value, strftime('%Y-%m-%dT%H:%M:%fZ','now'));
    END;
  `)
}
