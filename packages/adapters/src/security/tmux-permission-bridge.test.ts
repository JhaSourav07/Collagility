import { describe, it, expect, vi } from 'vitest';
import { AntigravityAIAdapter } from '../antigravity/antigravity-adapter.js';

describe('Tmux Permission Bridge & Risk Evaluator Integration', () => {
  it('auto mode triggers sendKeys call automatically for a LOW-risk action', async () => {
    const adapter = new AntigravityAIAdapter({ mockMode: true });
    adapter.setSecurityMode('auto');

    const mockSendKeys = vi.fn().mockResolvedValue(undefined);
    adapter.setTmuxSession('collagility-test-session', mockSendKeys);

    const decision = await adapter.interceptCommandPermission('view_file', 'cat README.md');

    expect(decision).toBe('allow-once');
    expect(mockSendKeys).toHaveBeenCalledWith('collagility-test-session', 1, 'y');
  });

  it('manual mode does not trigger sendKeys call automatically when intercepting permission', async () => {
    const adapter = new AntigravityAIAdapter({ mockMode: true });
    adapter.setSecurityMode('manual');

    const mockSendKeys = vi.fn().mockResolvedValue(undefined);
    adapter.setTmuxSession('collagility-test-session', mockSendKeys);

    let permId = '';
    adapter.on('PERMISSION_REQUIRED', (evt) => {
      permId = evt.payload.id;
    });

    const permPromise = adapter.interceptCommandPermission('run_command', 'npm install');

    await new Promise((r) => setTimeout(r, 10));

    expect(permId).toBeTruthy();
    expect(mockSendKeys).not.toHaveBeenCalled();

    adapter.resolvePermission(permId, 'deny');
    await expect(permPromise).rejects.toThrow();
  });

  it('simulated remote-approval message resolves permission and triggers local sendKeys call', async () => {
    const adapter = new AntigravityAIAdapter({ mockMode: true });
    adapter.setSecurityMode('manual');

    const mockSendKeys = vi.fn().mockResolvedValue(undefined);
    adapter.setTmuxSession('collagility-test-session', mockSendKeys);

    let permId = '';
    adapter.on('PERMISSION_REQUIRED', (evt) => {
      permId = evt.payload.id;
    });

    const permPromise = adapter.interceptCommandPermission('run_command', 'pnpm test');

    await new Promise((r) => setTimeout(r, 10));

    expect(permId).toBeTruthy();
    expect(mockSendKeys).not.toHaveBeenCalled();

    // Simulate WebSocket approval arriving from remote collaborator
    const resolved = adapter.resolvePermission(permId, 'allow-once');
    expect(resolved).toBe(true);

    const decision = await permPromise;
    expect(decision).toBe('allow-once');

    // Local sendKeys call triggered on behalf of remote collaborator
    expect(mockSendKeys).toHaveBeenCalledWith('collagility-test-session', 1, 'y');
  });
});
