import { describe, it, expect, vi } from 'vitest';
import { isSlashCommand, TmuxPromptRouter } from './tmux-prompt-router.js';
import { TmuxSession } from './tmux-session.js';

describe('TmuxPromptRouter & Slash Command Filter', () => {
  it('correctly identifies local slash commands vs AI prompts', () => {
    expect(isSlashCommand('/leave')).toBe(true);
    expect(isSlashCommand('/clear')).toBe(true);
    expect(isSlashCommand('/driver agy')).toBe(true);
    expect(isSlashCommand('/mode auto')).toBe(true);
    expect(isSlashCommand('/help')).toBe(true);

    expect(isSlashCommand('write a test')).toBe(false);
    expect(isSlashCommand('@agi fix this bug')).toBe(false);
    expect(isSlashCommand('@gemini hello')).toBe(false);
    expect(isSlashCommand('/gemini hello')).toBe(false);
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

  it('does NOT forward slash commands to the right pane', async () => {
    const mockSendPrompt = vi.fn().mockResolvedValue(undefined);
    const mockSession = {
      sendPrompt: mockSendPrompt,
    } as unknown as TmuxSession;

    const router = new TmuxPromptRouter('collagility-123', mockSession);

    const forwardedLeave = await router.forwardPrompt('/leave');
    const forwardedClear = await router.forwardPrompt('/clear');
    const forwardedMode = await router.forwardPrompt('/mode auto');

    expect(forwardedLeave).toBe(false);
    expect(forwardedClear).toBe(false);
    expect(forwardedMode).toBe(false);
    expect(mockSendPrompt).not.toHaveBeenCalled();
  });

  it('forwards AI prompts to the right pane with stripped prefix', async () => {
    const mockSendPrompt = vi.fn().mockResolvedValue(undefined);
    const mockSession = {
      sendPrompt: mockSendPrompt,
    } as unknown as TmuxSession;

    const router = new TmuxPromptRouter('collagility-123', mockSession);

    const forwarded = await router.forwardPrompt('@agi create a new file');

    expect(forwarded).toBe(true);
    expect(mockSendPrompt).toHaveBeenCalledWith('collagility-123', 1, 'create a new file');
  });
});
