import { colors } from './colors.js';

export function renderSessionHeader(sessionId: string, isOwner: boolean, memberCount: number): string {
  const badge = isOwner ? colors.badgeOwner : colors.badgeMember;
  return [
    '',
    colors.dim('┌─────────────────────────────────────────────────────────────┐'),
    `│ ${colors.bold('Active Session:')} ${colors.code(sessionId)} ${badge}          │`,
    `│ ${colors.dim('Members:')} ${colors.bold(String(memberCount))}                                             │`,
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
