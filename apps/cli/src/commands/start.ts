import type { CLIConfig } from '../config/config.js';
import { establishConnection } from '../client/connection.js';
import { CLIProgressSpinner } from '../terminal/spinner.js';
import { CLILogger } from '../terminal/logger.js';
import { colors } from '../terminal/colors.js';
import { renderSessionHeader, TerminalRenderer, type ChatRenderMessage } from '../terminal/renderer.js';
import { ChatPrompt } from '../terminal/chat-prompt.js';
import { TerminalStreamRenderer } from '../terminal/terminal-stream-renderer.js';
import { SplitTerminalRenderer } from '../terminal/split-pane-renderer.js';
import { PlanRenderer } from '../terminal/plan-renderer.js';
import { InteractivePromptRenderer } from '../terminal/interactive-prompt-renderer.js';
import { readPlanArtifact } from '../terminal/plan-reader.js';
import { DocumentRenderer } from '@collagility/renderer';
import { GeminiAIAdapter, GeminiHealthChecker, AdapterRegistry } from '@collagility/adapters';
import { createStreamChunk } from '@collagility/stream';

export async function startCommand(options: Partial<CLIConfig>): Promise<void> {
  const logger = new CLILogger(options.verbose);
  const streamRenderer = new TerminalStreamRenderer();
  const isInteractive = Boolean(process.stdout.isTTY || process.stdin.isTTY || process.env.FORCE_TUI || !process.env.CI);
  const splitRenderer = isInteractive ? new SplitTerminalRenderer({ isOwner: true }) : null;
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

  const spinner = new CLIProgressSpinner('Initializing multiplayer server connection...');
  const streamAccumulator = new Map<string, string>();
  spinner.start();

  try {
    const client = await establishConnection(options as CLIConfig, {
      onSessionCreated: (session) => {
        spinner.stop(true, 'Session created successfully');
        const members = Array.isArray(session['members']) ? session['members'] : [];
        const sessionId = String(session['id']);
        const activeWorkspace = String(session['workspacePath'] || (session['metadata'] as any)?.['workspacePath'] || workspacePath);

        if (splitRenderer) {
          const ink = splitRenderer.getInkRenderer();
          if (ink) {
            const currentUserName = process.env.USER || 'Sourav';
            const defaultModel = binaryLabel === 'agy' || binaryLabel === 'antigravity' ? 'Gemini 3.5 Flash' : 'gemini-2.5-pro';
            ink.setSessionInfo(sessionId, true, currentUserName, [
              { name: currentUserName, isOwner: true, isSelf: true },
            ]);
            ink.setAiDriverInfo(binaryLabel, defaultModel, 'Code');
            ink.appendMessage({ content: `Connected to server`, sender: 'System', senderRole: 'system' });
            ink.appendMessage({ content: `Session created: ${sessionId}`, sender: 'System', senderRole: 'system' });

            ink.setCommandHandler((input: string) => {
              const trimmed = input.trim();
              if (!trimmed) return;

              const activePrompt = ink.getInteractivePrompt();

              if (activePrompt) {
                const lower = trimmed.toLowerCase();

                if (activePrompt.type === 'plan') {
                  if (lower === 'y' || lower === 'yes' || lower === '1' || lower === 'accept' || lower === '/approve') {
                    client.send('ai.plan.approve', { planId: activePrompt.id, streamId: activePrompt.id });
                    ink.popInteractivePrompt();
                    ink.appendMessage({ sender: 'System', senderRole: 'system', content: '✓ Implementation Plan Approved' });
                    return;
                  }
                  if (lower === 'r' || lower === 'read' || lower === 'view' || lower === '/read') {
                    const result = readPlanArtifact(activePrompt.filePath, activePrompt.rawContent, workspacePath);
                    const docRenderer = new DocumentRenderer({ maxWidth: 90, theme: 'dark' });
                    const formattedContent = docRenderer.renderMarkdown(result.content);
                    const header = result.ok
                      ? `📖 Reading Plan Artifact (${result.filePath}):`
                      : `📖 Plan Content:`;

                    ink.appendMessage({
                      sender: 'System',
                      senderRole: 'system',
                      content: `${header}\n\n${formattedContent}`,
                    });
                    return;
                  }
                  if (lower === 'n' || lower === 'no' || lower === '2' || lower === 'reject' || lower === '/reject') {
                    client.send('ai.plan.reject', { planId: activePrompt.id, streamId: activePrompt.id, reason: 'Rejected by user' });
                    ink.popInteractivePrompt();
                    ink.appendMessage({ sender: 'System', senderRole: 'system', content: '✖ Implementation Plan Rejected' });
                    return;
                  }
                  if (lower === '3') {
                    client.send('ai.plan.reject', { planId: activePrompt.id, streamId: activePrompt.id, reason: 'Ask follow-up question' });
                    ink.popInteractivePrompt();
                    ink.appendMessage({ sender: 'System', senderRole: 'system', content: '✓ Plan Rejected for Follow-up' });
                    return;
                  }
                }

                if (activePrompt.type === 'question' || activePrompt.type === 'selection') {
                  const match = activePrompt.options.find(
                    (o) => o.key === trimmed || o.key.toLowerCase() === lower
                  ) || activePrompt.options[parseInt(trimmed, 10) - 1];

                  if (match) {
                    client.send('ai.answer', { questionId: activePrompt.id, streamId: activePrompt.id, answer: match.label });
                    client.send('ai.selection.response', { selectionId: activePrompt.id, streamId: activePrompt.id, selectedKey: match.key });
                    ink.popInteractivePrompt();
                    ink.appendMessage({ sender: 'System', senderRole: 'system', content: `✓ Selected Option: ${match.label}` });
                    return;
                  } else {
                    // Custom text answer to AI question
                    client.send('ai.answer', { questionId: activePrompt.id, streamId: activePrompt.id, answer: trimmed });
                    ink.popInteractivePrompt();
                    ink.appendMessage({ sender: 'System', senderRole: 'system', content: `✓ Answered Question: ${trimmed}` });
                    return;
                  }
                }

                if (activePrompt.type === 'confirmation') {
                  if (lower === '1' || lower === 'y' || lower === 'yes' || lower === '/yes') {
                    client.send('ai.confirmation.response', { confirmationId: activePrompt.id, streamId: activePrompt.id, approved: true });
                    ink.popInteractivePrompt();
                    ink.appendMessage({ sender: 'System', senderRole: 'system', content: '✓ Confirmed (Yes)' });
                    return;
                  }
                  if (lower === '2' || lower === 'n' || lower === 'no' || lower === '/no') {
                    client.send('ai.confirmation.response', { confirmationId: activePrompt.id, streamId: activePrompt.id, approved: false });
                    ink.popInteractivePrompt();
                    ink.appendMessage({ sender: 'System', senderRole: 'system', content: '✖ Confirmed (No)' });
                    return;
                  }
                }
              }

              if (trimmed.startsWith('/leave')) {
                client.leaveSession();
                process.exit(0);
              } else if (trimmed.startsWith('/clear')) {
                ink.clearInteractivePrompt();
              } else if (trimmed.startsWith('/driver') || trimmed.startsWith('/model') || trimmed.startsWith('/mode')) {
                const parts = trimmed.split(/\s+/);
                const subCmd = parts[0];
                const arg1 = parts[1];
                const arg2 = parts[2];

                if (subCmd === '/model' && arg1) {
                  ink.setAiDriverInfo(binaryLabel, arg1);
                  ink.appendMessage({ sender: 'System', senderRole: 'system', content: `✓ AI Model updated to '${arg1}'` });
                  return;
                }
                if (subCmd === '/mode') {
                  const targetMode = arg1?.toLowerCase();
                  if (targetMode === 'manual' || targetMode === 'accept-edits' || targetMode === 'accept' || targetMode === 'plan-only' || targetMode === 'plan' || targetMode === 'auto') {
                    const normMode = targetMode === 'accept' ? 'accept-edits' : targetMode === 'plan' ? 'plan-only' : (targetMode as any);
                    ink.setSecurityMode(normMode);
                    adapter.setSecurityMode(normMode);
                  } else {
                    const newMode = ink.cycleSecurityMode();
                    adapter.setSecurityMode(newMode);
                  }
                  return;
                }

                if (subCmd === '/driver') {
                  const newDriver = arg1 || binaryLabel;
                  const newModel = arg2 || (newDriver === 'agy' ? 'Gemini 3.5 Flash' : 'gemini-2.5-pro');
                  ink.setAiDriverInfo(newDriver, newModel, 'Code');
                  ink.appendMessage({
                    sender: 'System',
                    senderRole: 'system',
                    content: `✓ AI Driver set to ${newDriver} (${newModel})`,
                  });
                  return;
                }
              } else if (
                trimmed.startsWith('@agi') ||
                trimmed.startsWith('@agy') ||
                trimmed.startsWith('@gemini') ||
                trimmed.startsWith('/gemini')
              ) {
                // Broadcast user chat message so prompt is displayed in chat feed
                client.sendChatMessage(trimmed);
                const reqName = trimmed.startsWith('@agi')
                  ? 'agi'
                  : trimmed.startsWith('@agy')
                  ? 'agy'
                  : 'gemini';
                const promptText = trimmed.replace(/^(@agi|@agy|@gemini|\/gemini)\s*/, '');
                client.sendAIPrompt(promptText || 'Hello AI', reqName);
              } else if (trimmed.startsWith('/')) {
                ink.appendMessage({ content: `Command executed: ${trimmed}`, sender: 'System', senderRole: 'system' });
              } else {
                client.sendChatMessage(trimmed);
              }
            });
          }
          splitRenderer.render();
        } else {
          const header = renderSessionHeader(sessionId, true, members.length);
          console.log(header);
          logger.info(colors.bold(`Session ID: ${colors.code(sessionId)}`));
          logger.info(colors.bold(`Workspace:\n${colors.cyan(activeWorkspace)}`));
          logger.success('AI Workspace Ready.');
          logger.info(colors.dim('Waiting for collaborators... (Type @agi <prompt>, @agy <prompt>, or @gemini <prompt> for AI, or a message to chat)\n'));

          chatPrompt = new ChatPrompt(client, true);
          chatPrompt.setStreamRenderer(streamRenderer);
          chatPrompt.start();
        }
      },

      onChatMessage: (msg: ChatRenderMessage) => {
        if (splitRenderer) {
          const ink = splitRenderer.getInkRenderer();
          if (ink) {
            ink.appendMessage({
              sender: msg.senderName || msg.senderId || 'User',
              senderRole: 'user',
              content: msg.text,
            });
          }
        } else if (chatPrompt) {
          const rendered = TerminalRenderer.renderChatMessage(msg);
          chatPrompt.printAbovePrompt(rendered);
        } else {
          console.log(TerminalRenderer.renderChatMessage(msg));
        }
      },

      onChatSystem: (msg) => {
        if (splitRenderer) {
          const ink = splitRenderer.getInkRenderer();
          if (ink) {
            ink.appendMessage({
              sender: 'System',
              senderRole: 'system',
              content: msg,
            });
          }
        } else if (chatPrompt) {
          const rendered = TerminalRenderer.renderSystemMessage(msg);
          chatPrompt.printAbovePrompt(rendered);
        } else {
          console.log(TerminalRenderer.renderSystemMessage(msg));
        }
      },

      onStreamStarted: (payload) => {
        streamRenderer.onStreamStarted(payload.streamId, payload.adapterName, payload.prompt);
        if (splitRenderer) {
          const ink = splitRenderer.getInkRenderer();
          if (ink) {
            ink.startStreamMessage(payload.streamId, payload.adapterName || 'Gemini');
          }
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

        const onPermissionRequired = (evt: any) => {
          const req = evt.payload;
          if (splitRenderer) {
            const ink = splitRenderer.getInkRenderer();
            if (ink) {
              ink.pushPermissionPrompt(req, (decision) => {
                targetAdapter.resolvePermission(req.id, decision);
              });
            }
          }
        };

        targetAdapter.on('chunk' as any, onChunk);
        targetAdapter.on('plan' as any, onPlan);
        targetAdapter.on('question' as any, onQuestion);
        targetAdapter.on('confirmation' as any, onConfirmation);
        targetAdapter.on('PERMISSION_REQUIRED' as any, onPermissionRequired);

        targetAdapter
          .sendPrompt(payload.prompt)
          .then((resEnvelope: any) => {
            targetAdapter.off('chunk' as any, onChunk);
            targetAdapter.off('plan' as any, onPlan);
            targetAdapter.off('question' as any, onQuestion);
            targetAdapter.off('confirmation' as any, onConfirmation);
            targetAdapter.off('PERMISSION_REQUIRED' as any, onPermissionRequired);

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
            targetAdapter.off('PERMISSION_REQUIRED' as any, onPermissionRequired);
            const errorMsg = err instanceof Error ? err.message : String(err);

            logger.error('Local AI execution failed', err);
            streamRenderer.onStreamFailed(errorMsg);
            if (splitRenderer) {
              const ink = splitRenderer.getInkRenderer();
              if (ink) {
                ink.appendMessage({
                  sender: 'Gemini',
                  senderRole: 'ai',
                  content: `✖ AI Execution Error: ${errorMsg}`,
                });
              }
            }
            try {
              client.send('ai.stream.failed', { streamId: payload.streamId, error: errorMsg, sessionId: payload.streamId });
            } catch {
              // Ignore socket send errors
            }
          });
      },

      onStreamChunk: (payload) => {
        if (payload.content) {
          const current = streamAccumulator.get(payload.streamId) || '';
          streamAccumulator.set(payload.streamId, current + payload.content);
        }
        if (splitRenderer) {
          const ink = splitRenderer.getInkRenderer();
          if (ink && payload.content) {
            ink.appendStreamChunk(payload.streamId, payload.sender?.name || 'Gemini', payload.content);
          }
        } else {
          streamRenderer.renderChunk(payload);
        }
      },

      onStreamCompleted: (payload) => {
        const fullContent = streamAccumulator.get(payload.streamId) || '';
        streamAccumulator.delete(payload.streamId);

        streamRenderer.onStreamCompleted({
          totalChunks: payload.totalChunks,
          durationMs: payload.durationMs,
        });
        if (splitRenderer) {
          const ink = splitRenderer.getInkRenderer();
          if (ink) {
            ink.completeStreamMessage(payload.streamId, payload.durationMs);

            const lower = fullContent.toLowerCase();
            const hasPlan = lower.includes('implementation plan') || lower.includes('plan artifact') || (lower.includes('plan') && lower.includes('.md'));
            const hasQuestion = lower.includes('key decisions') || lower.includes('would you like') || lower.includes('1. interactive');

            if (hasPlan) {
              const fileMatch = fullContent.match(/([a-zA-Z0-9_-]+\.md)/);
              const filePath = fileMatch ? fileMatch[1] : 'implementation_plan.md';

              ink.pushInteractivePrompt({
                id: `plan-auto-${payload.streamId}`,
                type: 'plan',
                title: 'Implementation Plan Proposed',
                filePath,
                rawContent: fullContent,
                options: [
                  { key: 'y', label: 'Accept & Proceed' },
                  { key: 'r', label: 'Read Plan Details' },
                  { key: 'n', label: 'Reject & Modify' },
                ],
              });
            }

            if (hasQuestion) {
              ink.pushInteractivePrompt({
                id: `question-auto-${payload.streamId}`,
                type: 'question',
                title: 'Key Decisions & Options',
                options: [
                  { key: '1', label: 'Proceed with defaults' },
                  { key: '2', label: 'Modify plan' },
                  { key: '3', label: 'Ask follow-up question' },
                ],
              });
            }
          }
        }
      },

      onStreamCancelled: (payload) => {
        streamRenderer.onStreamCancelled(payload.reason);
        if (splitRenderer) {
          const ink = splitRenderer.getInkRenderer();
          if (ink) {
            ink.appendMessage({
              sender: 'Gemini',
              senderRole: 'ai',
              content: `⚠️ AI Stream Cancelled: ${payload.reason}`,
            });
          }
        }
      },

      onStreamFailed: (payload) => {
        streamRenderer.onStreamFailed(payload.error);
        if (splitRenderer) {
          const ink = splitRenderer.getInkRenderer();
          if (ink) {
            ink.appendMessage({
              sender: 'Gemini',
              senderRole: 'ai',
              content: `✖ AI Stream Failed: ${payload.error}`,
            });
          }
        }
      },

      onStreamError: (payload) => {
        logger.error(`AI Stream Error: ${payload.error}`);
      },

      onPlan: (payload) => {
        const rendered = PlanRenderer.renderPlan(payload);
        if (splitRenderer) {
          const ink = splitRenderer.getInkRenderer();
          if (ink) {
            ink.appendMessage({ sender: 'Gemini', senderRole: 'ai', content: rendered });
            ink.setInteractivePrompt({
              id: payload.planId,
              type: 'plan',
              title: payload.title || 'Implementation Plan Proposed',
              filePath: (payload as any).planPath || (payload as any).filePath,
              rawContent: rendered,
              options: [
                { key: 'y', label: 'Accept & Proceed' },
                { key: 'r', label: 'Read Plan Details' },
                { key: 'n', label: 'Reject & Modify' },
              ],
            });
          }
        } else if (chatPrompt) {
          chatPrompt.printAbovePrompt(rendered);
        } else {
          console.log(rendered);
        }
      },

      onQuestion: (payload) => {
        const rendered = InteractivePromptRenderer.renderQuestion(payload.prompt, payload.options);
        if (splitRenderer) {
          const ink = splitRenderer.getInkRenderer();
          if (ink) {
            ink.appendMessage({ sender: 'Gemini', senderRole: 'ai', content: rendered });
            const opts = (payload.options || []).map((opt: string, i: number) => ({
              key: String(i + 1),
              label: opt,
            }));
            ink.setInteractivePrompt({
              id: payload.questionId,
              type: 'question',
              title: payload.prompt,
              options: opts.length > 0 ? opts : [{ key: '1', label: 'Proceed with defaults' }],
            });
          }
        } else if (chatPrompt) {
          chatPrompt.printAbovePrompt(rendered);
        } else {
          console.log(rendered);
        }
      },

      onConfirmation: (payload) => {
        const rendered = InteractivePromptRenderer.renderConfirmation(payload.prompt, payload.defaultValue);
        if (splitRenderer) {
          const ink = splitRenderer.getInkRenderer();
          if (ink) {
            ink.appendMessage({ sender: 'Gemini', senderRole: 'ai', content: rendered });
            ink.setInteractivePrompt({
              id: payload.confirmationId,
              type: 'confirmation',
              title: payload.prompt,
              options: [
                { key: '1', label: 'Yes (type 1 or y)' },
                { key: '2', label: 'No (type 2 or n)' },
              ],
            });
          }
        } else if (chatPrompt) {
          chatPrompt.printAbovePrompt(rendered);
        } else {
          console.log(rendered);
        }
      },

      onSelection: (payload) => {
        const rendered = InteractivePromptRenderer.renderSelectionMenu(payload.title, payload.options);
        if (splitRenderer) {
          const ink = splitRenderer.getInkRenderer();
          if (ink) {
            ink.appendMessage({ sender: 'Gemini', senderRole: 'ai', content: rendered });
            const opts = (payload.options || []).map((opt: any) => ({
              key: opt.key,
              label: opt.label,
            }));
            ink.setInteractivePrompt({
              id: payload.selectionId,
              type: 'selection',
              title: payload.title,
              options: opts,
            });
          }
        } else if (chatPrompt) {
          chatPrompt.printAbovePrompt(rendered);
        } else {
          console.log(rendered);
        }
      },

      onToolRequest: (payload) => {
        const rendered = InteractivePromptRenderer.renderToolRequest(payload.toolName, payload.args);
        if (splitRenderer) {
          const ink = splitRenderer.getInkRenderer();
          if (ink) {
            ink.appendMessage({ sender: 'Gemini', senderRole: 'ai', content: rendered });
          }
        } else if (chatPrompt) {
          chatPrompt.printAbovePrompt(rendered);
        } else {
          console.log(rendered);
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
        if (splitRenderer) {
          const ink = splitRenderer.getInkRenderer();
          if (ink) {
            ink.appendActivity(`${memberId} joined`, 'join');
            ink.addUser({ name: memberId });
          }
        } else if (chatPrompt) {
          const notice = TerminalRenderer.renderSystemMessage(`Member ${memberId} joined the session`);
          chatPrompt.printAbovePrompt(notice);
        } else {
          logger.success(`Member ${colors.cyan(memberId)} joined session ${colors.code(sessionId)}`);
        }
      },

      onMemberLeft: (sessionId, memberId, _isOwner) => {
        if (splitRenderer) {
          const ink = splitRenderer.getInkRenderer();
          if (ink) {
            ink.appendActivity(`${memberId} left`, 'leave');
            ink.removeUser(memberId);
          }
        } else if (chatPrompt) {
          const notice = TerminalRenderer.renderSystemMessage(`Member ${memberId} left the session`);
          chatPrompt.printAbovePrompt(notice);
        } else {
          logger.info(`Member ${colors.cyan(memberId)} left session ${colors.code(sessionId)}`);
        }
      },

      onError: (error) => {
        logger.error(`Session error: ${error}`);
        if (splitRenderer) {
          const ink = splitRenderer.getInkRenderer();
          if (ink) {
            ink.appendMessage({ sender: 'System', senderRole: 'system', content: `✖ Session error: ${error}` });
          }
        }
      },

      onDisconnect: (reason) => {
        logger.warn(`Disconnected from server: ${reason}`);
        if (splitRenderer) {
          const ink = splitRenderer.getInkRenderer();
          if (ink) {
            ink.appendMessage({ sender: 'System', senderRole: 'system', content: `⚠️ Disconnected: ${reason}` });
          }
        }
      },
    });

    logger.debug('Client connected, creating session...');
    client.createSession({ workspacePath, cwd: workspacePath });

    const handleExit = () => {
      if (chatPrompt) chatPrompt.close();
      if (splitRenderer) {
        const ink = splitRenderer.getInkRenderer();
        if (ink) ink.unmount();
      }
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
