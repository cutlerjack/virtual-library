import { describe, expect, it, vi } from 'vitest'
import { runDesktopVerify, selectDesktopVerifyScript } from './desktop-verify.mjs'

describe('desktop verification platform dispatch', () => {
  it('selects the platform-specific desktop smoke command', () => {
    expect(selectDesktopVerifyScript('darwin')).toBe('test:desktop-launch')
    expect(selectDesktopVerifyScript('linux')).toBe('test:desktop-e2e')
    expect(selectDesktopVerifyScript('win32')).toBeNull()
  })

  it('fails unsupported platforms unless the skip is explicit', () => {
    const runScript = vi.fn()
    const log = vi.fn()
    const error = vi.fn()
    const fail = vi.fn()

    expect(runDesktopVerify({
      platform: 'win32',
      env: {},
      runScript,
      log,
      error,
      fail,
    })).toBeNull()

    expect(runScript).not.toHaveBeenCalled()
    expect(log).not.toHaveBeenCalled()
    expect(error).toHaveBeenCalledWith(expect.stringContaining('Unsupported platform win32'))
    expect(fail).toHaveBeenCalledWith(1)
  })

  it('allows unsupported-platform skips only with an explicit opt-out', () => {
    const runScript = vi.fn()
    const log = vi.fn()
    const error = vi.fn()
    const fail = vi.fn()

    expect(runDesktopVerify({
      platform: 'win32',
      env: { DESKTOP_VERIFY_ALLOW_SKIP: '1' },
      runScript,
      log,
      error,
      fail,
    })).toBeNull()

    expect(runScript).not.toHaveBeenCalled()
    expect(log).toHaveBeenCalledWith('[desktop-verify] Skipping desktop verification on win32.')
    expect(error).not.toHaveBeenCalled()
    expect(fail).not.toHaveBeenCalled()
  })
})
