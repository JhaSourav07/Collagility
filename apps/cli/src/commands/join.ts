import type { CLIConfig } from '../config/config.js';
import { establishConnection } from '../client/connection.js';
import { CLIProgressSpinner } from '../terminal/spinner.js';
import { CLILogger } from '../terminal/logger.js';
import { colors } from '../terminal/colors.js';
import { renderSessionHeader, renderMemberList, TerminalRenderer } from '../terminal/renderer.js';
import { ChatPrompt } from '../terminal/chat-prompt.js';
import { TerminalStreamRenderer } from '../terminal/terminal-stream-renderer.js';

export async function joinCommand(targetSessionId: string, options: Partial<CLIConfig>): Promise<void> {
  const logger = new CLILogger(options.verbose);
  const streamRenderer = new TerminalStreamRenderer();
  const spinner = new CLIProgressSpinner(`Connecting to server to join session '${targetSessionId}'...`);
  let chatPrompt: ChatPrompt | null = null;

  spinner.start();

  try {
    const client = await establishConnection(options as CLIConfig, {
      onSessionJoined: (session, memberId) => {
        const sessionId = String(session['id'] || targetSessionId);
        const ownerId = String(session['ownerId'] || '');
        const members = Array.isArray(session['members']) ? (session['members'] as string[]) : [];

        spinner.stop(true, `Joined session '${sessionId}'`);
        const isOwner = ownerId === memberId;
        console.log(renderSessionHeader(sessionId, isOwner, members.length));
        console.log(renderMemberList(members, ownerId));
        logger.info(colors.dim('Connected to multiplayer workspace. Observing AI stream. (Type a message and press Enter to chat)\n'));

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

      onMemberJoined: (_sessionId, newMemberId) => {
        const notice = TerminalRenderer.renderSystemMessage(`Member ${newMemberId} joined the session`);
        if (chatPrompt) {
          chatPrompt.printAbovePrompt(notice);
        } else {
          logger.success(`Member ${colors.cyan(newMemberId)} joined the session`);
        }
      },

      onMemberLeft: (_sessionId, leftMemberId, isOwner) => {
        const ownerNotice = isOwner ? ' (Owner)' : '';
        const notice = TerminalRenderer.renderSystemMessage(`Member ${leftMemberId}${ownerNotice} left the session`);
        if (chatPrompt) {
          chatPrompt.printAbovePrompt(notice);
        } else {
          logger.info(`Member ${colors.cyan(leftMemberId)}${ownerNotice} left the session`);
        }
      },

      onSessionClosed: (_sessionId, reason) => {
        if (chatPrompt) chatPrompt.close();
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
      logger.info('Leaving session and disconnecting...');
      client.leaveSession();
      client.disconnect();
      process.exit(0);
    };

    process.on('SIGINT', handleExit);
    process.on('SIGTERM', handleExit);
  } catch (error) {
    logger.error('Failed to join session', error);
    process.exit(1);
  }
}
