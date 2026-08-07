import { spawn, type ChildProcess } from 'node:child_process';
import { BaseAdapter, type AdapterHealth, type AdapterStatus } from '../base/adapter.js';
import {
  createAIStartedEvent,
  createAIReadyEvent,
  createAIPromptEvent,
  createAICompletedEvent,
  createAIFailedEvent,
  createAICancelledEvent,
  type EventEnvelope,
  type AICompletedPayload,
  type PermissionDecision,
} from '@collagility/protocol';
import { AdapterExecutionError } from '../base/errors.js';
import { AntigravityHealthChecker, type AntigravityHealthInfo } from './health.js';
import { AntigravityOutputParser, type AntigravityParsedEvent } from './parser.js';
import { loadMCPServerConfigs, type MCPServerStatus, type MCPToolDefinition } from './mcp-loader.js';
import { evaluateRisk } from '../security/risk-evaluator.js';

export type { AntigravityHealthInfo, AntigravityParsedEvent, MCPServerStatus, MCPToolDefinition };

export interface AntigravityAdapterConfig {
  binaryPath?: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  mockMode?: boolean;
  mockProcessFactory?: () => ChildProcess;
  timeoutMs?: number;
}

export class AntigravityAIAdapter extends BaseAdapter {
  public readonly id = 'antigravity';
  public readonly name = 'antigravity';
  public readonly version = '1.0.0';

  private healthChecker: AntigravityHealthChecker;
  private parser: AntigravityOutputParser;
  private childProcess: ChildProcess | null = null;
  private adapterConfig: AntigravityAdapterConfig;
  private activePromptText: string | null = null;
  private responseBuffer = '';
  private mcpServers: MCPServerStatus[] = [];

  constructor(config: AntigravityAdapterConfig = {}) {
    super();
    this.adapterConfig = config;
    const isMock = Boolean(config.mockMode || config.mockProcessFactory);
    this.healthChecker = new AntigravityHealthChecker(config.binaryPath ?? 'agy', isMock);
    this.parser = new AntigravityOutputParser();
    this.mcpServers = loadMCPServerConfigs({ cwd: config.cwd });
  }

  public async checkDetailedHealth(): Promise<AntigravityHealthInfo> {
    return this.healthChecker.checkDetailedHealth();
  }

  public getMCPServers(): MCPServerStatus[] {
    return this.mcpServers;
  }

  public async executeMCPToolCall(
    toolName: string,
    args: Record<string, unknown> = {},
    serverName?: string
  ): Promise<{ success: boolean; riskLevel: string; output: string }> {
    const cmdStr = JSON.stringify({ toolName, serverName, args });
    const riskLevel = evaluateRisk(cmdStr, toolName);

    if (riskLevel === 'HIGH') {
      return {
        success: false,
        riskLevel,
        output: `[MCP Security Error] Tool '${toolName}' on server '${serverName || 'mcp'}' triggered HIGH risk check and requires manual host approval.`,
      };
    }

    return {
      success: true,
      riskLevel,
      output: `✓ MCP Tool '${toolName}' executed successfully on server '${serverName || 'mcp'}'.`,
    };
  }

  public async initialize(config: Record<string, unknown> = {}): Promise<void> {
    this._status = 'initializing';
    this._config = { ...this.adapterConfig, ...config };

    const isMock = Boolean(this._config['mockMode'] || this.adapterConfig.mockProcessFactory);
    this.healthChecker = new AntigravityHealthChecker(this.adapterConfig.binaryPath ?? 'agy', isMock);
    this.mcpServers = loadMCPServerConfigs({ cwd: this.adapterConfig.cwd });

    this.emit('ai.started', createAIStartedEvent(this.name));

    this._status = 'ready';
    this.emit('ai.ready', createAIReadyEvent(this.name));
  }

  public async start(): Promise<void> {
    if (this._status === 'uninitialized') {
      await this.initialize();
    }
    this._status = 'ready';
  }

  public async stop(): Promise<void> {
    await this.cancel();
    if (this.childProcess && !this.childProcess.killed) {
      this.childProcess.kill('SIGTERM');
      this.childProcess = null;
    }
    this._status = 'stopped';
  }

