import assert from 'node:assert/strict'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { remote } from 'webdriverio'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function commandForPlatform(base) {
  return process.platform === 'win32' ? `${base}.cmd` : base
}

function runChecked(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || rootDir,
    env: options.env || process.env,
    stdio: 'inherit',
  })
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}`)
  }
}

function waitForPort(port, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now()

    const tryConnect = () => {
      const socket = new net.Socket()
      socket
        .once('connect', () => {
          socket.destroy()
          resolve()
        })
        .once('error', () => {
          socket.destroy()
          if (Date.now() - startedAt >= timeoutMs) {
            reject(new Error(`Timed out waiting for port ${port}`))
            return
          }
          setTimeout(tryConnect, 250)
        })
        .connect(port, '127.0.0.1')
    }

    tryConnect()
  })
}

async function waitForMatchingFile(dirPath, predicate, timeoutMs = 30000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const entries = await fsp.readdir(dirPath, { withFileTypes: true })
      const match = entries.find((entry) => predicate(entry))
      if (match) return path.join(dirPath, match.name)
    } catch {
      // ignore until timeout
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`Timed out waiting for expected file in ${dirPath}`)
}

async function seedArticleFixture(libraryRoot) {
  const articlesDir = path.join(libraryRoot, 'articles')
  const articleFile = path.join(articlesDir, 'Desktop Smoke Article.html')
  const articleHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Desktop Smoke Article</title>
  </head>
  <body>
    <article>
      <h1>Desktop Smoke Article</h1>
      <p>Desktop smoke article body for the real Tauri reader.</p>
    </article>
  </body>
</html>`

  await fsp.mkdir(articlesDir, { recursive: true })
  await fsp.writeFile(articleFile, articleHtml, 'utf8')
  return articleFile
}

function createPdfBuffer(text) {
  const escaped = text.replace(/[()\\]/g, '\\$&')
  const stream = `BT\n/F1 24 Tf\n40 80 Td\n(${escaped}) Tj\nET\n`
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}endstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ]

  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'))
    pdf += object
  }
  const xrefOffset = Buffer.byteLength(pdf, 'utf8')
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'
  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  return Buffer.from(pdf, 'utf8')
}

