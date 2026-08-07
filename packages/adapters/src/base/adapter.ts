import { EventEmitter } from 'node:events';
import { createEnvelope } from '@collagility/protocol';
import type {
  EventEnvelope,
  AICompletedPayload,
  SecurityMode,
  RiskLevel,
  PermissionRequest,
  PermissionDecision,
} from '@collagility/protocol';

export type {
  EventEnvelope,
  AICompletedPayload,
  SecurityMode,
  RiskLevel,
  PermissionRequest,
  PermissionDecision,
};
import type { AdapterEventMap, AdapterEventName, AdapterEventListener } from './events.js';
import { evaluateRisk } from '../security/risk-evaluator.js';
import { AdapterSecurityError } from './errors.js';

export type AdapterStatus =
  | 'uninitialized'
  | 'initializing'
  | 'ready'
  | 'processing'
  | 'cancelled'
  | 'failed'
  | 'stopped';

export interface AdapterHealth {
  ok: boolean;
  message?: string;
  latencyMs?: number;
}

export abstract class AIAdapter extends EventEmitter {

  public abstract readonly id: string;
  public abstract readonly name: string;
  public abstract readonly version: string;

  protected _status: AdapterStatus = 'uninitialized';
  protected _config: Record<string, unknown> = {};
  protected _securityMode: SecurityMode = 'manual';
  protected _sessionApprovals: Set<string> = new Set();
  private _pendingPermissions: Map<string, (decision: PermissionDecision) => void> = new Map();

  public get status(): AdapterStatus {
    return this._status;
  }

  public get config(): Readonly<Record<string, unknown>> {
    return this._config;
  }

  public get securityMode(): SecurityMode {
    return this._securityMode;
  }

  public setSecurityMode(mode: SecurityMode): void {
    this._securityMode = mode;
  }

  public clearSessionApprovals(): void {
    this._sessionApprovals.clear();
  }

  public evaluateCommandRisk(command: string, toolName: string = 'run_command'): RiskLevel {
    return evaluateRisk(command, toolName);
  }

  public isPermissionRequired(riskLevel: RiskLevel): boolean {
    switch (this._securityMode) {
      case 'auto':
        return false;
      case 'accept-edits':
        return riskLevel === 'HIGH';
      case 'plan-only':
      case 'manual':
      default:
        return riskLevel === 'MEDIUM' || riskLevel === 'HIGH';
    }
  }

  protected _tmuxSessionName?: string;
  protected _tmuxSendKeysHandler?: (
    sessionName: string,
    paneIndex: 0 | 1,
    keys: string
  ) => Promise<void>;
  protected _approvalKeystroke = 'y';

  public setTmuxSession(
    sessionName: string,
    sendKeysHandler?: (sessionName: string, paneIndex: 0 | 1, keys: string) => Promise<void>
  ): void {
    this._tmuxSessionName = sessionName;
    if (sendKeysHandler) {
      this._tmuxSendKeysHandler = sendKeysHandler;
    }
  }

  public setApprovalKeystroke(keystroke: string): void {
    this._approvalKeystroke = keystroke;
  }

  public async sendTmuxApproval(keys: string = this._approvalKeystroke): Promise<void> {
    if (!this._tmuxSessionName) return;
    if (this._tmuxSendKeysHandler) {
      await this._tmuxSendKeysHandler(this._tmuxSessionName, 1, keys);
    }
  }

  public resolvePermission(id: string, decision: PermissionDecision): boolean {
    const resolver = this._pendingPermissions.get(id);
    if (!resolver) {
      return false;
    }
    this._pendingPermissions.delete(id);
    resolver(decision);
    if (decision === 'allow-once' || decision === 'allow-session') {
      this.sendTmuxApproval(this._approvalKeystroke).catch(() => {});
    }
    return true;
  }

  public async interceptCommandPermission(
    toolName: string,
    command: string,
    metadata?: Record<string, any>
  ): Promise<PermissionDecision> {
    const riskLevel = evaluateRisk(command, toolName);
    const sessionKey = `${toolName}:${command}`;

    if (this._sessionApprovals.has(sessionKey)) {
      await this.sendTmuxApproval(this._approvalKeystroke);
      return 'allow-session';
    }

    if (!this.isPermissionRequired(riskLevel)) {
      await this.sendTmuxApproval(this._approvalKeystroke);
      return 'allow-once';
    }

    const id = `perm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const request: PermissionRequest = {
      id,
      toolName,
      command,
      riskLevel,
      metadata,
    };

    const envelope = createEnvelope('permission_required', request, {
      sender: { id: this.name, name: this.name, role: 'ai' },
    });

    // Emit typed permission required events
    this.emit('permission_required' as any, envelope);
    this.emit('PERMISSION_REQUIRED' as any, envelope);

    const decision = await new Promise<PermissionDecision>((resolve) => {
      this._pendingPermissions.set(id, resolve);
    });

    if (decision === 'allow-session') {
      this._sessionApprovals.add(sessionKey);
    } else if (decision === 'deny') {
      throw new AdapterSecurityError(
        this.name,
        `Execution denied for command '${command}' (tool: ${toolName}, risk: ${riskLevel})`
      );
    }

    return decision;
  }

  // Strongly typed EventEmitter wrappers
  public on<K extends AdapterEventName>(event: K, listener: AdapterEventListener<K>): this {
    return super.on(event, listener as (...args: unknown[]) => void);
  }

  public once<K extends AdapterEventName>(event: K, listener: AdapterEventListener<K>): this {
    return super.once(event, listener as (...args: unknown[]) => void);
  }

  public off<K extends AdapterEventName>(event: K, listener: AdapterEventListener<K>): this {
    return super.off(event, listener as (...args: unknown[]) => void);
  }

  public emit<K extends AdapterEventName>(event: K, envelope: AdapterEventMap[K]): boolean {
    return super.emit(event, envelope);
  }

  // Abstract lifecycle and execution interface
  public abstract initialize(config?: Record<string, unknown>): Promise<void>;
  public abstract start(): Promise<void>;
  public abstract stop(): Promise<void>;
  public abstract sendPrompt(
    prompt: string,
    context?: Record<string, unknown>
  ): Promise<EventEnvelope<AICompletedPayload>>;
  public abstract sendInput(text: string): Promise<void>;
  public abstract cancel(): Promise<void>;
  public abstract health(): Promise<AdapterHealth>;
  public abstract dispose(): Promise<void>;
}


export { AIAdapter as BaseAdapter };