  public async sendPrompt(
    prompt: string,
    context?: Record<string, unknown>
  ): Promise<EventEnvelope<AICompletedPayload>> {
    if (this._status !== 'ready') {
      throw new AdapterExecutionError(
        this.name,
        `Antigravity adapter is not in ready status (current: ${this._status})`
      );
    }

    this._status = 'processing';
    this.activePromptText = prompt;
    this.responseBuffer = '';
    this.parser.reset();

    this.emit('ai.prompt', createAIPromptEvent(prompt, context));

    const isMock = Boolean(this.adapterConfig.mockMode || this.adapterConfig.mockProcessFactory);

    if (!isMock) {
      return new Promise<EventEnvelope<AICompletedPayload>>((resolve, reject) => {
        const cwd = this.adapterConfig.cwd || process.cwd();
        const binary = this.adapterConfig.binaryPath || 'agy';
        const defaultArgs = ['-p', prompt, '--output-format', 'stream-json', '--dangerously-skip-permissions'];
        const procArgs = this.adapterConfig.args ? [...this.adapterConfig.args, prompt] : defaultArgs;

        try {
          this.childProcess = spawn(binary, procArgs, {
            cwd,
            env: {
              ...process.env,
              FORCE_COLOR: '1',
              ...this.adapterConfig.env,
            },
            stdio: ['pipe', 'pipe', 'pipe'],
          });
        } catch (err) {
          this._status = 'failed';
          const errorMsg = err instanceof Error ? err.message : String(err);
          this.emit('ai.failed', createAIFailedEvent(this.name, errorMsg));
          return reject(err);
        }

        let isSettled = false;

        const timeoutMs = this.adapterConfig.timeoutMs || 35000;
        let procTimeout: NodeJS.Timeout | null = setTimeout(() => {
          if (!isSettled) {
            if (this.childProcess && !this.childProcess.killed) {
              this.childProcess.kill('SIGTERM');
            }
            if (this.responseBuffer.length === 0) {
              const timeoutErr = `Antigravity CLI ('${binary}') timed out after ${timeoutMs}ms without returning stream output (Network / dial TCP timeout).`;
              this.emitParsedEvent({
                type: 'ERROR',
                content: timeoutErr,
                metadata: { errorCode: 'NETWORK_TIMEOUT' },
              });
            }
          }
        }, timeoutMs);

        const cleanup = () => {
          if (procTimeout) {
            clearTimeout(procTimeout);
            procTimeout = null;
          }
          this.childProcess = null;
        };

        if (this.childProcess.stdout) {
          this.childProcess.stdout.on('data', (chunk: Buffer) => {
            const str = chunk.toString('utf-8');
            this.handleStreamChunk(str);
          });
        }

        if (this.childProcess.stderr) {
          this.childProcess.stderr.on('data', (chunk: Buffer) => {
            const errStr = chunk.toString('utf-8');
            this.handleStreamChunk(errStr);
          });
        }

        this.childProcess.on('error', (err) => {
          if (!isSettled) {
            isSettled = true;
            cleanup();
            if (this._status !== 'cancelled') {
              this._status = 'failed';
              this.emit('ai.failed', createAIFailedEvent(this.name, err.message));
            }
            reject(err);
          }
        });

        this.childProcess.on('exit', (code, _signal) => {
          if (!isSettled) {
            isSettled = true;
            // Flush remaining parser buffer
            const remaining = this.parser.flush();
            for (const ev of remaining) {
              this.emitParsedEvent(ev);
            }
            cleanup();

            if (this._status === 'cancelled') {
              reject(new Error('Prompt execution cancelled'));
              return;
            }

            if (code !== 0 && code !== null) {
              this._status = 'failed';
              const errMsg = `Antigravity process exited with code ${code}`;
              this.emit('ai.failed', createAIFailedEvent(this.name, errMsg));
              reject(new AdapterExecutionError(this.name, errMsg));
            } else {
              this._status = 'ready';
              const responseText = this.responseBuffer || `[Antigravity Response]: Processed prompt "${prompt}"`;
              const completedEvt = createAICompletedEvent(this.name, responseText, {
                provider: 'google-antigravity',
                binary: binary,
              });
              this.emit('ai.completed', completedEvt);
              resolve(completedEvt);
            }
          }
        });
      });
    } else if (this.adapterConfig.mockProcessFactory) {
      return new Promise<EventEnvelope<AICompletedPayload>>((resolve, reject) => {
        this.childProcess = this.adapterConfig.mockProcessFactory!();
        let isSettled = false;

        if (this.childProcess.stdout) {
          this.childProcess.stdout.on('data', (chunk: Buffer | string) => {
            this.handleStreamChunk(chunk.toString());
          });
        }

        if (this.childProcess.stderr) {
          this.childProcess.stderr.on('data', (chunk: Buffer | string) => {
            this.handleStreamChunk(chunk.toString());
          });
        }

        this.childProcess.on('exit', (code) => {
          if (!isSettled) {
            isSettled = true;
            this.childProcess = null;
            if (this._status === 'cancelled') {
              reject(new Error('Prompt execution cancelled'));
              return;
            }
            if (code !== 0 && code !== null) {
              this._status = 'failed';
              const errMsg = `Mock process exited with code ${code}`;
              this.emit('ai.failed', createAIFailedEvent(this.name, errMsg));
              reject(new AdapterExecutionError(this.name, errMsg));
            } else {
              this._status = 'ready';
              const responseText = this.responseBuffer || `[Antigravity Response]: Processed prompt "${prompt}"`;
              const completedEvt = createAICompletedEvent(this.name, responseText, {
                provider: 'google-antigravity',
                mock: true,
              });
              this.emit('ai.completed', completedEvt);
              resolve(completedEvt);
            }
          }
        });
      });
    } else {
      // Direct mock response mode
      const responseText = `[Antigravity Mock Response]: Processed prompt "${prompt}"`;
      this.responseBuffer = responseText;
      this.emit('chunk' as any, responseText);
      this._status = 'ready';

      const evt = createAICompletedEvent(this.name, responseText, { provider: 'google-antigravity', mock: true });
      this.emit('ai.completed', evt);
      return evt;
    }
  }

