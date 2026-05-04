import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const command = process.platform === 'win32'
  ? resolve(rootDir, 'node_modules', '.bin', 'playwright.cmd')
  : resolve(rootDir, 'node_modules', '.bin', 'playwright')
const env = { ...process.env }

if (env.NO_COLOR) {
  delete env.NO_COLOR
}

const child = spawn(command, ['test', ...process.argv.slice(2)], {
  cwd: rootDir,
  env,
  stdio: 'inherit',
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 1)
})

child.on('error', (error) => {
  console.error('[playwright-test] Failed to start Playwright:', error?.message || error)
  process.exit(1)
})
