import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

function commandForPlatform(base) {
  return process.platform === 'win32' ? `${base}.cmd` : base
}

export function runNpmScript(scriptName) {
  const result = spawnSync(commandForPlatform('npm'), ['run', scriptName], {
    stdio: 'inherit',
  })
  if (result.status !== 0) {
    process.exitCode = result.status || 1
  }
}

export function selectDesktopVerifyScript(platform) {
  if (platform === 'darwin') return 'test:desktop-launch'
  if (platform === 'linux') return 'test:desktop-e2e'
  return null
}

export function runDesktopVerify({
  platform = process.platform,
  env = process.env,
  runScript = runNpmScript,
  log = console.log,
  error = console.error,
  fail = (code) => {
    process.exitCode = code
  },
} = {}) {
  const scriptName = selectDesktopVerifyScript(platform)
  if (scriptName) {
    runScript(scriptName)
    return scriptName
  }

  if (env.DESKTOP_VERIFY_ALLOW_SKIP === '1') {
    log(`[desktop-verify] Skipping desktop verification on ${platform}.`)
    return null
  }

  error(
    `[desktop-verify] Unsupported platform ${platform}; set DESKTOP_VERIFY_ALLOW_SKIP=1 to skip explicitly.`
  )
  fail(1)
  return null
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runDesktopVerify()
}
