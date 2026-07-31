import type { CLIConfig } from '../config/config.js';
import { establishConnection } from '../client/connection.js';
import { CLIProgressSpinner } from '../terminal/spinner.js';
import { CLILogger } from '../terminal/logger.js';
import { colors } from '../terminal/colors.js';
import { renderSessionHeader, TerminalRenderer } from '../terminal/renderer.js';
import { ChatPrompt } from '../terminal/chat-prompt.js';

export async function startCommand(options: Partial<CLIConfig>): Promise<void> {
  const logger = new CLILogger(options.verbose);
  const spinner = new CLIProgressSpinner('Connecting to Collagility server...');
  let chatPrompt: ChatPrompt | null = null;

  spinner.start();

  try {
    const client = await establishConnection(options as CLIConfig, {
      onSessionCreated: (session) => {
        spinner.stop(true, 'Session created successfully');
        const members = Array.isArray(session['members']) ? session['members'] : [];
        const sessionId = String(session['id']);
        console.log(renderSessionHeader(sessionId, true, members.length));
        logger.info(colors.bold(`Session ID: ${colors.code(sessionId)}`));
        logger.info(colors.dim('Waiting for collaborators to join... (Type a message and press Enter to chat)\n'));

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
