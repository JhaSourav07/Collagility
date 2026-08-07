import { TmuxSession } from './tmux-session.js';

export function isSlashCommand(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed.startsWith('/')) return false;
  if (trimmed.toLowerCase().startsWith('/gemini')) return false;
  return true;
}

export class TmuxPromptRouter {
  private tmuxSession: TmuxSession;
  private sessionName: string;

  constructor(sessionName: string, tmuxSession = new TmuxSession()) {
    this.sessionName = sessionName;
    this.tmuxSession = tmuxSession;
  }

  public async forwardPrompt(input: string): Promise<boolean> {
    if (isSlashCommand(input)) {
      return false;
    }

    const trimmed = input.trim();
    if (!trimmed) return false;

    const cleanPrompt = trimmed.replace(/^(@agi|@agy|@gemini|\/gemini)\s*/i, '') || trimmed;

    await this.tmuxSession.sendPrompt(this.sessionName, 1, cleanPrompt);
    return true;
  }
}
