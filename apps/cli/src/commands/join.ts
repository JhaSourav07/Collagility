import type { CLIConfig } from '../config/config.js';
import { establishConnection } from '../client/connection.js';
import { CLIProgressSpinner } from '../terminal/spinner.js';
import { CLILogger } from '../terminal/logger.js';
import { colors } from '../terminal/colors.js';
import { renderSessionHeader, renderMemberList } from '../terminal/renderer.js';

export async function joinCommand(targetSessionId: string, options: Partial<CLIConfig>): Promise<void> {
  const logger = new CLILogger(options.verbose);
  const spinner = new CLIProgressSpinner(`Connecting to server to join session '${targetSessionId}'...`);
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
        logger.info(colors.dim('Connected to multiplayer workspace. (Press Ctrl+C to leave)'));
      },

      onMemberJoined: (_sessionId, newMemberId) => {
        logger.success(`Member ${colors.cyan(newMemberId)} joined the session`);
      },

      onMemberLeft: (_sessionId, leftMemberId, isOwner) => {
        const ownerNotice = isOwner ? ' (Owner)' : '';
        logger.info(`Member ${colors.cyan(leftMemberId)}${ownerNotice} left the session`);
      },

      onSessionClosed: (_sessionId, reason) => {
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
      logger.info('Leaving session and disconnecting...');
      client.leaveSession();
      client.disconnect();
      process.exit(0);
    };

    process.on('SIGINT', handleExit);
    process.on('SIGTERM', handleExit);
  } catch (error) {
    logger.error(`Failed to join session '${targetSessionId}'`, error);
    process.exit(1);
  }
}
