import type { CLIConfig } from '../config/config.js';
import { establishConnection } from '../client/connection.js';
import { CLIProgressSpinner } from '../terminal/spinner.js';
import { CLILogger } from '../terminal/logger.js';
import { colors } from '../terminal/colors.js';
import { renderSessionHeader, TerminalRenderer } from '../terminal/renderer.js';
import { ChatPrompt } from '../terminal/chat-prompt.js';
import { TerminalStreamRenderer } from '../terminal/terminal-stream-renderer.js';
import { SplitTerminalRenderer } from '../terminal/split-pane-renderer.js';
import { PlanRenderer } from '../terminal/plan-renderer.js';
import { InteractivePromptRenderer } from '../terminal/interactive-prompt-renderer.js';
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
    await adapter.start();
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
          splitRenderer.setSessionInfo(sessionId, true, members.length, activeWorkspace);
          splitRenderer.setAiInfo(binaryLabel, 'Claude 3.5 (via agy CLI)', 'Connected');
          splitRenderer.appendChat(sessionInfo);
          splitRenderer.appendChat('AI Workspace Ready. Waiting for collaborators...');
          splitRenderer.appendChat('AI Commands: @agi <prompt> | @agy <prompt> | @gemini <prompt>');
          splitRenderer.render();
        } else {
          console.log(header);
          logger.info(colors.bold(`Session ID: ${colors.code(sessionId)}`));
          logger.info(colors.bold(`Workspace:\n${colors.cyan(activeWorkspace)}`));
          logger.success('AI Workspace Ready.');
          logger.info(colors.dim('Waiting for collaborators... (Type @agi <prompt>, @agy <prompt>, or @gemini <prompt> for AI, or a message to chat)\n'));
        }

        chatPrompt = new ChatPrompt(client, true);
        chatPrompt.setStreamRenderer(streamRenderer);
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
          splitRenderer.appendChat(`🤖 ${payload.adapterName.toUpperCase()} Stream Started: "${payload.prompt}"`);
        }

        const reqName = payload.adapterName?.toLowerCase();
        const targetAdapter =
          reqName && reqName !== 'agi' && reqName !== 'active' && registry.has(reqName)
            ? (registry.get(reqName) || registry.getActive() || adapter)
            : (registry.getActive() || adapter);

        let seq = 0;
        const currentSessionId = client.getSessionId() || payload.streamId;

        const onChunk = (content: string) => {
          if (typeof content === 'string' && content.length > 0) {
            const streamChunk = createStreamChunk({
              streamId: payload.streamId,
              sequenceNumber: seq++,
              sessionId: currentSessionId,
              sender: { id: payload.adapterName, name: payload.adapterName, role: 'ai' },
              content,
              isFinal: false,
            });
            client.send('ai.stream.chunk', streamChunk);
          }
        };

        const onPlan = (planData: any) => {
          client.send('ai.plan', {
            planId: planData.planId || `plan-${Date.now()}`,
            streamId: payload.streamId,
            title: planData.title || 'AI Implementation Plan Proposed',
            steps: planData.steps || [],
            filePath: planData.filePath,
            content: planData.content,
            requiresApproval: true,
          });
        };

        const onQuestion = (qData: any) => {
          client.send('ai.question', {
            questionId: qData.questionId || `q-${Date.now()}`,
            streamId: payload.streamId,
            prompt: qData.prompt || qData.content,
            options: qData.options || ['1. Proceed with defaults', '2. Modify plan', '3. Ask follow-up question'],
          });
        };

        const onConfirmation = (cData: any) => {
          client.send('ai.confirmation', {
            confirmationId: cData.confirmationId || `conf-${Date.now()}`,
            streamId: payload.streamId,
            prompt: cData.prompt || cData.content,
            defaultValue: true,
          });
        };

        targetAdapter.on('chunk' as any, onChunk);
        targetAdapter.on('plan' as any, onPlan);
        targetAdapter.on('question' as any, onQuestion);
        targetAdapter.on('confirmation' as any, onConfirmation);

        targetAdapter
          .sendPrompt(payload.prompt)
          .then((resEnvelope: any) => {
            targetAdapter.off('chunk' as any, onChunk);
            targetAdapter.off('plan' as any, onPlan);
            targetAdapter.off('question' as any, onQuestion);
            targetAdapter.off('confirmation' as any, onConfirmation);
            const fullText = resEnvelope?.payload?.responseText || '';

            if (seq === 0 && fullText) {
              const chunks = fullText.match(/.{1,15}/g) || [fullText];
              for (const chunkContent of chunks) {
                const streamChunk = createStreamChunk({
                  streamId: payload.streamId,
                  sequenceNumber: seq++,
                  sessionId: currentSessionId,
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
              sessionId: currentSessionId,
              sender: { id: payload.adapterName, name: payload.adapterName, role: 'ai' },
              content: '',
              isFinal: true,
            });
            client.send('ai.stream.chunk', finalChunk);
          })
          .catch((err: unknown) => {
            targetAdapter.off('chunk' as any, onChunk);
            targetAdapter.off('plan' as any, onPlan);
            targetAdapter.off('question' as any, onQuestion);
            targetAdapter.off('confirmation' as any, onConfirmation);
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
        if (splitRenderer) {
          splitRenderer.appendPtyData(payload.content);
        } else {
          streamRenderer.renderChunk(payload);
        }
      },

      onStreamCompleted: (payload) => {
        streamRenderer.onStreamCompleted({
          totalChunks: payload.totalChunks,
          durationMs: payload.durationMs,
        });
        if (splitRenderer) {
          splitRenderer.appendChat(`✔ AI Stream Completed (${payload.durationMs}ms)\n`);
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

      onPlan: (payload) => {
        const rendered = PlanRenderer.renderPlan(payload);
        if (splitRenderer) {
          splitRenderer.appendChat(rendered);
        } else if (chatPrompt) {
          chatPrompt.printAbovePrompt(rendered);
        } else {
          console.log(rendered);
        }
        if (chatPrompt) {
          chatPrompt.setInteractiveContext({
            type: 'plan',
            id: payload.planId,
            streamId: payload.streamId,
            filePath: (payload as any).filePath,
          });
        }
      },

      onQuestion: (payload) => {
        const rendered = InteractivePromptRenderer.renderQuestion(payload.prompt, payload.options);
        if (splitRenderer) {
          splitRenderer.appendChat(rendered);
        } else if (chatPrompt) {
          chatPrompt.printAbovePrompt(rendered);
        } else {
          console.log(rendered);
        }
        if (chatPrompt) {
          chatPrompt.setInteractiveContext({ type: 'question', id: payload.questionId, streamId: payload.streamId });
        }
      },

      onConfirmation: (payload) => {
        const rendered = InteractivePromptRenderer.renderConfirmation(payload.prompt, payload.defaultValue);
        if (splitRenderer) {
          splitRenderer.appendChat(rendered);
        } else if (chatPrompt) {
          chatPrompt.printAbovePrompt(rendered);
        } else {
          console.log(rendered);
        }
        if (chatPrompt) {
          chatPrompt.setInteractiveContext({ type: 'confirmation', id: payload.confirmationId, streamId: payload.streamId });
        }
      },

      onSelection: (payload) => {
        const rendered = InteractivePromptRenderer.renderSelectionMenu(payload.title, payload.options);
        if (splitRenderer) {
          splitRenderer.appendChat(rendered);
        } else if (chatPrompt) {
          chatPrompt.printAbovePrompt(rendered);
        } else {
          console.log(rendered);
        }
        if (chatPrompt) {
          chatPrompt.setInteractiveContext({ type: 'selection', id: payload.selectionId, streamId: payload.streamId });
        }
      },

      onToolRequest: (payload) => {
        const rendered = InteractivePromptRenderer.renderToolRequest(payload.toolName, payload.args);
        if (splitRenderer) {
          splitRenderer.appendChat(rendered);
        } else if (chatPrompt) {
          chatPrompt.printAbovePrompt(rendered);
        } else {
          console.log(rendered);
        }
        if (chatPrompt) {
          chatPrompt.setInteractiveContext({ type: 'tool', id: payload.toolId, streamId: payload.streamId });
        }
      },

      onFrame: (frame) => {
        if (frame.type === 'ai.plan.approve' || frame.type === 'ai.tool.approved') {
          adapter.sendInput('y').catch(() => {});
        } else if (frame.type === 'ai.plan.reject' || frame.type === 'ai.tool.rejected') {
          adapter.sendInput('n').catch(() => {});
        } else if (frame.type === 'ai.confirmation.response') {
          const approved = (frame.payload as any)?.approved !== false;
          adapter.sendInput(approved ? 'y' : 'n').catch(() => {});
        } else if (frame.type === 'ai.selection.response') {
          const key = (frame.payload as any)?.selectedKey || '1';
          adapter.sendInput(key).catch(() => {});
        } else if (frame.type === 'ai.answer') {
          const ans = (frame.payload as any)?.answer || '';
          adapter.sendInput(ans).catch(() => {});
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

