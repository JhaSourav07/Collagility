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

  it('createSplitSession executes correct new-session and split-window argument arrays', async () => {
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
      '-h',
      '-t',
      'collagility-123',
      '-p',
      '65',
      'agy',
      '--mode',
      'code',
    ]);
  });

  it('attach executes correct attach-session arguments', async () => {
    const mockExecFile = vi.fn().mockResolvedValue({ stdout: '', stderr: '' });
    const session = new TmuxSession(mockExecFile);

    await session.attach('collagility-123');

    expect(mockExecFile).toHaveBeenCalledWith('tmux', ['attach-session', '-t', 'collagility-123']);
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

    await expect(session.attach('non-existent')).rejects.toThrow(
      "tmux command failed ['tmux attach-session -t non-existent']: tmux stderr: no server running on /tmp/tmux-1000/default"
    );
  });
});
