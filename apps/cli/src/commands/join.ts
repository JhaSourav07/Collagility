import type { CLIConfig } from '../config/config.js';
import { establishConnection } from '../client/connection.js';
import { CLIProgressSpinner } from '../terminal/spinner.js';
import { CLILogger } from '../terminal/logger.js';
import { colors } from '../terminal/colors.js';
import { renderSessionHeader, renderMemberList, TerminalRenderer, type ChatRenderMessage } from '../terminal/renderer.js';
import { ChatPrompt } from '../terminal/chat-prompt.js';
import { TerminalStreamRenderer } from '../terminal/terminal-stream-renderer.js';
import { SplitTerminalRenderer } from '../terminal/split-pane-renderer.js';
import { PlanRenderer } from '../terminal/plan-renderer.js';
import { InteractivePromptRenderer } from '../terminal/interactive-prompt-renderer.js';
import { readPlanArtifact } from '../terminal/plan-reader.js';
import { DocumentRenderer } from '@collagility/renderer';

import fs from 'node:fs';
import { createConfig } from '../config/config.js';
import { TmuxSession } from '../terminal/tmux/tmux-session.js';

export async function joinCommand(rawTarget: string, options: Partial<CLIConfig> = {}): Promise<void> {
  let targetSessionId = rawTarget.trim();
  let serverOverride = options.serverUrl;

  // Support composite join target (e.g. session@192.168.1.50 or session@192.168.1.50:8080)
  if (rawTarget.includes('@')) {
    const parts = rawTarget.split('@');
    targetSessionId = parts[0].trim();
    if (!options.serverUrl && parts[1]?.trim()) {
      serverOverride = parts[1].trim();
    }
  }

  const config = createConfig({ ...options, serverUrl: serverOverride });

  const logger = new CLILogger(config.verbose);
  const streamRenderer = new TerminalStreamRenderer();
  const isInteractive = Boolean(process.stdout.isTTY || process.stdin.isTTY || process.env.FORCE_TUI || !process.env.CI);
  const splitRenderer = isInteractive
    ? new SplitTerminalRenderer({ isOwner: false, sessionId: targetSessionId })
    : null;
  const spinner = new CLIProgressSpinner(`Connecting to ${config.serverUrl} to join session '${targetSessionId}'...`);
  let chatPrompt: ChatPrompt | null = null;
  const streamAccumulator = new Map<string, string>();

  const tmuxSessionName = process.env['COLLAGILITY_TMUX_SESSION'];
  const tmuxSession = tmuxSessionName ? new TmuxSession() : null;
  const screenshareLog = process.env['COLLAGILITY_SCREENSHARE_LOG'];

  spinner.start();

  try {
    const client = await establishConnection(config, {
      onSessionJoined: (session, memberId) => {
        const sessionId = String(session['id'] || targetSessionId);
        const ownerId = String(session['ownerId'] || 'Host');
        const members = Array.isArray(session['members']) ? (session['members'] as string[]) : [];

        spinner.stop(true, `Joined session '${sessionId}'`);
        const isOwner = ownerId === memberId;

        if (splitRenderer) {
          const ink = splitRenderer.getInkRenderer();
          if (ink) {
            ink.setSessionInfo(
              sessionId,
              false,
              ownerId,
              members.map((m) => ({ name: m, isOwner: m === ownerId, isSelf: m === memberId }))
            );
            ink.setAiDriverInfo('Host AI (Screenshare)', 'Gemini 3.5 Flash', 'Remote Stream');
            ink.appendMessage({
              content: `📺 Joined session '${sessionId}' via Live AI Screenshare. Zero local tokens required.`,
              sender: 'System',
              senderRole: 'system',
            });

            ink.setOnExitSession(() => {
              handleExit();
            });

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
                    const result = readPlanArtifact(activePrompt.filePath, activePrompt.rawContent);
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
                    ink.clearInteractivePrompt();
                    ink.appendMessage({ sender: 'System', senderRole: 'system', content: `✓ Answered Question: ${match.label}` });
                    return;
                  } else {
                    client.send('ai.answer', { questionId: activePrompt.id, streamId: activePrompt.id, answer: trimmed });
                    ink.clearInteractivePrompt();
                    ink.appendMessage({ sender: 'System', senderRole: 'system', content: `✓ Answered Question: ${trimmed}` });
                    return;
                  }
                }

                if (activePrompt.type === 'confirmation') {
                  if (lower === '1' || lower === 'y' || lower === 'yes' || lower === '/yes') {
                    client.send('ai.confirmation.response', { confirmationId: activePrompt.id, streamId: activePrompt.id, approved: true });
                    ink.clearInteractivePrompt();
                    ink.appendMessage({ sender: 'System', senderRole: 'system', content: '✓ Confirmed (Yes)' });
                    return;
                  }
                  if (lower === '2' || lower === 'n' || lower === 'no' || lower === '/no') {
                    client.send('ai.confirmation.response', { confirmationId: activePrompt.id, streamId: activePrompt.id, approved: false });
                    ink.clearInteractivePrompt();
                    ink.appendMessage({ sender: 'System', senderRole: 'system', content: '✖ Confirmed (No)' });
                    return;
                  }
                }
              }

              if (trimmed.startsWith('/leave')) {
                client.leaveSession();
                process.exit(0);
              } else if (
                trimmed.startsWith('@agi') ||
                trimmed.startsWith('@agy') ||
                trimmed.startsWith('@gemini') ||
                trimmed.startsWith('/gemini')
              ) {
                client.sendChatMessage(trimmed);
                const reqName = trimmed.startsWith('@agi')
                  ? 'agi'
                  : trimmed.startsWith('@agy')
                  ? 'agy'
                  : 'gemini';
                const promptText = trimmed.replace(/^(@agi|@agy|@gemini|\/gemini)\s*/, '');
                client.sendAIPrompt(promptText || 'Hello AI', reqName);
              } else {
                client.sendChatMessage(trimmed);
              }
            });
          }
          splitRenderer.render();
        } else {
          console.log(renderSessionHeader(sessionId, isOwner, members.length));
          console.log(renderMemberList(members, ownerId));
          logger.info(colors.dim('Connected to multiplayer workspace. Observing AI stream. (Type a message and press Enter to chat)\n'));

          chatPrompt = new ChatPrompt(client, isOwner);
          chatPrompt.start();
        }
      },

      onChatMessage: (msg: ChatRenderMessage) => {
        if (
          screenshareLog &&
          msg.text &&
          (msg.text.startsWith('@agy') || msg.text.startsWith('@agi') || msg.text.startsWith('@gemini'))
        ) {
          try {
            const senderName =
              msg.senderName && msg.senderName.includes('-')
                ? msg.senderName.split('-')[0]
                : msg.senderName || 'User';
            fs.appendFileSync(screenshareLog, `\x1b[33m\n> ${senderName}: ${msg.text}\x1b[0m\n`);
          } catch {}
        }
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
          chatPrompt.printAbovePrompt(TerminalRenderer.renderChatMessage(msg));
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
          chatPrompt.printAbovePrompt(TerminalRenderer.renderSystemMessage(msg));
        } else {
          console.log(TerminalRenderer.renderSystemMessage(msg));
        }
      },

      onStreamStarted: (payload) => {
        if (screenshareLog) {
          try {
            fs.appendFileSync(
              screenshareLog,
              `\n\x1b[36m--- AI Stream Started (${payload.adapterName || 'Host AI'}) ---\x1b[0m\n`
            );
          } catch {}
        } else if (tmuxSessionName && tmuxSession) {
          tmuxSession.writeToPane(tmuxSessionName, 1, `\n\n--- AI Stream Started (${payload.adapterName || 'Host AI'}) ---\n`).catch(() => {});
        }
        if (splitRenderer) {
          const ink = splitRenderer.getInkRenderer();
          if (ink) {
            ink.startStreamMessage(payload.streamId, payload.adapterName || 'Gemini');
          }
        } else {
          streamRenderer.onStreamStarted(payload.streamId, payload.adapterName, payload.prompt);
        }
      },

      onStreamChunk: (payload) => {
        if (payload.content) {
          const current = streamAccumulator.get(payload.streamId) || '';
          streamAccumulator.set(payload.streamId, current + payload.content);
        }
        if (screenshareLog && payload.content) {
          try {
            fs.appendFileSync(screenshareLog, payload.content);
          } catch {}
        } else if (tmuxSessionName && tmuxSession && payload.content) {
          tmuxSession.writeToPane(tmuxSessionName, 1, payload.content).catch(() => {});
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

        if (screenshareLog) {
          try {
            fs.appendFileSync(
              screenshareLog,
              `\n\x1b[32m✓ Stream Finished (${payload.durationMs}ms)\x1b[0m\n\n`
            );
          } catch {}
        } else if (tmuxSessionName && tmuxSession) {
          tmuxSession.writeToPane(tmuxSessionName, 1, `\n--- Stream Finished (${payload.durationMs}ms) ---\n\n`).catch(() => {});
        }

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
        } else {
          streamRenderer.onStreamCompleted({
            totalChunks: payload.totalChunks,
            durationMs: payload.durationMs,
          });
        }
      },

      onStreamCancelled: (payload) => {
        if (splitRenderer) {
          const ink = splitRenderer.getInkRenderer();
          if (ink) {
            ink.appendMessage({
              sender: 'Gemini',
              senderRole: 'ai',
              content: `⚠️ AI Stream Cancelled: ${payload.reason}`,
            });
          }
        } else {
          streamRenderer.onStreamCancelled(payload.reason);
        }
      },

      onStreamFailed: (payload) => {
        if (splitRenderer) {
          const ink = splitRenderer.getInkRenderer();
          if (ink) {
            ink.appendMessage({
              sender: 'Gemini',
              senderRole: 'ai',
              content: `✖ AI Stream Failed: ${payload.error}`,
            });
          }
        } else {
          streamRenderer.onStreamFailed(payload.error);
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

      onMemberJoined: (_sessionId, newMemberId) => {
        const displayId = newMemberId.includes('-') ? newMemberId.split('-')[0] : newMemberId.slice(0, 8);
        if (splitRenderer) {
          const ink = splitRenderer.getInkRenderer();
          if (ink) {
            ink.appendActivity(`${displayId} joined`, 'join');
            ink.addUser({ name: displayId });
          }
        } else if (chatPrompt) {
          chatPrompt.printAbovePrompt(TerminalRenderer.renderSystemMessage(`Member ${displayId} joined the session`));
        } else {
          logger.success(`Member ${colors.cyan(displayId)} joined the session`);
        }
      },

      onMemberLeft: (_sessionId, leftMemberId, isOwner) => {
        const displayId = leftMemberId.includes('-') ? leftMemberId.split('-')[0] : leftMemberId.slice(0, 8);
        if (splitRenderer) {
          const ink = splitRenderer.getInkRenderer();
          if (ink) {
            ink.appendActivity(`${displayId} left`, 'leave');
            ink.removeUser(displayId);
          }
        } else if (chatPrompt) {
          const ownerNotice = isOwner ? ' (Owner)' : '';
          chatPrompt.printAbovePrompt(TerminalRenderer.renderSystemMessage(`Member ${displayId}${ownerNotice} left the session`));
        } else {
          const ownerNotice = isOwner ? ' (Owner)' : '';
          logger.info(`Member ${colors.cyan(displayId)}${ownerNotice} left the session`);
        }
      },

      onSessionClosed: (_sessionId, reason) => {
        if (chatPrompt) chatPrompt.close();
        if (splitRenderer) {
          const ink = splitRenderer.getInkRenderer();
          if (ink) ink.unmount();
        }
        logger.warn(`Session was closed: ${reason}`);
        client.disconnect();
        process.exit(0);
      },

      onError: (error) => {
        spinner.stop(false, `Join failed: ${error}`);
        client.disconnect();
        process.exit(1);
      },

      onDisconnect: (reason) => {
        logger.warn(`Disconnected from server: ${reason}`);
      },
    });

    logger.debug(`Client connected, joining session '${targetSessionId}'...`);
    client.joinSession(targetSessionId);

    const handleExit = () => {
      if (chatPrompt) chatPrompt.close();
      if (splitRenderer) {
        const ink = splitRenderer.getInkRenderer();
        if (ink) ink.unmount();
      }
      logger.info('Leaving session and disconnecting...');
      client.leaveSession();
      client.disconnect();
      process.exit(0);
    };

    process.on('SIGINT', handleExit);
    process.on('SIGTERM', handleExit);

    // Suppress SIGWINCH (terminal resize / tmux tab switch) so the left pane
    // process never crashes from a zero-column resize event.
    process.on('SIGWINCH', () => {});

    // Swallow EPIPE on stdout/stderr — tmux briefly disconnects the pty on
    // tab switch, which can trigger an EPIPE that would otherwise kill the process.
    process.stdout.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code !== 'EPIPE') throw err;
    });
    process.stderr.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code !== 'EPIPE') throw err;
    });
  } catch (error) {
    logger.error('Failed to join session', error);
    process.exit(1);
  }
}
