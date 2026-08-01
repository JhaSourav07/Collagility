import readline from 'node:readline';
import fs from 'node:fs';
import type { WebSocketClient } from '../client/ws-client.js';
import { parseCLIInput } from './command-parser.js';
import { TerminalRenderer } from './renderer.js';
import type { TerminalStreamRenderer } from './terminal-stream-renderer.js';

export interface InteractiveContext {
  type: 'question' | 'plan' | 'selection' | 'confirmation' | 'tool';
  id: string;
  streamId: string;
  filePath?: string;
  options?: string[];
}

export class ChatPrompt {
  private rl: readline.Interface | null = null;
  private client: WebSocketClient;
  private isOwner: boolean;
  private active = false;
  private pendingContext: InteractiveContext | null = null;
  private streamRenderer: TerminalStreamRenderer | null = null;

  constructor(client: WebSocketClient, isOwner: boolean = true) {
    this.client = client;
    this.isOwner = isOwner;
  }

  public setIsOwner(isOwner: boolean): void {
    this.isOwner = isOwner;
  }

  public setStreamRenderer(renderer: TerminalStreamRenderer | null): void {
    this.streamRenderer = renderer;
  }

  public setInteractiveContext(context: InteractiveContext | null): void {
    // Preserve filePath if updating from plan to question
    if (this.pendingContext?.filePath && context && !context.filePath) {
      context.filePath = this.pendingContext.filePath;
    }
    this.pendingContext = context;
  }

  public hasPendingContext(): boolean {
    return this.pendingContext !== null;
  }

  public start(): void {
    if (this.active) return;
    this.active = true;

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '> ',
    });

    this.rl.prompt();

    // Listen for Ctrl+O (\x0f) to toggle thinking collapse
    if (process.stdin.isTTY) {
      readline.emitKeypressEvents(process.stdin);
      if (process.stdin.setRawMode) {
        process.stdin.setRawMode(true);
      }
      process.stdin.on('keypress', (str, key) => {
        if (key && key.ctrl && key.name === 'o') {
          if (this.streamRenderer) {
            const isCollapsed = this.streamRenderer.toggleThinkingCollapse();
            this.printAbovePrompt(TerminalRenderer.renderSystemMessage(`Thinking view toggled: ${isCollapsed ? 'Collapsed' : 'Expanded'}`));
          }
        }
      });
    }

    this.rl.on('line', (line: string) => {
      const trimmed = line.trim();

      try {
        if (this.pendingContext && trimmed.length > 0) {
          if (!this.isOwner) {
            this.printAbovePrompt(TerminalRenderer.renderSystemMessage('Only the session owner can respond to AI prompts.'));
          } else {
            const ctx = this.pendingContext;
            const key = trimmed.toLowerCase();

            // Support Read Plan ('r') across plan and question contexts if plan filePath is present
            if (key === 'r' || key === 'read' || key === 'view') {
              if (ctx.filePath) {
                try {
                  const cleanPath = ctx.filePath.trim().replace(/^.*?\((?:file:\/\/)?/, '').replace(/\)$/, '').replace(/^file:\/\//, '');
                  if (fs.existsSync(cleanPath)) {
                    const content = fs.readFileSync(cleanPath, 'utf-8');
                    this.printAbovePrompt(TerminalRenderer.renderSystemMessage(`[PLAN ARTIFACT CONTENT]:\n\n${content}`));
                  } else {
                    this.printAbovePrompt(TerminalRenderer.renderSystemMessage(`Plan file not found at ${cleanPath}`));
                  }
                } catch (e) {
                  this.printAbovePrompt(TerminalRenderer.renderSystemMessage(`Failed to read plan file: ${e}`));
                }
              } else {
                this.printAbovePrompt(TerminalRenderer.renderSystemMessage('Plan details rendered above. Type y to Accept or n to Reject.'));
              }
              // Keep interactive context active after reading plan
            } else if (ctx.type === 'plan') {
              if (key === 'n' || key === 'no' || key === 'reject' || key === '2') {
                this.pendingContext = null;
                this.client.send('ai.plan.reject', { planId: ctx.id, streamId: ctx.streamId, reason: 'Rejected by owner' });
                this.printAbovePrompt(TerminalRenderer.renderSystemMessage('Plan rejected. Type `@agy <feedback>` to revise.'));
              } else {
                this.pendingContext = null;
                this.client.send('ai.plan.approve', { planId: ctx.id, streamId: ctx.streamId });
                this.client.sendAIPrompt('Proceed with the implementation plan.', 'agy');
              }
            } else if (ctx.type === 'question') {
              this.pendingContext = null;
              if (key === 'y' || key === 'accept' || key === 'yes' || key === '1') {
                this.client.send('ai.answer', { questionId: ctx.id, streamId: ctx.streamId, answer: 'Proceed with default recommended plan' });
                this.client.sendAIPrompt('Proceed with the recommended Astro Starlight framework plan.', 'agy');
              } else if (key === 'n' || key === 'no' || key === 'reject' || key === '2') {
                this.client.send('ai.answer', { questionId: ctx.id, streamId: ctx.streamId, answer: 'Modify plan' });
                this.printAbovePrompt(TerminalRenderer.renderSystemMessage('Type `@agy <feedback>` to modify plan preferences.'));
              } else {
                this.client.send('ai.answer', { questionId: ctx.id, streamId: ctx.streamId, answer: trimmed });
                this.client.sendAIPrompt(trimmed, 'agy');
              }
            } else if (ctx.type === 'tool') {
              this.pendingContext = null;
              if (key === 'n' || key === 'no' || key === 'reject') {
                this.client.send('ai.tool.rejected', { toolId: ctx.id, streamId: ctx.streamId, reason: 'Rejected by owner' });
              } else {
                this.client.send('ai.tool.approved', { toolId: ctx.id, streamId: ctx.streamId });
                this.client.sendAIPrompt('Approved tool execution.', 'agy');
              }
            } else if (ctx.type === 'confirmation') {
              this.pendingContext = null;
              const approved = key !== 'n' && key !== 'no' && key !== 'reject';
              this.client.send('ai.confirmation.response', { confirmationId: ctx.id, streamId: ctx.streamId, approved });
              if (approved) {
                this.client.sendAIPrompt('Proceed.', 'agy');
              }
            } else if (ctx.type === 'selection') {
              this.pendingContext = null;
              this.client.send('ai.selection.response', { selectionId: ctx.id, streamId: ctx.streamId, selectedKey: trimmed });
              this.client.sendAIPrompt(`Selected option: ${trimmed}`, 'agy');
            }
          }
        } else {
          const parsed = parseCLIInput(line);
          if (parsed.type === 'ai') {
            if (!this.isOwner) {
              this.printAbovePrompt(TerminalRenderer.renderSystemMessage('Only the session owner may invoke AI.'));
            } else {
              this.client.sendAIPrompt(parsed.prompt, parsed.adapterName);
            }
          } else if (parsed.text.length > 0) {
            this.client.sendChatMessage(parsed.text);
          }
        }
      } catch {
        // Ignore send errors on prompt
      }

      if (this.active && this.rl) {
        this.rl.prompt();
      }
    });

    this.rl.on('close', () => {
      this.active = false;
    });
  }

  public printAbovePrompt(message: string): void {
    if (this.rl && this.active) {
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
      console.log(message);
      this.rl.prompt();
    } else {
      console.log(message);
    }
  }

  public close(): void {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
    this.active = false;
  }
}
