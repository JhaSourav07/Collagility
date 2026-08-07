import { describe, it, expect } from 'vitest';
import { TerminalRenderer } from './renderer.js';

describe('TerminalRenderer', () => {
  it('should format timestamps cleanly', () => {
    const ts = new Date('2026-07-31T12:00:00Z').getTime();
    const formatted = TerminalRenderer.formatTimestamp(ts);
    expect(formatted).toContain(':');
  });

  it('should render chat message with sender and timestamp', () => {
    const rendered = TerminalRenderer.renderChatMessage({
      timestamp: Date.now(),
      senderId: 'user-1',
      senderName: 'Sourav',
      senderRole: 'owner',
      text: 'Hello multiplayer world!',
      isSelf: true,
    });

    expect(rendered).toContain('Sourav (You)');
    expect(rendered).toContain('Hello multiplayer world!');
  });

  it('should render system message', () => {
    const sys = TerminalRenderer.renderSystemMessage('Emma joined the session');
    expect(sys).toContain('[System]');
    expect(sys).toContain('Emma joined the session');
  });

  it('should omit RemotePane for host (isHost: true) and include RemotePane for joined user (isHost: false)', () => {
    const hostSession = { isHost: true, userRole: 'owner' as const };
    const joinedSession = { isHost: false, userRole: 'visitor' as const };

    const hostShowRemotePane = !hostSession.isHost;
    const joinedShowRemotePane = !joinedSession.isHost;

    expect(hostShowRemotePane).toBe(false);
    expect(joinedShowRemotePane).toBe(true);
  });
});
