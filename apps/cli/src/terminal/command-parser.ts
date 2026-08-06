import type { SecurityMode } from '@collagility/protocol';
import type { OverlayType } from './ink/types.js';

export type ParsedCLIInput =
  | { type: 'ai'; prompt: string; adapterName: string }
  | { type: 'mode'; targetMode?: SecurityMode }
  | { type: 'overlay'; target: OverlayType; sessionId?: string }
  | { type: 'action'; action: 'clear' | 'rewind' | 'fork' | 'help' | 'leave'; steps?: number }
  | { type: 'chat'; text: string };

export function parseCLIInput(rawInput: string): ParsedCLIInput {
  const trimmed = rawInput.trim();

  // Match /config or /settings
  if (trimmed === '/config' || trimmed === '/settings') {
    return { type: 'overlay', target: 'config' };
  }

  // Match /permissions
  if (trimmed === '/permissions') {
    return { type: 'overlay', target: 'permissions' };
  }

  // Match /agents
  if (trimmed === '/agents') {
    return { type: 'overlay', target: 'agents' };
  }

  // Match /resume [sessionId]
  if (trimmed.startsWith('/resume')) {
    const parts = trimmed.split(/\s+/);
    const sessionId = parts[1];
    return { type: 'overlay', target: 'resume', sessionId };
  }

  // Match /mcp
  if (trimmed === '/mcp') {
    return { type: 'overlay', target: 'mcp' };
  }

  // Match /fork
  if (trimmed === '/fork') {
    return { type: 'action', action: 'fork' };
  }

  // Match /rewind [steps] or /undo [steps]
  if (trimmed.startsWith('/rewind') || trimmed.startsWith('/undo')) {
    const parts = trimmed.split(/\s+/);
    const num = parseInt(parts[1], 10);
    const steps = isNaN(num) || num < 1 ? 1 : num;
    return { type: 'action', action: 'rewind', steps };
  }

  // Match /clear
  if (trimmed === '/clear') {
    return { type: 'action', action: 'clear' };
  }

  // Match /help
  if (trimmed === '/help') {
    return { type: 'action', action: 'help' };
  }

  // Match /leave
  if (trimmed === '/leave') {
    return { type: 'action', action: 'leave' };
  }

  // Match /mode [manual|accept-edits|accept|plan-only|plan|auto]
  if (trimmed.startsWith('/mode')) {
    const parts = trimmed.split(/\s+/);
    const arg = parts[1]?.toLowerCase();
    let targetMode: SecurityMode | undefined;
    if (
      arg === 'manual' ||
      arg === 'accept-edits' ||
      arg === 'accept' ||
      arg === 'plan-only' ||
      arg === 'plan' ||
      arg === 'auto'
    ) {
      if (arg === 'accept') targetMode = 'accept-edits';
      else if (arg === 'plan') targetMode = 'plan-only';
      else targetMode = arg as SecurityMode;
    }
    return { type: 'mode', targetMode };
  }

  // Match @agi <prompt>, @agy <prompt>, @antigravity <prompt>, @gemini <prompt>, @ai <prompt>, or any @<tag> <prompt>
  const aiMatch = trimmed.match(/^@([a-zA-Z0-9_-]+)\s+(.+)$/i);
  if (aiMatch) {
    const rawTag = aiMatch[1].toLowerCase();
    const adapterName = rawTag === 'ai' ? 'gemini' : rawTag;
    return {
      type: 'ai',
      adapterName,
      prompt: aiMatch[2].trim(),
    };
  }

  return {
    type: 'chat',
    text: trimmed,
  };
}
