import type { CLIConfig } from '../config/config.js';
import { establishConnection } from '../client/connection.js';
import { CLIProgressSpinner } from '../terminal/spinner.js';
import { CLILogger } from '../terminal/logger.js';
import { colors } from '../terminal/colors.js';
import { renderSessionHeader, TerminalRenderer } from '../terminal/renderer.js';
import { ChatPrompt } from '../terminal/chat-prompt.js';
import { TerminalStreamRenderer } from '../terminal/terminal-stream-renderer.js';
import { GeminiAIAdapter, GeminiHealthChecker } from '@collagility/adapters';
import { createStreamChunk } from '@collagility/stream';

export async function startCommand(options: Partial<CLIConfig>): Promise<void> {
  const logger = new CLILogger(options.verbose);
  const streamRenderer = new TerminalStreamRenderer();
  let chatPrompt: ChatPrompt | null = null;

  // Step 1: Check Gemini CLI availability & authentication
  console.log(colors.bold('\nChecking Gemini CLI...'));
  const isMock = Boolean(options.mockMode || process.env.GEMINI_MOCK);
  const healthChecker = new GeminiHealthChecker('gemini', isMock);
  const health = await healthChecker.checkDetailedHealth();

  if (!health.ok) {
    logger.error(`✖ Gemini CLI check failed: ${health.error}`);
    console.log(colors.dim('\nHow to fix:'));
    console.log(colors.cyan('  1. Ensure Gemini CLI is installed and added to PATH'));
    console.log(colors.cyan('  2. Run `gemini auth login` outside Collagility to authenticate\n'));
    process.exit(1);
  }

  logger.success(`✓ Gemini CLI found (${health.executable || 'PATH'})`);
  logger.success(`✓ Authentication verified`);
  logger.success(`✓ Gemini ${health.version || '1.x'}\n`);

  // Step 2: Initialize Gemini Adapter for session owner
  const adapter = new GeminiAIAdapter({ mockMode: isMock });
  try {
    await adapter.initialize();
  } catch (err) {
    logger.error('Failed to initialize local Gemini adapter', err);
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
        console.log(renderSessionHeader(sessionId, true, members.length));
        logger.info(colors.bold(`Session ID: ${colors.code(sessionId)}`));
        logger.info(colors.dim('Waiting for collaborators... (Type @gemini <prompt> for AI, or a message to chat)\n'));

        chatPrompt = new ChatPrompt(client);
        chatPrompt.start();
      },

      onChatMessage: (msg) => {
        const rendered = TerminalRenderer.renderChatMessage(msg);
        if (chatPrompt) {
          chatPrompt.printAbovePrompt(rendered);
        } else {
          console.log(rendered);
        }
      },

      onChatSystem: (msg) => {
        const rendered = TerminalRenderer.renderSystemMessage(msg);
        if (chatPrompt) {
          chatPrompt.printAbovePrompt(rendered);
        } else {
          console.log(rendered);
        }
      },

      onStreamStarted: (payload) => {
        streamRenderer.onStreamStarted(payload.streamId, payload.adapterName, payload.prompt);

        // Owner-side execution: trigger local Gemini adapter stream
        adapter
          .sendPrompt(payload.prompt)
          .then((_res: unknown) => {
            // Final chunk completion
            const finalChunk = createStreamChunk({
              streamId: payload.streamId,
              sequenceNumber: 999,
              sessionId: payload.streamId,
              sender: { id: payload.adapterName, name: payload.adapterName, role: 'ai' },
              content: '',
              isFinal: true,
            });
            client.send('ai.stream.chunk', finalChunk);
          })
          .catch((err: unknown) => {
            logger.error('Local Gemini execution failed', err);
          });
      },

      onStreamChunk: (payload) => {
        streamRenderer.renderChunk(payload);
      },

      onStreamCompleted: (payload) => {
        streamRenderer.onStreamCompleted({
          totalChunks: payload.totalChunks,
          durationMs: payload.durationMs,
        });
      },

      onStreamCancelled: (payload) => {
        streamRenderer.onStreamCancelled(payload.reason);
      },

      onStreamFailed: (payload) => {
        streamRenderer.onStreamFailed(payload.error);
      },

      onStreamError: (payload) => {
        logger.error(`AI Stream Error: ${payload.error}`);
      },

      onMemberJoined: (sessionId, memberId) => {
        const notice = TerminalRenderer.renderSystemMessage(`Member ${memberId} joined the session`);
        if (chatPrompt) {
          chatPrompt.printAbovePrompt(notice);
        } else {
          logger.success(`Member ${colors.cyan(memberId)} joined session ${colors.code(sessionId)}`);
        }
      },

      onMemberLeft: (sessionId, memberId, _isOwner) => {
        const notice = TerminalRenderer.renderSystemMessage(`Member ${memberId} left the session`);
        if (chatPrompt) {
          chatPrompt.printAbovePrompt(notice);
        } else {
          logger.info(`Member ${colors.cyan(memberId)} left session ${colors.code(sessionId)}`);
        }
      },

      onError: (error) => {
        logger.error(`Session error: ${error}`);
      },

      onDisconnect: (reason) => {
        logger.warn(`Disconnected from server: ${reason}`);
      },
    });

    logger.debug('Client connected, creating session...');
    client.createSession();

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
    process.exit(1);
  }
}
