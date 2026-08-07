import type { ChatMessageItem, ActivityLogItem } from './types.js';

export interface TimelineEvent {
  id: string;
  timestamp: string;
  kind: 'system' | 'activity' | 'user' | 'ai';
  sender?: string;
  content: string;
  icon?: string;
  isStreaming?: boolean;
  thoughtBlock?: string;
  toolCard?: ChatMessageItem['toolCard'];
  fileEditCard?: ChatMessageItem['fileEditCard'];
  analysisBadge?: ChatMessageItem['analysisBadge'];
}

function parseTimeString(t: string): number {
  if (!t) return 0;
  const parts = t.split(':').map((p) => parseInt(p, 10));
  if (parts.length === 3 && !parts.some(Number.isNaN)) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

/**
 * Builds a timeline stream for human/system messages and activity logs.
 * Sorts messages and activity logs chronologically by timestamp.
 */
export function buildHumanTimeline(
  messages: ChatMessageItem[],
  activities: ActivityLogItem[] = []
): TimelineEvent[] {
  const timeline: TimelineEvent[] = [];

  for (const msg of messages) {
    if (msg.senderRole === 'ai') {
      continue;
    }

    if (msg.id.startsWith('sys-init') || msg.senderRole === 'system') {
      timeline.push({
        id: msg.id,
        timestamp: msg.timestamp,
        kind: 'system',
        content: msg.content,
      });
    } else {
      timeline.push({
        id: msg.id,
        timestamp: msg.timestamp,
        kind: 'user',
        sender: msg.sender,
        content: msg.content,
        icon: msg.icon,
      });
    }
  }

  for (const act of activities) {
    timeline.push({
      id: act.id,
      timestamp: act.timestamp,
      kind: 'activity',
      content: act.text,
    });
  }

  timeline.sort((a, b) => {
    const timeA = parseTimeString(a.timestamp);
    const timeB = parseTimeString(b.timestamp);
    if (timeA !== timeB) return timeA - timeB;
    return 0;
  });

  return timeline;
}
