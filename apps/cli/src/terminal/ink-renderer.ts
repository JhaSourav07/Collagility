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
}

export class InkTerminalRenderer {
  private instance: Instance | null = null;
  private commandHandler: CommandHandler | null = null;

  private session: SessionInfoState = {
    id: 'active-session',
    ownerName: process.env.USER || 'Sourav',
    createdAgo: 'Just now',
    userRole: 'owner',
    users: [],
  };

  private aiDriver: AIDriverState = {
    name: 'agy',
    model: 'Gemini 3.5 Flash',
    mode: 'Code',
    status: 'Ready',
    securityMode: 'manual',
  };

  private messages: ChatMessageItem[] = [];
  private activities: ActivityLogItem[] = [];
  private promptQueue: InteractivePromptState[] = [];
  private permissionQueue: PermissionPromptState[] = [];


  constructor(options: InkRendererOptions = {}) {
    if (options.sessionId) this.session.id = options.sessionId;
    if (options.isOwner !== undefined) {
      this.session.userRole = options.isOwner ? 'owner' : 'visitor';
    }
    if (options.ownerName) this.session.ownerName = options.ownerName;
    if (options.aiDriverName) this.aiDriver.name = options.aiDriverName;
    if (options.aiModel) this.aiDriver.model = options.aiModel;
    if (options.aiMode) this.aiDriver.mode = options.aiMode;

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

  public setCommandHandler(handler: CommandHandler): void {
    this.commandHandler = handler;
  }

  public setSessionInfo(
    sessionId: string,
    isOwner: boolean,
    ownerName: string,
    users?: UserMember[]
  ): void {
    this.session.id = sessionId;
    this.session.userRole = isOwner ? 'owner' : 'visitor';
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

  public setInteractivePrompt(prompt: InteractivePromptState | null): void {
    if (prompt) {
      this.pushInteractivePrompt(prompt);
    } else {
      this.clearInteractivePrompt();
    }
  }

  public getInteractivePrompt(): InteractivePromptState | null {
    return this.promptQueue.length > 0 ? this.promptQueue[0] : null;
  }

  public getPromptQueueCount(): number {
    return this.promptQueue.length;
  }

  public popInteractivePrompt(): InteractivePromptState | null {
    const popped = this.promptQueue.shift() || null;
    this.rerender();
    return popped;
  }

  public clearInteractivePrompt(): void {
    this.promptQueue = [];
    this.rerender();
  }

  public appendMessage(msg: Partial<ChatMessageItem> & { content: string }): void {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    const item: ChatMessageItem = {
      id: msg.id || `msg-${Date.now()}-${Math.random()}`,
      timestamp: msg.timestamp || time,
      sender: msg.sender || 'System',
      senderRole: msg.senderRole || 'system',
      content: msg.content,
      icon: msg.icon,
      isStreaming: msg.isStreaming,
      isTyping: msg.isTyping,
    };
    this.messages.push(item);
    this.rerender();
  }

  public startStreamMessage(streamId: string, sender: string): void {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    const msgId = `stream-${streamId}`;
    const existing = this.messages.find((m) => m.id === msgId);
    if (!existing) {
      this.messages.push({
        id: msgId,
        timestamp: time,
        sender,
        senderRole: 'ai',
        content: 'Thinking...',
        isStreaming: true,
      });
      this.rerender();
    }
  }

  public appendStreamChunk(streamId: string, sender: string, chunkContent: string): void {
    const msgId = `stream-${streamId}`;
    const existing = this.messages.find((m) => m.id === msgId);
    if (existing) {
      if (existing.content === 'Thinking...' || existing.content === 'Thinking') {
        existing.content = chunkContent;
      } else {
        existing.content += chunkContent;
      }
    } else {
      const time = new Date().toLocaleTimeString('en-US', { hour12: false });
      this.messages.push({
        id: msgId,
        timestamp: time,
        sender,
        senderRole: 'ai',
        content: chunkContent,
        isStreaming: true,
      });
    }
    this.rerender();
  }

  public completeStreamMessage(streamId: string, durationMs?: number): void {
    const msgId = `stream-${streamId}`;
    const existing = this.messages.find((m) => m.id === msgId);
    if (existing) {
      existing.isStreaming = false;
    }
    if (durationMs !== undefined) {
      this.appendMessage({
        sender: 'Gemini',
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
      this.instance = render(
        React.createElement(App, {
          session: this.session,
          aiDriver: this.aiDriver,
          messages: this.messages,
          activities: this.activities,
          interactivePrompt: currentPrompt,
          permissionPrompt: currentPermission,
          queueCount: Math.max(this.promptQueue.length, this.permissionQueue.length),
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
        })
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
          interactivePrompt: currentPrompt,
          permissionPrompt: currentPermission,
          queueCount: Math.max(this.promptQueue.length, this.permissionQueue.length),
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
