import type { CLIConfig } from '../config/config.js';
import { establishConnection } from '../client/connection.js';
import { CLIProgressSpinner } from '../terminal/spinner.js';
import { CLILogger } from '../terminal/logger.js';
import { colors } from '../terminal/colors.js';
import { renderSessionHeader, TerminalRenderer } from '../terminal/renderer.js';
import { ChatPrompt } from '../terminal/chat-prompt.js';
import { TerminalStreamRenderer } from '../terminal/terminal-stream-renderer.js';
import { SplitTerminalRenderer } from '../terminal/split-pane-renderer.js';
import { GeminiAIAdapter, GeminiHealthChecker, AdapterRegistry } from '@collagility/adapters';
import { createStreamChunk } from '@collagility/stream';

export async function startCommand(options: Partial<CLIConfig>): Promise<void> {
  const logger = new CLILogger(options.verbose);
  const streamRenderer = new TerminalStreamRenderer();
  const splitRenderer = process.stdout.isTTY ? new SplitTerminalRenderer() : null;
  let chatPrompt: ChatPrompt | null = null;

  const targetBinary = options.cliBinary || 'agy';
  const isMock = Boolean(options.mockMode || process.env.GEMINI_MOCK);
  const workspacePath = process.cwd();

  // Step 1: Check AI CLI (agy / antigravity / gemini) availability & authentication
  console.log(colors.bold(`\nChecking AI CLI (${targetBinary})...`));
  const healthChecker = new GeminiHealthChecker(targetBinary, isMock, options.cliVersion);
  const health = await healthChecker.checkDetailedHealth();

  if (!health.ok) {
    logger.error(`✖ AI CLI check failed: ${health.error}`);
    console.log(colors.dim('\nHow to fix:'));
    console.log(colors.cyan('  1. Ensure Antigravity CLI (agy) is installed and added to PATH'));
    console.log(colors.cyan('  2. Or run `collagility start --cli agy` to target Antigravity CLI'));
    console.log(colors.cyan('  3. Or run `collagility start --mock` to start in mock mode\n'));
    process.exit(1);
  }

  const binaryLabel = health.detectedBinary || targetBinary;
  logger.success(`✓ ${binaryLabel} CLI found (${health.executable || 'PATH'})`);
  logger.success(`✓ Authentication verified`);
  logger.success(`✓ ${binaryLabel} ${health.version || '1.x'}\n`);

  // Step 2: Initialize AI Adapter with session workspacePath and Register in AdapterRegistry
  const adapter = new GeminiAIAdapter({ binaryPath: binaryLabel, mockMode: isMock, cwd: workspacePath });
  const registry = new AdapterRegistry();

  try {
    await adapter.initialize();
    registry.register('gemini', adapter);
    registry.register('agy', adapter);
    registry.register('antigravity', adapter);
    registry.setActive(binaryLabel.toLowerCase());
  } catch (err) {
    logger.error(`Failed to initialize local ${binaryLabel} adapter`, err);
    process.exit(1);
  }

  const spinner = new CLIProgressSpinner('Connecting to Collagility server...');
  spinner.start();

  try {
    const client = await establishConnection(options as CLIConfig, {
      onSessionCreated: (session) => {
        spinner.stop(true, 'Session created successfully');
        const members = Array.isArray(session['members']) ? session['members'] : [];
        const sessionId = String(session['id']);
        const activeWorkspace = String(session['workspacePath'] || (session['metadata'] as any)?.['workspacePath'] || workspacePath);

        const header = renderSessionHeader(sessionId, true, members.length);
        const sessionInfo = `Session ID: ${sessionId} | Workspace: ${activeWorkspace}`;
        
        if (splitRenderer) {
          splitRenderer.appendChat(sessionInfo);
          splitRenderer.appendChat('AI Workspace Ready. Waiting for collaborators...');
          splitRenderer.appendChat('(Type @agi <prompt> for AI, or a message to chat)');
          splitRenderer.render();
        } else {
          console.log(header);
          logger.info(colors.bold(`Session ID: ${colors.code(sessionId)}`));
          logger.info(colors.bold(`Workspace:\n${colors.cyan(activeWorkspace)}`));
          logger.success('AI Workspace Ready.');
          logger.info(colors.dim('Waiting for collaborators... (Type @agi <prompt>, @agy <prompt>, or @gemini <prompt> for AI, or a message to chat)\n'));
        }

        chatPrompt = new ChatPrompt(client, true);
        chatPrompt.start();
      },

      onChatMessage: (msg) => {
        const rendered = TerminalRenderer.renderChatMessage(msg);
        if (splitRenderer) {
          splitRenderer.appendChat(rendered);
        } else if (chatPrompt) {
          chatPrompt.printAbovePrompt(rendered);
        } else {
          console.log(rendered);
        }
      },

      onChatSystem: (msg) => {
        const rendered = TerminalRenderer.renderSystemMessage(msg);
        if (splitRenderer) {
          splitRenderer.appendChat(rendered);
        } else if (chatPrompt) {
          chatPrompt.printAbovePrompt(rendered);
        } else {
          console.log(rendered);
        }
      },

      onStreamStarted: (payload) => {
        streamRenderer.onStreamStarted(payload.streamId, payload.adapterName, payload.prompt);
        if (splitRenderer) {
          splitRenderer.appendChat(`[AI Stream Started] Prompt: "${payload.prompt}"`);
          splitRenderer.clearPty();
          splitRenderer.appendPtyData(`⚡ AI Processing: ${payload.prompt}\n────────────────────────────\n`);
        }

        const reqName = payload.adapterName?.toLowerCase();
        const targetAdapter =
          reqName && reqName !== 'agi' && reqName !== 'active' && registry.has(reqName)
            ? (registry.get(reqName) || registry.getActive() || adapter)
            : (registry.getActive() || adapter);

        let seq = 1;
        const onChunk = (content: string) => {
          if (typeof content === 'string' && content.length > 0) {
            if (splitRenderer) {
              splitRenderer.appendPtyData(content);
            }
            const streamChunk = createStreamChunk({
              streamId: payload.streamId,
              sequenceNumber: seq++,
              sessionId: payload.streamId,
              sender: { id: payload.adapterName, name: payload.adapterName, role: 'ai' },
              content,
              isFinal: false,
            });
            client.send('ai.stream.chunk', streamChunk);
          }
        };

        targetAdapter.on('chunk' as any, onChunk);

        targetAdapter
          .sendPrompt(payload.prompt)
          .then((resEnvelope: any) => {
            targetAdapter.off('chunk' as any, onChunk);
            const fullText = resEnvelope?.payload?.responseText || '';

            if (seq === 1 && fullText) {
              const chunks = fullText.match(/.{1,15}/g) || [fullText];
              for (const chunkContent of chunks) {
                if (splitRenderer) {
                  splitRenderer.appendPtyData(chunkContent);
                }
                const streamChunk = createStreamChunk({
                  streamId: payload.streamId,
                  sequenceNumber: seq++,
                  sessionId: payload.streamId,
                  sender: { id: payload.adapterName, name: payload.adapterName, role: 'ai' },
                  content: chunkContent,
                  isFinal: false,
                });
                client.send('ai.stream.chunk', streamChunk);
              }
            }

            const finalChunk = createStreamChunk({
              streamId: payload.streamId,
              sequenceNumber: seq++,
              sessionId: payload.streamId,
              sender: { id: payload.adapterName, name: payload.adapterName, role: 'ai' },
              content: '',
              isFinal: true,
            });
            client.send('ai.stream.chunk', finalChunk);
          })
          .catch((err: unknown) => {
            targetAdapter.off('chunk' as any, onChunk);
            const errorMsg = err instanceof Error ? err.message : String(err);
            logger.error('Local AI execution failed', err);
            streamRenderer.onStreamFailed(errorMsg);
            if (splitRenderer) {
              splitRenderer.appendPtyData(`\n✖ AI Execution Error: ${errorMsg}\n`);
            }
            try {
              client.send('ai.stream.failed', { streamId: payload.streamId, error: errorMsg, sessionId: payload.streamId });
            } catch {
              // Ignore socket send errors
            }
          });
      },

      onStreamChunk: (payload) => {
        streamRenderer.renderChunk(payload);
        if (splitRenderer) {
          splitRenderer.appendPtyData(payload.content);
        }
      },

      onStreamCompleted: (payload) => {
        streamRenderer.onStreamCompleted({
          totalChunks: payload.totalChunks,
          durationMs: payload.durationMs,
        });
        if (splitRenderer) {
          splitRenderer.appendChat(`✔ AI Stream Completed (${payload.durationMs}ms)`);
        }
      },

      onStreamCancelled: (payload) => {
        streamRenderer.onStreamCancelled(payload.reason);
        if (splitRenderer) {
          splitRenderer.appendChat(`⚠️ AI Stream Cancelled: ${payload.reason}`);
        }
      },

      onStreamFailed: (payload) => {
        streamRenderer.onStreamFailed(payload.error);
        if (splitRenderer) {
          splitRenderer.appendChat(`✖ AI Stream Failed: ${payload.error}`);
        }
      },

      onStreamError: (payload) => {
        logger.error(`AI Stream Error: ${payload.error}`);
        if (splitRenderer) {
          splitRenderer.appendChat(`✖ Error: ${payload.error}`);
        }
      },

      onMemberJoined: (sessionId, memberId) => {
        const notice = TerminalRenderer.renderSystemMessage(`Member ${memberId} joined the session`);
        if (splitRenderer) {
          splitRenderer.appendChat(notice);
        } else if (chatPrompt) {
          chatPrompt.printAbovePrompt(notice);
        } else {
          logger.success(`Member ${colors.cyan(memberId)} joined session ${colors.code(sessionId)}`);
        }
      },

      onMemberLeft: (sessionId, memberId, _isOwner) => {
        const notice = TerminalRenderer.renderSystemMessage(`Member ${memberId} left the session`);
        if (splitRenderer) {
          splitRenderer.appendChat(notice);
        } else if (chatPrompt) {
          chatPrompt.printAbovePrompt(notice);
        } else {
          logger.info(`Member ${colors.cyan(memberId)} left session ${colors.code(sessionId)}`);
        }
      },

      onError: (error) => {
        logger.error(`Session error: ${error}`);
        if (splitRenderer) {
          splitRenderer.appendChat(`✖ Session error: ${error}`);
        }
      },

      onDisconnect: (reason) => {
        logger.warn(`Disconnected from server: ${reason}`);
        if (splitRenderer) {
          splitRenderer.appendChat(`⚠️ Disconnected: ${reason}`);
        }
      },
    });

    logger.debug('Client connected, creating session...');
    client.createSession({ workspacePath, cwd: workspacePath });

    const handleExit = () => {
      if (chatPrompt) chatPrompt.close();
      logger.info('Leaving session and disconnecting...');
      adapter.dispose().catch(() => {});
      client.leaveSession();
      client.disconnect();
      process.exit(0);
    };

    process.on('SIGINT', handleExit);
    process.on('SIGTERM', handleExit);
  } catch (error) {
    logger.error('Failed to start session', error);
    console.log(colors.dim('\nTip: Is the Collagility server running?'));
    console.log(colors.cyan('  Start the server in another terminal:'));
    console.log(colors.bold('  $ collagility server start'));
    console.log(colors.dim('  or: pnpm --filter @collagility/server start\n'));
    process.exit(1);
  }
}

