import { describe, it, expect, vi } from 'vitest';
import { isSlashCommand, isAiPrompt, TmuxPromptRouter } from './tmux-prompt-router.js';
import { TmuxSession } from './tmux-session.js';

describe('TmuxPromptRouter & AI Tag Filter', () => {
  it('correctly identifies local slash commands vs AI prompts vs normal chat', () => {
    expect(isSlashCommand('/leave')).toBe(true);
    expect(isSlashCommand('/clear')).toBe(true);
    expect(isSlashCommand('/driver agy')).toBe(true);

    expect(isAiPrompt('hello')).toBe(false);
    expect(isAiPrompt('how are you')).toBe(false);
    expect(isAiPrompt('/leave')).toBe(false);

    expect(isAiPrompt('@agi fix this bug')).toBe(true);
    expect(isAiPrompt('@agy create a file')).toBe(true);
    expect(isAiPrompt('@gemini hello')).toBe(true);
    expect(isAiPrompt('/gemini hello')).toBe(true);
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

  it('does NOT forward normal chat messages or slash commands to the right pane', async () => {
    const mockSendPrompt = vi.fn().mockResolvedValue(undefined);
    const mockSession = {
      sendPrompt: mockSendPrompt,
    } as unknown as TmuxSession;

    const router = new TmuxPromptRouter('collagility-123', mockSession);

    const forwardedHello = await router.forwardPrompt('hello');
    const forwardedLeave = await router.forwardPrompt('/leave');
    const forwardedMode = await router.forwardPrompt('/mode auto');

    expect(forwardedHello).toBe(false);
    expect(forwardedLeave).toBe(false);
    expect(forwardedMode).toBe(false);
    expect(mockSendPrompt).not.toHaveBeenCalled();
  });

  it('forwards AI prompts tagged with @agi/@agy/@gemini to the right pane with stripped tag prefix', async () => {
    const mockSendPrompt = vi.fn().mockResolvedValue(undefined);
    const mockSession = {
      sendPrompt: mockSendPrompt,
    } as unknown as TmuxSession;

    const router = new TmuxPromptRouter('collagility-123', mockSession);

    const forwardedAgi = await router.forwardPrompt('@agi create a new file');
    const forwardedAgy = await router.forwardPrompt('@agy refactor function');

    expect(forwardedAgi).toBe(true);
    expect(mockSendPrompt).toHaveBeenNthCalledWith(1, 'collagility-123', 1, 'create a new file');

    expect(forwardedAgy).toBe(true);
    expect(mockSendPrompt).toHaveBeenNthCalledWith(2, 'collagility-123', 1, 'refactor function');
  });
});
