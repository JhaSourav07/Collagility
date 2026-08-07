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

/**
 * Builds a timeline stream for human/system messages and activity logs.
 * Filters out AI driver messages (which are rendered separately in PTY/stream views).
 */
export function buildHumanTimeline(
  messages: ChatMessageItem[],
  activities: ActivityLogItem[] = []
): TimelineEvent[] {
  const timeline: TimelineEvent[] = [];

  for (const msg of messages) {
    if (msg.senderRole === 'ai') {
      // Filter out AI messages from human timeline
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

  return timeline;
}
