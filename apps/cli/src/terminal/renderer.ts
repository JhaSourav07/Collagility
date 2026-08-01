import { colors } from './colors.js';

export interface ChatRenderMessage {
  id?: string;
  timestamp: number;
  senderId: string;
  senderName?: string;
  senderRole?: 'owner' | 'member' | 'system' | 'ai';
  text: string;
  isSelf?: boolean;
}

export class TerminalRenderer {
  public static formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return colors.dim(`[${hours}:${minutes}:${seconds}]`);
  }

  public static formatSender(name: string, role?: string, isSelf = false): string {
    const displayName = isSelf ? `${name} (You)` : name;
    if (role === 'owner') {
      return colors.warning(colors.bold(displayName));
    }
    if (role === 'ai') {
      return colors.accent(colors.bold(displayName));
    }
    if (role === 'system') {
      return colors.dim(`[System]`);
    }
    return colors.cyan(colors.bold(displayName));
  }

  public static renderChatMessage(msg: ChatRenderMessage): string {
    const time = this.formatTimestamp(msg.timestamp);
    const sender = this.formatSender(msg.senderName || msg.senderId, msg.senderRole, msg.isSelf);
    const text = msg.isSelf ? colors.bold(msg.text) : msg.text;

    return `${time} ${sender}: ${text}`;
  }

  public static renderSystemMessage(message: string, timestamp = Date.now()): string {
    const time = this.formatTimestamp(timestamp);
    return `${time} ${colors.dim('[System]')} ${colors.cyan(message)}`;
  }

  public static renderErrorMessage(error: string, timestamp = Date.now()): string {
    const time = this.formatTimestamp(timestamp);
    return `${time} ${colors.symbolError} ${colors.error(error)}`;
  }

  public static renderTypingIndicator(senderName: string): string {
    return colors.dim(`\n... ${senderName} is typing...`);
  }
}

export function renderSessionHeader(sessionId: string, isOwner: boolean, memberCount: number): string {
  const badge = isOwner ? colors.badgeOwner : colors.badgeMember;
  return [
    '',
    colors.dim('┌─────────────────────────────────────────────────────────────┐'),
    `│ ${colors.bold('Active Session:')} ${colors.code(sessionId)} ${badge}          │`,
    `│ ${colors.dim('Members:')} ${colors.bold(String(memberCount))} | ${colors.dim('Toggle Thinking:')} ${colors.cyan('Ctrl+O')}              │`,
    colors.dim('└─────────────────────────────────────────────────────────────┘'),
    '',
  ].join('\n');
}

export function renderMemberList(members: string[], ownerId: string): string {
  const lines = [colors.bold('Session Members:')];
  for (const member of members) {
    const isOwner = member === ownerId;
    const label = isOwner ? `${member} ${colors.dim('(Owner)')}` : member;
    lines.push(`  • ${colors.cyan(label)}`);
  }
  return lines.join('\n');
}