async function createImportFixtures(baseDir) {
  const importDir = path.join(baseDir, 'import-fixtures')
  const epubWorkDir = path.join(importDir, 'epub-work')
  const pdfPath = path.join(importDir, 'Desktop Smoke PDF.pdf')
  const epubPath = path.join(importDir, 'Desktop Smoke EPUB.epub')

  await fsp.mkdir(importDir, { recursive: true })
  await fsp.writeFile(pdfPath, createPdfBuffer('Desktop Smoke PDF'))

  await fsp.rm(epubWorkDir, { recursive: true, force: true })
  await fsp.mkdir(path.join(epubWorkDir, 'META-INF'), { recursive: true })
  await fsp.mkdir(path.join(epubWorkDir, 'OEBPS'), { recursive: true })

  await fsp.writeFile(path.join(epubWorkDir, 'mimetype'), 'application/epub+zip', 'utf8')
  await fsp.writeFile(
    path.join(epubWorkDir, 'META-INF', 'container.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
    'utf8'
  )
  await fsp.writeFile(
    path.join(epubWorkDir, 'OEBPS', 'content.opf'),
    `<?xml version="1.0" encoding="UTF-8"?>
<package version="2.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Desktop Smoke EPUB</dc:title>
    <dc:identifier id="BookId">desktop-smoke-epub</dc:identifier>
    <dc:language>en</dc:language>
    <dc:creator>Tauri Harness</dc:creator>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine toc="ncx">
    <itemref idref="chapter"/>
  </spine>
</package>`,
    'utf8'
  )
  await fsp.writeFile(
    path.join(epubWorkDir, 'OEBPS', 'toc.ncx'),
    `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="desktop-smoke-epub"/>
  </head>
  <docTitle><text>Desktop Smoke EPUB</text></docTitle>
  <navMap>
    <navPoint id="navPoint-1" playOrder="1">
      <navLabel><text>Chapter 1</text></navLabel>
      <content src="chapter.xhtml"/>
    </navPoint>
  </navMap>
</ncx>`,
    'utf8'
  )
  await fsp.writeFile(
    path.join(epubWorkDir, 'OEBPS', 'chapter.xhtml'),
    `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>Desktop Smoke EPUB</title>
  </head>
  <body>
    <h1>Desktop Smoke EPUB</h1>
    <p>Desktop smoke EPUB body for the real Tauri reader.</p>
  </body>
</html>`,
    'utf8'
  )

  await fsp.rm(epubPath, { force: true })
  runChecked('zip', ['-X0', epubPath, 'mimetype'], { cwd: epubWorkDir })
  runChecked('zip', ['-Xr9D', epubPath, 'META-INF', 'OEBPS'], { cwd: epubWorkDir })
  await fsp.rm(epubWorkDir, { recursive: true, force: true })

  return { pdfPath, epubPath }
}

async function click(browser, selector, timeout = 30000) {
  const element = await browser.$(selector)
  await element.waitForDisplayed({ timeout })
  await element.click()
}

async function fill(browser, selector, value, timeout = 30000) {
  const element = await browser.$(selector)
  await element.waitForDisplayed({ timeout })
  await element.setValue(value)
}

async function waitForText(browser, selector, expected, timeout = 30000) {
  await browser.waitUntil(async () => {
    const element = await browser.$(selector)
    if (!(await element.isExisting())) return false
    const text = await element.getText()
    return text.includes(expected)
  }, {
    timeout,
    timeoutMsg: `Timed out waiting for "${expected}" in ${selector}`,
  })
}

function getDriverPath() {
  if (process.env.TAURI_DRIVER_PATH) return process.env.TAURI_DRIVER_PATH
  const home = process.env.HOME || os.homedir()
  return path.join(home, '.cargo', 'bin', process.platform === 'win32' ? 'tauri-driver.exe' : 'tauri-driver')
}

function getAppPath() {
  if (process.env.TAURI_APP_PATH) return process.env.TAURI_APP_PATH
  return path.join(
    rootDir,
    'src-tauri',
    'target',
    'release',
    process.platform === 'win32' ? 'app.exe' : 'app'
  )
}

async function main() {
  if (process.platform !== 'linux') {
    console.log('[desktop-smoke] Skipping: this harness is wired for Linux CI because upstream Tauri WebDriver automation does not support local macOS execution.')
    return
  }

  const testHome = await fsp.mkdtemp(path.join(os.tmpdir(), 'virtual-library-desktop-home-'))
  const env = {
    ...process.env,
    HOME: testHome,
    USERPROFILE: testHome,
    XDG_CONFIG_HOME: path.join(testHome, '.config'),
    XDG_DATA_HOME: path.join(testHome, '.local', 'share'),
  }

  const driverPath = getDriverPath()
  const appPath = getAppPath()
  const npmCommand = commandForPlatform('npm')
  const cargoCommand = commandForPlatform('cargo')
  const libraryRoot = path.join(testHome, 'VirtualLibrary', 'Library')

  if (!fs.existsSync(driverPath)) {
    throw new Error(`Tauri driver not found at ${driverPath}. Install it with "cargo install tauri-driver --locked".`)
  }

  if (!process.env.VIRTUAL_LIBRARY_DESKTOP_SMOKE_SKIP_BUILD) {
    runChecked(npmCommand, ['run', 'build'], { env })
    runChecked(cargoCommand, ['build', '--manifest-path', 'src-tauri/Cargo.toml', '--release'], { env })
  }

  if (!fs.existsSync(appPath)) {
    throw new Error(`Built Tauri application not found at ${appPath}.`)
  }

  await seedArticleFixture(libraryRoot)
  const { pdfPath, epubPath } = await createImportFixtures(testHome)

  const driver = spawn(driverPath, [], {
    cwd: rootDir,
    env,
    stdio: 'inherit',
  })

  let browser

  try {
    await waitForPort(4444)

    browser = await remote({
      hostname: '127.0.0.1',
      port: 4444,
      path: '/',
      logLevel: 'error',
      connectionRetryTimeout: 5000,
      connectionRetryCount: 5,
      capabilities: {
        browserName: 'wry',
        'tauri:options': {
          application: appPath,
        },
      },
    })

    await waitForText(browser, '//h2', 'Your library awaits', 45000)
    await click(browser, '//header//button[normalize-space()="Add to Library"]')
    await click(browser, '//button[@role="tab" and normalize-space()="Manual"]')

    await fill(browser, '//*[@id="manual-book-title"]', 'Desktop Smoke Volume')
    await fill(browser, '//*[@id="manual-book-author"]', 'Tauri Harness')
    await click(browser, '//button[@type="submit" and normalize-space()="Add Book"]')

    await waitForText(browser, '//*[contains(@class, "library-stage-count")]', '1 book in your library')

    const dbPath = path.join(libraryRoot, 'library.db')
    const createdDb = await waitForMatchingFile(libraryRoot, (entry) => entry.isFile() && entry.name === 'library.db')
    assert.equal(createdDb, dbPath)

    await click(browser, '//button[normalize-space()="Reading Room"]')
    await waitForText(browser, '//*[contains(@class, "reading-room-item-title") or contains(@class, "reading-room-card-title")]', 'Desktop Smoke Article')
    await browser.execute((filePaths) => {
      window.__VIRTUAL_LIBRARY_TEST_DIALOGS__ = {
        ...(window.__VIRTUAL_LIBRARY_TEST_DIALOGS__ || {}),
        openQueue: [...(window.__VIRTUAL_LIBRARY_TEST_DIALOGS__?.openQueue || []), filePaths],
      }
    }, [pdfPath, epubPath])
    await click(browser, '//button[normalize-space()="Import Files"]')
    await waitForText(browser, '//*[contains(@class, "reading-room-item-title") or contains(@class, "reading-room-card-title")]', 'Desktop Smoke PDF')
    await waitForText(browser, '//*[contains(@class, "reading-room-item-title") or contains(@class, "reading-room-card-title")]', 'Desktop Smoke EPUB')
    await click(browser, '//button[normalize-space()="Read"]')
    await waitForText(browser, '//*[contains(@class, "epub-reader-title")]', 'Desktop Smoke Article')
    await waitForText(browser, '//*[contains(@class, "article-reader")]', 'Desktop smoke article body for the real Tauri reader.')
    await browser.keys('Escape')
    await browser.waitUntil(async () => {
      const dialogs = await browser.$$('//*[@role="dialog"]')
      return dialogs.length === 0
    }, {
      timeout: 10000,
      timeoutMsg: 'Timed out waiting for article reader to close',
    })

    await fill(browser, '//label[contains(@class, "reading-room-search")]//input', 'Desktop Smoke PDF')
    await click(browser, '//button[normalize-space()="PDFs"]')
    await click(browser, '//button[normalize-space()="Read"]')
    await waitForText(browser, '//*[contains(@class, "pdf-reader-title")]', 'Desktop Smoke PDF')
    await waitForText(browser, '//*[contains(@class, "pdf-reader-page")]', 'Page 1 / 1')
    await browser.keys('Escape')
    await browser.waitUntil(async () => {
      const dialogs = await browser.$$('//*[@role="dialog"]')
      return dialogs.length === 0
    }, {
      timeout: 10000,
      timeoutMsg: 'Timed out waiting for PDF reader to close',
    })

    await fill(browser, '//label[contains(@class, "reading-room-search")]//input', '')
    await click(browser, '//button[normalize-space()="EPUBs"]')
    await fill(browser, '//label[contains(@class, "reading-room-search")]//input', 'Desktop Smoke EPUB')
    await click(browser, '//button[normalize-space()="Read"]')
    await waitForText(browser, '//*[contains(@class, "epub-reader-title")]', 'Desktop Smoke EPUB')
    await waitForText(browser, '//*[contains(@class, "epub-reader-toolbar")]', 'Text')
    await browser.waitUntil(async () => {
      const loaders = await browser.$$('.//*[contains(@class, "epub-reader-loading")]')
      if (loaders.length === 0) return true
      for (const loader of loaders) {
        if (await loader.isDisplayed()) return false
      }
      return true
    }, {
      timeout: 15000,
      timeoutMsg: 'Timed out waiting for EPUB reader to finish loading',
    })
    await browser.keys('Escape')
    await browser.waitUntil(async () => {
      const dialogs = await browser.$$('//*[@role="dialog"]')
      return dialogs.length === 0
    }, {
      timeout: 10000,
      timeoutMsg: 'Timed out waiting for EPUB reader to close',
    })

    await click(browser, '//button[normalize-space()="Maintenance"]')
    await waitForText(browser, '//*[contains(@class, "press-hero-title")]', 'Protect, verify, and recover your local library.')
    await click(browser, '//button[normalize-space()="Create Snapshot"]')

    const snapshotPath = await waitForMatchingFile(
      path.join(libraryRoot, 'snapshots'),
      (entry) => entry.isFile() && entry.name.endsWith('.zip')
    )
    const snapshotStat = await fsp.stat(snapshotPath)
    assert.ok(snapshotStat.size > 0, 'Snapshot file should not be empty')

    console.log(`[desktop-smoke] Passed with isolated library at ${libraryRoot}`)
  } finally {
    if (browser) {
      await browser.deleteSession().catch(() => {})
    }
    driver.kill('SIGTERM')
  }
}

main().catch((error) => {
  console.error('[desktop-smoke] Failed:', error?.stack || error?.message || error)
  process.exitCode = 1
})
