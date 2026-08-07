import { describe, it, expect } from 'vitest';
import { buildHumanTimeline } from './timeline.js';
import type { ChatMessageItem, ActivityLogItem } from './types.js';

describe('buildHumanTimeline', () => {
  it('handles empty input gracefully', () => {
    const result = buildHumanTimeline([], []);
    expect(result).toEqual([]);
  });

  it('filters out AI messages and includes user, system, and activity items in order', () => {
    const messages: ChatMessageItem[] = [
      {
        id: 'sys-init-1',
        timestamp: '10:00:00',
        sender: 'System',
        senderRole: 'system',
        content: 'Session started',
      },
      {
        id: 'msg-1',
        timestamp: '10:00:05',
        sender: 'Sourav',
        senderRole: 'user',
        content: 'Hello world',
        icon: '💬',
      },
      {
        id: 'msg-ai-1',
        timestamp: '10:00:10',
        sender: 'Gemini',
        senderRole: 'ai',
        content: 'AI response',
      },
      {
        id: 'msg-2',
        timestamp: '10:00:15',
        sender: 'Alex',
        senderRole: 'user',
        content: 'Hey Sourav',
      },
    ];

    const activities: ActivityLogItem[] = [
      {
        id: 'act-1',
        timestamp: '10:00:02',
        text: 'Alex joined',
        type: 'join',
      },
    ];

    const timeline = buildHumanTimeline(messages, activities);

    // AI message msg-ai-1 must be filtered out, items sorted by timestamp
    expect(timeline).toHaveLength(4);
    expect(timeline.map((e) => e.id)).toEqual(['sys-init-1', 'act-1', 'msg-1', 'msg-2']);

    expect(timeline[0]).toEqual({
      id: 'sys-init-1',
      timestamp: '10:00:00',
      kind: 'system',
      content: 'Session started',
    });

    expect(timeline[1]).toEqual({
      id: 'act-1',
      timestamp: '10:00:02',
      kind: 'activity',
      content: 'Alex joined',
    });

    expect(timeline[2]).toEqual({
      id: 'msg-1',
      timestamp: '10:00:05',
      kind: 'user',
      sender: 'Sourav',
      content: 'Hello world',
      icon: '💬',
    });

    expect(timeline[3]).toEqual({
      id: 'msg-2',
      timestamp: '10:00:15',
      kind: 'user',
      sender: 'Alex',
      content: 'Hey Sourav',
      icon: undefined,
    });
  });
});