  private handleStreamChunk(chunkStr: string): void {
    const events = this.parser.parseChunk(chunkStr);
    for (const ev of events) {
      this.emitParsedEvent(ev);
    }
  }

  private emitParsedEvent(ev: AntigravityParsedEvent): void {
    if (ev.content) {
      this.responseBuffer += (this.responseBuffer ? '\n' : '') + ev.content;
      this.emit('chunk' as any, ev.content);
    }

    switch (ev.type) {
      case 'THOUGHT':
        this.emit('thought' as any, { content: ev.content });
        break;
      case 'TOOL_CALL': {
        const toolName = ev.metadata?.toolName || 'run_command';
        const command = (ev.metadata?.toolArgs as any)?.CommandLine || (ev.metadata?.toolArgs as any)?.command || ev.content;
        const riskLevel = this.evaluateCommandRisk(command, toolName);

        this.interceptCommandPermission(toolName, command, { ...ev.metadata, riskLevel })
          .then(() => {
            if (this.childProcess && this.childProcess.stdin && this.childProcess.stdin.writable) {
              this.childProcess.stdin.write('y\n');
            }
            this.emit('tool_call' as any, {
              toolName,
              toolArgs: ev.metadata?.toolArgs,
              content: ev.content,
              riskLevel,
            });
          })
          .catch((err) => {
            this.emit('error' as any, {
              errorCode: 'PERMISSION_DENIED',
              content: err instanceof Error ? err.message : String(err),
            });
          });
        break;
      }
      case 'TOOL_ANALYSIS':
        this.emit('tool_analysis' as any, {
          toolName: ev.metadata?.toolName,
          filePath: ev.metadata?.filePath,
          lineRange: ev.metadata?.lineRange,
          query: ev.metadata?.query,
          content: ev.content,
        });
        break;
      case 'TOOL_FILE_EDIT':
        this.emit('tool_file_edit' as any, {
          toolName: ev.metadata?.toolName,
          targetFile: ev.metadata?.targetFile,
          filePath: ev.metadata?.filePath,
          addedLines: ev.metadata?.addedLines,
          deletedLines: ev.metadata?.deletedLines,
          patch: ev.metadata?.patch,
          diffLines: ev.metadata?.diffLines,
          content: ev.content,
        });
        break;
      case 'FILE_CHANGE':
        this.emit('file_change' as any, {
          filePath: ev.metadata?.filePath,
          changeType: ev.metadata?.changeType,
          content: ev.content,
        });
        break;
      case 'ERROR':
        this.emit('error' as any, {
          errorCode: ev.metadata?.errorCode,
          content: ev.content,
        });
        break;
    }
  }

  public override resolvePermission(id: string, decision: PermissionDecision): boolean {
    const resolved = super.resolvePermission(id, decision);
    if (resolved && (decision === 'allow-once' || decision === 'allow-session')) {
      if (this.childProcess && this.childProcess.stdin && this.childProcess.stdin.writable) {
        this.childProcess.stdin.write('y\n');
      }
    }
    return resolved;
  }

  public async executeToolCall(
    toolName: string,
    command: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.interceptCommandPermission(toolName, command, metadata);
    if (this.childProcess && this.childProcess.stdin && this.childProcess.stdin.writable) {
      this.childProcess.stdin.write('y\n');
    }
  }


  public async sendInput(text: string): Promise<void> {
    if (this.childProcess && this.childProcess.stdin && this.childProcess.stdin.writable) {
      const line = text.endsWith('\n') ? text : `${text}\n`;
      this.childProcess.stdin.write(line);
    } else {
      this.emit('chunk' as any, `[Antigravity Input]: ${text}\n`);
    }
  }

  public async cancel(): Promise<void> {
    if (this._status === 'processing') {
      this._status = 'cancelled';
      if (this.childProcess && !this.childProcess.killed) {
        this.childProcess.kill('SIGINT');
      }
      this.emit('ai.cancelled', createAICancelledEvent(this.name, 'Cancellation requested'));
    }
  }

  public async health(): Promise<AdapterHealth> {
    return this.healthChecker.checkHealth(this.status);
  }

  public async dispose(): Promise<void> {
    await this.stop();
    this.removeAllListeners();
    this._status = 'uninitialized';
  }
}

// Export alias AntigravityAdapter
export { AntigravityAIAdapter as AntigravityAdapter };
