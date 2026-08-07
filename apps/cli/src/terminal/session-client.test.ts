import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { SessionClientStreamHandler } from './session-client.js';

describe('SessionClientStreamHandler Unit & Regression Tests', () => {
  let mockWsClient: EventEmitter;

  beforeEach(() => {
    mockWsClient = new EventEmitter();
  });

  it('should process new terminal.pty.frame events into PtyScreenBuffer without corrupting state', async () => {
    const ptyUpdates: string[][] = [];
    const handler = new SessionClientStreamHandler({
      sessionId: 'sess-join-pty-1',
      wsClient: mockWsClient,
      onPtyUpdateScreen: (lines) => ptyUpdates.push(lines),
    });

    // Emit new terminal.pty.frame event over mock WebSocket
    mockWsClient.emit('terminal.pty.frame', {
      sessionId: 'sess-join-pty-1',
      data: '\x1b[32m[PTY HOST]\x1b[0m Interactive terminal ready\r\n',
      cols: 80,
      rows: 24,
    });

    // Allow async @xterm/headless buffer processing
    await new Promise((r) => setTimeout(r, 20));

    expect(handler.hasPtyData()).toBe(true);
    const ptyLines = handler.getPtyScreenLines();
    expect(ptyLines[0].trimEnd()).toBe('[PTY HOST] Interactive terminal ready');
  });

  it('should preserve existing terminal.screen.stream and stream chunk handling (explicit regression test)', () => {
    const screenUpdates: string[] = [];
    const handler = new SessionClientStreamHandler({
      sessionId: 'sess-legacy-1',
      wsClient: mockWsClient,
      onUpdateScreen: (screenData) => screenUpdates.push(screenData),
    });

    // 1. Emit legacy terminal.screen.stream event
    mockWsClient.emit('terminal.screen.stream', {
      sessionId: 'sess-legacy-1',
      data: 'Legacy raw stdout line 1',
    });

    expect(handler.getFormattedScreenData()).toBe('Legacy raw stdout line 1');
    expect(screenUpdates).toContain('Legacy raw stdout line 1');

    // 2. Emit session.stream.broadcast chunk event
    mockWsClient.emit('session.stream.broadcast', {
      sessionId: 'sess-legacy-1',
      chunk: {
        id: 'chunk-1',
        type: 'TEXT',
        content: 'Broadcast AI response chunk',
        timestamp: Date.now(),
      },
    });

    expect(handler.getFormattedScreenData()).toContain('Broadcast AI response chunk');
    expect(handler.getFormattedScreenData()).toContain('Legacy raw stdout line 1');

    // 3. Verify clearing session client handler
    handler.clear();
    expect(handler.getFormattedScreenData()).toBe('');
  });
});
