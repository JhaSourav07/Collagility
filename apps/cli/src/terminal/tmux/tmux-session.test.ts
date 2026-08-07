import { describe, it, expect, vi } from 'vitest';
import { TmuxSession, type ExecFileFunction } from './tmux-session.js';

describe('TmuxSession', () => {
  it('sessionExists returns true when tmux has-session succeeds', async () => {
    const mockExecFile = vi.fn().mockResolvedValue({ stdout: '', stderr: '' });
    const session = new TmuxSession(mockExecFile);

    const exists = await session.sessionExists('demo-session');

    expect(exists).toBe(true);
    expect(mockExecFile).toHaveBeenCalledWith('tmux', ['has-session', '-t', 'demo-session']);
  });

  it('sessionExists returns false when tmux has-session fails', async () => {
    const mockExecFile = vi.fn().mockRejectedValue(new Error('can\'t find session demo-session'));
    const session = new TmuxSession(mockExecFile);

    const exists = await session.sessionExists('demo-session');

    expect(exists).toBe(false);
    expect(mockExecFile).toHaveBeenCalledWith('tmux', ['has-session', '-t', 'demo-session']);
  });

  it('createSplitSession executes correct new-session, split-window with -d, history-limit, mouse on, and clean status line options', async () => {
    const mockExecFile = vi.fn().mockResolvedValue({ stdout: '', stderr: '' });
    const session = new TmuxSession(mockExecFile);

    await session.createSplitSession(
      'collagility-123',
      ['collagility', 'start', '--internal-pane'],
      ['agy', '--mode', 'code'],
      65
    );

    expect(mockExecFile).toHaveBeenNthCalledWith(1, 'tmux', [
      'new-session',
      '-d',
      '-s',
      'collagility-123',
      'collagility',
      'start',
      '--internal-pane',
    ]);

    expect(mockExecFile).toHaveBeenNthCalledWith(2, 'tmux', [
      'split-window',
      '-d',
      '-h',
      '-t',
      'collagility-123',
      '-p',
      '65',
      'agy',
      '--mode',
      'code',
    ]);

    expect(mockExecFile).toHaveBeenNthCalledWith(3, 'tmux', [
      'set-option',
      '-t',
      'collagility-123',
      'remain-on-exit',
      'on',
    ]);

    expect(mockExecFile).toHaveBeenNthCalledWith(4, 'tmux', [
      'set-option',
      '-t',
      'collagility-123',
      'history-limit',
      '50000',
    ]);

    expect(mockExecFile).toHaveBeenNthCalledWith(5, 'tmux', [
      'set-option',
      '-t',
      'collagility-123',
      'mouse',
      'on',
    ]);

    expect(mockExecFile).toHaveBeenNthCalledWith(6, 'tmux', [
      'set-option',
      '-t',
      'collagility-123',
      'status-left',
      ' ⚡ COLLAGILITY ',
    ]);

    expect(mockExecFile).toHaveBeenNthCalledWith(7, 'tmux', [
      'set-option',
      '-t',
      'collagility-123',
      'status-right',
      ' Ctrl+B D to detach ',
    ]);
  });

  it('attach calls spawn with attach-session, stdio inherit and resolves with exit code', async () => {
    const mockExecFile = vi.fn().mockResolvedValue({ stdout: '', stderr: '' });
    const listeners: Record<string, (arg?: any) => void> = {};
    const mockChildProcess = {
      on: vi.fn((event: string, cb: (arg?: any) => void) => {
        listeners[event] = cb;
      }),
    };
    const mockSpawn = vi.fn().mockReturnValue(mockChildProcess);
    const session = new TmuxSession(mockExecFile, mockSpawn as any);

    const attachPromise = session.attach('collagility-123');

    expect(mockSpawn).toHaveBeenCalledWith('tmux', ['attach-session', '-t', 'collagility-123'], {
      stdio: 'inherit',
    });

    if (listeners['exit']) {
      listeners['exit'](0);
    }

    const exitCode = await attachPromise;
    expect(exitCode).toBe(0);
  });

  it('attach promise rejects on spawn error', async () => {
    const mockExecFile = vi.fn().mockResolvedValue({ stdout: '', stderr: '' });
    const listeners: Record<string, (arg?: any) => void> = {};
    const mockChildProcess = {
      on: vi.fn((event: string, cb: (arg?: any) => void) => {
        listeners[event] = cb;
      }),
    };
    const mockSpawn = vi.fn().mockReturnValue(mockChildProcess);
    const session = new TmuxSession(mockExecFile, mockSpawn as any);

    const attachPromise = session.attach('collagility-123');

    if (listeners['error']) {
      listeners['error'](new Error('ENOENT: tmux not found'));
    }

    await expect(attachPromise).rejects.toThrow('ENOENT: tmux not found');
  });

  it('sendKeys formats pane target and appends Enter', async () => {
    const mockExecFile = vi.fn().mockResolvedValue({ stdout: '', stderr: '' });
    const session = new TmuxSession(mockExecFile);

    await session.sendKeys('collagility-123', 1, 'y');

    expect(mockExecFile).toHaveBeenCalledWith('tmux', [
      'send-keys',
      '-t',
      'collagility-123.1',
      'y',
      'Enter',
    ]);
  });

  it('sendPrompt executes literal -l text send-keys followed by separate Enter send-keys in order', async () => {
    const mockExecFile = vi.fn().mockResolvedValue({ stdout: '', stderr: '' });
    const session = new TmuxSession(mockExecFile);

    await session.sendPrompt('collagility-123', 1, 'explain PageUp/PageDown');

    expect(mockExecFile).toHaveBeenNthCalledWith(1, 'tmux', [
      'send-keys',
      '-t',
      'collagility-123.1',
      '-l',
      'explain PageUp/PageDown',
    ]);

    expect(mockExecFile).toHaveBeenNthCalledWith(2, 'tmux', [
      'send-keys',
      '-t',
      'collagility-123.1',
      'Enter',
    ]);
  });

  it('pipePane formats pipe-pane argument array correctly', async () => {
    const mockExecFile = vi.fn().mockResolvedValue({ stdout: '', stderr: '' });
    const session = new TmuxSession(mockExecFile);

    await session.pipePane('collagility-123', 0, '/tmp/pane0.log');

    expect(mockExecFile).toHaveBeenCalledWith('tmux', [
      'pipe-pane',
      '-t',
      'collagility-123.0',
      '-O',
      'cat >> /tmp/pane0.log',
    ]);
  });

  it('killSession executes kill-session arguments', async () => {
    const mockExecFile = vi.fn().mockResolvedValue({ stdout: '', stderr: '' });
    const session = new TmuxSession(mockExecFile);

    await session.killSession('collagility-123');

    expect(mockExecFile).toHaveBeenCalledWith('tmux', ['kill-session', '-t', 'collagility-123']);
  });

  it('rejects with stderr details when tmux execFile fails', async () => {
    const mockExecFile: ExecFileFunction = vi.fn().mockRejectedValue({
      message: 'Command failed',
      stderr: 'no server running on /tmp/tmux-1000/default',
    });
    const session = new TmuxSession(mockExecFile);

    await expect(session.killSession('non-existent')).rejects.toThrow(
      "tmux command failed ['tmux kill-session -t non-existent']: tmux stderr: no server running on /tmp/tmux-1000/default"
    );
  });
});
