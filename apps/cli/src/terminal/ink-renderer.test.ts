import { describe, it, expect } from 'vitest';
import { InkTerminalRenderer } from './ink-renderer.js';

describe('InkTerminalRenderer', () => {
  it('should initialize with owner session role', () => {
    const renderer = new InkTerminalRenderer({
      sessionId: 'blue-hawk',
      isOwner: true,
      ownerName: 'Sourav',
      aiDriverName: 'Gemini CLI',
      aiModel: 'gemini-2.5-pro',
    });

    expect(renderer).toBeDefined();
  });

  it('should initialize with visitor session role', () => {
    const renderer = new InkTerminalRenderer({
      sessionId: 'blue-hawk',
      isOwner: false,
      ownerName: 'Alex',
    });

    expect(renderer).toBeDefined();
  });

  it('should support updating session info, users, and adding chat messages', () => {
    const renderer = new InkTerminalRenderer({
      sessionId: 'blue-hawk',
      isOwner: true,
    });

    renderer.setSessionInfo('blue-hawk', true, 'Sourav', [
      { name: 'Sourav', isOwner: true, isSelf: true },
      { name: 'Alex' },
      { name: 'Emma' },
    ]);

    renderer.appendMessage({
      sender: 'Alex',
      senderRole: 'user',
      content: 'Hey, can we refactor auth?',
    });

    renderer.appendActivity('Alex joined', 'join');
    renderer.appendActivity('Alex left', 'leave');

    expect(renderer).toBeDefined();
  });

  it('should accept and store incoming remote terminal screen data and dimensions', () => {
    const renderer = new InkTerminalRenderer({
      sessionId: 'test-session',
      isOwner: false,
    });

    const ansiData = '\x1b[32m[agy]\x1b[0m Running build task...\n✓ Done in 1.2s';
    renderer.setRemoteTerminalScreen(ansiData, 100, 30);

    const screenState = renderer.getRemoteTerminalScreen();
    expect(screenState.data).toBe(ansiData);
    expect(screenState.cols).toBe(100);
    expect(screenState.rows).toBe(30);
  });
});
