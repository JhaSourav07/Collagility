import readline from 'node:readline';
import type { WebSocketClient } from '../client/ws-client.js';
import { parseCLIInput } from './command-parser.js';

export class ChatPrompt {
  private rl: readline.Interface | null = null;
  private client: WebSocketClient;
  private active = false;

  constructor(client: WebSocketClient) {
    this.client = client;
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

    this.rl.on('line', (line: string) => {
      const parsed = parseCLIInput(line);
      try {
        if (parsed.type === 'ai') {
          this.client.sendAIPrompt(parsed.prompt, parsed.adapterName);
        } else if (parsed.text.length > 0) {
          this.client.sendChatMessage(parsed.text);
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
      // Clear prompt line, print message, re-prompt
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
      console.log(message);
      this.rl.prompt();
    } else {
      console.log(message);
    }
  }

  public close(): void {
    this.active = false;
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
  }
}
