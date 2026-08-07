import React from 'react';
import { render, Instance } from 'ink';
import { App } from './ink/App.js';
import type { PermissionRequest, PermissionDecision, SecurityMode } from '@collagility/protocol';
import type {
  SessionInfoState,
  AIDriverState,
  ChatMessageItem,
  ActivityLogItem,
  UserMember,
  InteractivePromptState,
  PermissionPromptState,
  SubagentTask,
  CommandHandler,
} from './ink/types.js';

export interface InkRendererOptions {
  sessionId?: string;
  isOwner?: boolean;
  ownerName?: string;
  aiDriverName?: string;
  aiModel?: string;
  aiMode?: string;
  securityMode?: SecurityMode;
  initialMessages?: ChatMessageItem[];
  initialActivities?: ActivityLogItem[];
  initialUsers?: UserMember[];
  workspacePath?: string;
}

export class InkTerminalRenderer {
  private instance: Instance | null = null;
  private commandHandler: CommandHandler | null = null;
  private onExitSessionCallback: (() => void) | null = null;

  public setCommandHandler(handler: CommandHandler): void {
    this.commandHandler = handler;
  }

  public setOnExitSession(handler: () => void): void {
    this.onExitSessionCallback = handler;
  }

  private session: SessionInfoState = {
    id: 'active-session',
    ownerName: process.env.USER || 'Sourav',
    createdAgo: 'Just now',
    userRole: 'owner',
    isHost: true,
    users: [],
    workspacePath: process.cwd(),
    version: 'v2.0',
    connectionStatus: 'connected',
  };

  private aiDriver: AIDriverState = {
    name: 'agy',
    model: 'Gemini 3.5 Flash',
    mode: 'Code',
    status: 'Ready',
    securityMode: 'manual',
    tokenStatus: { used: 14200, limit: 1000000 },
  };

  private messages: ChatMessageItem[] = [];
  private activities: ActivityLogItem[] = [];
  private promptQueue: InteractivePromptState[] = [];
  private permissionQueue: PermissionPromptState[] = [];
  private subagents: SubagentTask[] = [];
  private remoteScreenData = '';
  private remoteCols = 80;
  private remoteRows = 24;

  constructor(options: InkRendererOptions = {}) {
    if (options.sessionId) this.session.id = options.sessionId;
    if (options.isOwner !== undefined) {
      this.session.userRole = options.isOwner ? 'owner' : 'visitor';
      this.session.isHost = options.isOwner;
    }
    if (options.ownerName) this.session.ownerName = options.ownerName;
    if (options.aiDriverName) this.aiDriver.name = options.aiDriverName;
    if (options.aiModel) this.aiDriver.model = options.aiModel;
    if (options.aiMode) this.aiDriver.mode = options.aiMode;
    if (options.workspacePath) this.session.workspacePath = options.workspacePath;

    if (options.initialUsers) {
      this.session.users = options.initialUsers;
    } else {
      this.session.users = [
        { name: this.session.ownerName, isOwner: true, isSelf: this.session.userRole === 'owner' },
      ];
    }

    if (options.initialMessages) {
      this.messages = options.initialMessages;
    }
    if (options.initialActivities) {
      this.activities = options.initialActivities;
    }
  }

  public setSessionInfo(
    sessionId: string,
    isOwner: boolean,
    ownerName: string,
    users?: UserMember[]
  ): void {
    this.session.id = sessionId;
    this.session.userRole = isOwner ? 'owner' : 'visitor';
    this.session.isHost = isOwner;
    this.session.ownerName = ownerName;
    if (users) {
      this.session.users = users;
    }
    this.rerender();
  }

  public setAiDriverInfo(name: string, model?: string, mode?: string): void {
    this.aiDriver.name = name;
    if (model) this.aiDriver.model = model;
    if (mode) this.aiDriver.mode = mode;
    this.rerender();
  }

  public setSecurityMode(mode: SecurityMode): void {
    this.aiDriver.securityMode = mode;
    this.appendMessage({
      sender: 'System',
      senderRole: 'system',
      content: `✓ Security Mode set to '${mode.toUpperCase()}'`,
    });
    this.rerender();
  }

  public cycleSecurityMode(): SecurityMode {
    const modes: SecurityMode[] = ['manual', 'accept-edits', 'plan-only', 'auto'];
    const current = this.aiDriver.securityMode || 'manual';
    const nextIdx = (modes.indexOf(current) + 1) % modes.length;
    const nextMode = modes[nextIdx];
    this.setSecurityMode(nextMode);
    return nextMode;
  }

