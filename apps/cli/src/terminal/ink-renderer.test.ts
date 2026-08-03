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
});
