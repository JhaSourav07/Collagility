import { describe, it, expect, vi, afterEach } from 'vitest';
import * as childProcess from 'node:child_process';
import { checkTmuxAvailable } from './tmux-guard.js';

describe('checkTmuxAvailable', () => {
  const originalPlatform = process.platform;

  afterEach(() => {
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  function setPlatform(platform: string) {
    Object.defineProperty(process, 'platform', {
      value: platform,
      configurable: true,
    });
  }

  it('returns ok: false with WSL message on native Windows (win32)', async () => {
    setPlatform('win32');
    const result = await checkTmuxAvailable();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('WSL');
      expect(result.reason).toContain('https://learn.microsoft.com');
    }
  });

  it('returns ok: true on Linux when tmux is found', async () => {
    setPlatform('linux');
    vi.spyOn(childProcess, 'execFile').mockImplementation((_cmd: any, _args: any, callback: any) => {
      const cb = typeof _args === 'function' ? _args : callback;
      if (typeof cb === 'function') {
        cb(null, { stdout: 'tmux 3.3a', stderr: '' });
      }
      return {} as any;
    });

    const result = await checkTmuxAvailable();
    expect(result.ok).toBe(true);
  });

  it('returns ok: false with install message on Linux when tmux is missing', async () => {
    setPlatform('linux');
    vi.spyOn(childProcess, 'execFile').mockImplementation((_cmd: any, _args: any, callback: any) => {
      const cb = typeof _args === 'function' ? _args : callback;
      if (typeof cb === 'function') {
        cb(new Error('ENOENT'), { stdout: '', stderr: '' });
      }
      return {} as any;
    });

    const result = await checkTmuxAvailable();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('apt install tmux');
      expect(result.reason).toContain('brew install tmux');
    }
  });

  it('returns ok: true on macOS (darwin) when tmux is found', async () => {
    setPlatform('darwin');
    vi.spyOn(childProcess, 'execFile').mockImplementation((_cmd: any, _args: any, callback: any) => {
      const cb = typeof _args === 'function' ? _args : callback;
      if (typeof cb === 'function') {
        cb(null, { stdout: 'tmux 3.4', stderr: '' });
      }
      return {} as any;
    });

    const result = await checkTmuxAvailable();
    expect(result.ok).toBe(true);
  });
});