  public clearScreen(): void {
    if (process.stdout.isTTY) {
      process.stdout.write('\x1Bc');
    }
    this.messages = this.messages.filter((m) => m.id.startsWith('sys-init'));
    this.activities = [];
    this.appendMessage({
      sender: 'System',
      senderRole: 'system',
      content: '✓ Terminal screen cleared (Ctrl+L)',
    });
    this.rerender();
  }

  public setSubagents(tasks: SubagentTask[]): void {
    this.subagents = tasks;
    this.rerender();
  }

  public setRemoteTerminalScreen(data: string, cols?: number, rows?: number): void {
    if (data) {
      this.remoteScreenData = data;
    }
    if (cols) this.remoteCols = cols;
    if (rows) this.remoteRows = rows;
    this.rerender();
  }

  public getRemoteTerminalScreen(): { data: string; cols: number; rows: number } {
    return {
      data: this.remoteScreenData,
      cols: this.remoteCols,
      rows: this.remoteRows,
    };
  }

  public pushPermissionPrompt(
    request: PermissionRequest,
    onResolve: (decision: PermissionDecision) => void
  ): void {
    const wrappedResolve = (decision: PermissionDecision) => {
      this.popPermissionPrompt();
      onResolve(decision);
    };

    if (!this.permissionQueue.some((p) => p.id === request.id)) {
      this.permissionQueue.push({
        id: request.id,
        request,
        onResolve: wrappedResolve,
      });
      this.rerender();
    }
  }

  public getPermissionPrompt(): PermissionPromptState | null {
    return this.permissionQueue.length > 0 ? this.permissionQueue[0] : null;
  }

  public popPermissionPrompt(): PermissionPromptState | null {
    const popped = this.permissionQueue.shift() || null;
    this.rerender();
    return popped;
  }

  public pushInteractivePrompt(prompt: InteractivePromptState): void {
    if (!this.promptQueue.some((p) => p.id === prompt.id)) {
      this.promptQueue.push(prompt);
      this.rerender();
    }
  }

  public setInteractivePrompt(prompt: InteractivePromptState): void {
    this.promptQueue = [prompt];
    this.rerender();
  }

  public clearInteractivePrompt(): void {
    this.promptQueue = [];
    this.rerender();
  }

  public getInteractivePrompt(): InteractivePromptState | null {
    return this.promptQueue.length > 0 ? this.promptQueue[0] : null;
  }

  public popInteractivePrompt(): InteractivePromptState | null {
    const popped = this.promptQueue.shift() || null;
    this.rerender();
    return popped;
  }

  public startStreamMessage(streamId: string, adapterName = 'Gemini'): void {
    this.appendMessage({
      id: streamId,
      sender: adapterName,
      senderRole: 'ai',
      content: '',
      isStreaming: true,
    });
  }

  public appendStreamChunk(streamId: string, senderName: string, content: string): void {
    this.updateStreamingMessage(streamId, content, false);
  }

  public completeStreamMessage(id: string, durationMs?: number): void {
    this.completeStreamingMessage(id, durationMs);
  }

  public appendMessage(msg: Omit<ChatMessageItem, 'id' | 'timestamp'> & { id?: string; timestamp?: string }): void {
    const time = msg.timestamp || new Date().toLocaleTimeString('en-US', { hour12: false });
    const id = msg.id || `msg-${Date.now()}-${Math.random()}`;

    this.messages.push({
      id,
      timestamp: time,
      sender: msg.sender,
      senderRole: msg.senderRole,
      content: msg.content,
      icon: msg.icon,
      isStreaming: msg.isStreaming,
      isTyping: msg.isTyping,
      thoughtBlock: msg.thoughtBlock,
      toolCard: msg.toolCard,
      fileEditCard: msg.fileEditCard,
    });

    this.rerender();
  }

  public updateStreamingMessage(id: string, chunk: string, isDone = false): void {
    const existing = this.messages.find((m) => m.id === id);
    if (existing) {
      existing.content += chunk;
      existing.isStreaming = !isDone;
    } else {
      this.appendMessage({
        id,
        sender: this.aiDriver.name,
        senderRole: 'ai',
        content: chunk,
        isStreaming: !isDone,
      });
    }
    this.rerender();
  }

