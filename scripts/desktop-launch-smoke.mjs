import { spawn, spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function commandForPlatform(base) {
  return process.platform === 'win32' ? `${base}.cmd` : base
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function run(command, args) {
  return spawnSync(command, args, {
    cwd: rootDir,
    encoding: 'utf8',
  })
}

function parsePids(output) {
  return output
    .split('\n')
    .map((line) => Number(line.trim().split(/\s+/)[0]))
    .filter((pid) => Number.isInteger(pid) && pid > 0)
}

function findVirtualLibraryProcess(excludePids = new Set()) {
  const result = run('pgrep', ['-fl', 'Virtual Library'])
  if (result.status !== 0) return ''
  return result.stdout
    .split('\n')
    .filter((line) => {
      const pid = Number(line.trim().split(/\s+/)[0])
      return line.includes('Virtual Library')
        && !line.includes('desktop-launch-smoke')
        && !excludePids.has(pid)
    })
    .join('\n')
}

function findVirtualLibraryWindow() {
  const script = `
tell application "System Events"
  set windowNames to {}
  repeat with appProcess in (application processes whose name is "Virtual Library")
    repeat with appWindow in windows of appProcess
      set end of windowNames to name of appWindow
    end repeat
  end repeat
  return windowNames as text
end tell
`
  const result = run('osascript', ['-e', script])
  if (result.status !== 0) return ''
  return result.stdout.trim()
}

async function waitForLaunch({ timeoutMs = 60000, excludePids = new Set() } = {}) {
  const startedAt = Date.now()
  let lastProcessMatch = ''
  let lastWindowMatch = ''

  while (Date.now() - startedAt < timeoutMs) {
    lastProcessMatch = findVirtualLibraryProcess(excludePids)
    lastWindowMatch = findVirtualLibraryWindow()

    if (lastProcessMatch && lastWindowMatch) {
      return {
        processMatch: lastProcessMatch,
        processPids: parsePids(lastProcessMatch),
        windowMatch: lastWindowMatch,
      }
    }

    await sleep(1000)
  }

  throw new Error([
    `Timed out waiting for the Virtual Library desktop window after ${timeoutMs}ms.`,
    lastProcessMatch ? `Process match:\n${lastProcessMatch}` : 'No process match found.',
    lastWindowMatch ? `Window match:\n${lastWindowMatch}` : 'No window match found.',
  ].join('\n'))
}

async function stopProcess(child) {
  if (!child || child.exitCode !== null) return
  child.kill('SIGINT')
  for (let index = 0; index < 10; index += 1) {
    if (child.exitCode !== null) return
    await sleep(500)
  }
  child.kill('SIGTERM')
}

function stopPids(pids) {
  pids.forEach((pid) => {
    try {
      process.kill(pid, 'SIGTERM')
    } catch {
      // Process may have already exited.
    }
  })
}

async function main() {
  if (process.platform !== 'darwin') {
    console.log('[desktop-launch-smoke] Skipping: macOS launch smoke only.')
    return
  }

  const npmCommand = commandForPlatform('npm')
  const existingPids = new Set(parsePids(findVirtualLibraryProcess()))
  let launchedPids = []
  const child = spawn(npmCommand, ['run', 'tauri', 'dev'], {
    cwd: rootDir,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  const recentOutput = []
  const capture = (chunk) => {
    const text = chunk.toString()
    process.stdout.write(text)
    recentOutput.push(text)
    if (recentOutput.length > 50) recentOutput.shift()
  }
  child.stdout.on('data', capture)
  child.stderr.on('data', capture)

  try {
    const result = await waitForLaunch({ excludePids: existingPids })
    launchedPids = result.processPids
    console.log(`[desktop-launch-smoke] Found process:\n${result.processMatch}`)
    console.log(`[desktop-launch-smoke] Found window: ${result.windowMatch}`)
  } catch (error) {
    console.error('[desktop-launch-smoke] Recent launch output:')
    console.error(recentOutput.join(''))
    throw error
  } finally {
    await stopProcess(child)
    stopPids(launchedPids)
  }
}

main().catch((error) => {
  console.error('[desktop-launch-smoke] Failed:', error?.stack || error?.message || error)
  process.exitCode = 1
})
