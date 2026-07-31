import type { WebSocket } from 'ws';
import type { FastifyRequest } from 'fastify';
import type { ConnectionManager } from './client.js';
import type { Broadcaster } from './broadcaster.js';
import type { HeartbeatManager } from './heartbeat.js';
import type { MessageValidator } from '../validation/websocket.js';
import type { MessageHandler } from './message-handler.js';
import type { SessionManager } from '../sessions/session-manager.js';
import type { ServerLogger } from '../logger/logger.js';
import { createConnectedEvent, createErrorEvent } from './events.js';
import { handleLeaveSession } from '../sessions/handlers/leave-session.js';

export class WebSocketGateway {
  private connectionManager: ConnectionManager;
  private broadcaster: Broadcaster;
  private heartbeatManager: HeartbeatManager;
  private validator: MessageValidator;
  private messageHandler: MessageHandler;
  private sessionManager: SessionManager;
  private logger: ServerLogger;

  constructor(
    connectionManager: ConnectionManager,
    broadcaster: Broadcaster,
    heartbeatManager: HeartbeatManager,
    validator: MessageValidator,
    messageHandler: MessageHandler,
    sessionManager: SessionManager,
    logger: ServerLogger
  ) {
    this.connectionManager = connectionManager;
    this.broadcaster = broadcaster;
    this.heartbeatManager = heartbeatManager;
    this.validator = validator;
    this.messageHandler = messageHandler;
    this.sessionManager = sessionManager;
    this.logger = logger;
  }

  public handleConnection(socket: WebSocket, req: FastifyRequest): void {
    const client = this.connectionManager.registerClient(socket, {
      remoteAddress: req.socket.remoteAddress,
      headers: req.headers,
    });

    this.logger.info(
      { clientId: client.id, remoteAddress: req.socket.remoteAddress },
      'WebSocket connection established'
    );

    // Send connection acknowledgement
    const connectedEvent = createConnectedEvent(client.id);
    this.broadcaster.sendToClient(client.id, connectedEvent);

    // Handle WebSocket native ping/pong frames
    socket.on('pong', () => {
      this.heartbeatManager.handlePong(client.id);
    });

    // Handle incoming messages
    socket.on('message', (raw: Buffer | string) => {
      const rawString = raw.toString('utf-8');
      const validationResult = this.validator.validate(rawString);

      if (!validationResult.success) {
        this.logger.warn({ clientId: client.id, error: validationResult.error }, 'Rejecting invalid packet');
        const errorFrame = createErrorEvent(validationResult.error);
        this.broadcaster.sendToClient(client.id, errorFrame);
        return;
      }

      this.messageHandler.handleMessage(client.id, validationResult.data);
    });

    // Handle socket disconnect
    socket.on('close', (code: number, reason: Buffer) => {
      const reasonStr = reason.toString('utf-8') || `Code ${code}`;
      this.logger.info({ clientId: client.id, code, reason: reasonStr }, 'WebSocket connection closed');

      // Leave any active session upon socket close
      handleLeaveSession(client.id, this.sessionManager, this.broadcaster);

      // Remove from global connection manager
      this.connectionManager.removeClient(client.id);
    });

    // Handle socket error
    socket.on('error', (err: Error) => {
      this.logger.error({ clientId: client.id, error: err }, 'WebSocket socket error encountered');
    });
  }
}