  public completeStreamingMessage(id: string, durationMs?: number): void {
    const existing = this.messages.find((m) => m.id === id);
    if (existing) {
      existing.isStreaming = false;
    }
    if (durationMs !== undefined) {
      this.appendMessage({
        sender: this.aiDriver.name,
        senderRole: 'ai',
        content: `✓ Stream Completed (${durationMs}ms)`,
      });
    }
    this.rerender();
  }

  public appendActivity(text: string, type: 'join' | 'leave' | 'typing' | 'session' | 'info'): void {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    this.activities.push({
      id: `act-${Date.now()}-${Math.random()}`,
      timestamp: time,
      text,
      type,
    });
    this.rerender();
  }

  public updateUsers(users: UserMember[]): void {
    this.session.users = users;
    this.rerender();
  }

  public addUser(member: UserMember): void {
    if (!this.session.users.some((u) => u.name === member.name)) {
      this.session.users.push(member);
      this.rerender();
    }
  }

  public removeUser(memberName: string): void {
    this.session.users = this.session.users.filter((u) => u.name !== memberName);
    this.rerender();
  }

  public renderApp(): Instance {
    const currentPrompt = this.getInteractivePrompt();
    const currentPermission = this.getPermissionPrompt();
    if (!this.instance) {
      if (process.stdout.isTTY) {
        process.stdout.write('\x1Bc');
      }
      this.instance = render(
        React.createElement(App, {
          session: this.session,
          aiDriver: this.aiDriver,
          messages: this.messages,
          activities: this.activities,
          subagents: this.subagents,
          interactivePrompt: currentPrompt,
          permissionPrompt: currentPermission,
          queueCount: Math.max(this.promptQueue.length, this.permissionQueue.length),
          remoteScreenData: this.remoteScreenData,
          remoteCols: this.remoteCols,
          remoteRows: this.remoteRows,
          onCommand: (input: string) => {
            if (this.commandHandler) {
              this.commandHandler(input);
            } else {
              this.handleDefaultInput(input);
            }
          },
          onCycleSecurityMode: () => {
            this.cycleSecurityMode();
          },
          onClearScreen: () => {
            this.clearScreen();
          },
          onExitSession: () => {
            if (this.onExitSessionCallback) {
              this.onExitSessionCallback();
            } else if (this.commandHandler) {
              this.commandHandler('/leave');
            } else {
              process.exit(0);
            }
          },
        }),
        {
          // Do NOT let Ink exit the process on Ctrl+C — we own SIGINT.
          // Do NOT patch console.log — avoid double-rendering bugs during
          // tmux pane resize / terminal tab switches.
          exitOnCtrlC: false,
          patchConsole: false,
        }
      );
    } else {
      this.rerender();
    }
    return this.instance;
  }

  private rerender(): void {
    if (this.instance) {
      const currentPrompt = this.getInteractivePrompt();
      const currentPermission = this.getPermissionPrompt();
      this.instance.rerender(
        React.createElement(App, {
          session: this.session,
          aiDriver: this.aiDriver,
          messages: this.messages,
          activities: this.activities,
          subagents: this.subagents,
          interactivePrompt: currentPrompt,
          permissionPrompt: currentPermission,
          queueCount: Math.max(this.promptQueue.length, this.permissionQueue.length),
          remoteScreenData: this.remoteScreenData,
          remoteCols: this.remoteCols,
          remoteRows: this.remoteRows,
          onCommand: (input: string) => {
            if (this.commandHandler) {
              this.commandHandler(input);
            } else {
              this.handleDefaultInput(input);
            }
          },
          onCycleSecurityMode: () => {
            this.cycleSecurityMode();
          },
          onClearScreen: () => {
            this.clearScreen();
          },
          onExitSession: () => {
            if (this.onExitSessionCallback) {
              this.onExitSessionCallback();
            } else if (this.commandHandler) {
              this.commandHandler('/leave');
            } else {
              process.exit(0);
            }
          },
        })
      );
    }
  }

  private handleDefaultInput(input: string): void {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    const isSelfOwner = this.session.userRole === 'owner';
    const selfName = isSelfOwner ? this.session.ownerName : 'Visitor';

    this.appendMessage({
      timestamp: time,
      sender: selfName,
      senderRole: 'user',
      content: input,
    });
  }

  public unmount(): void {
    if (this.instance) {
      this.instance.unmount();
      this.instance = null;
    }
  }
}
