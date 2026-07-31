import Fastify, { type FastifyInstance } from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import type { WebSocket } from 'ws';
import { logger } from './logger/logger.js';
import { ConnectionManager } from './websocket/client.js';
import { Broadcaster } from './websocket/broadcaster.js';
import { HeartbeatManager } from './websocket/heartbeat.js';
import { MessageValidator } from './validation/websocket.js';
import { MessageHandler } from './websocket/message-handler.js';
import { WebSocketGateway } from './websocket/gateway.js';
import { SessionStore } from './sessions/session-store.js';
import { HumanReadableSessionIdGenerator } from './sessions/id-generator.js';
import { SessionManager } from './sessions/session-manager.js';

export interface ServerInstance {
  app: FastifyInstance;
  connectionManager: ConnectionManager;
  broadcaster: Broadcaster;
  heartbeatManager: HeartbeatManager;
  sessionManager: SessionManager;
  validator: MessageValidator;
  messageHandler: MessageHandler;
  gateway: WebSocketGateway;
  listen: (port?: number, host?: string) => Promise<string>;
  close: () => Promise<void>;
}

export function buildServer(): ServerInstance {
  const app: FastifyInstance = Fastify({
    logger: true,
  });

  const connectionManager = new ConnectionManager(logger);
  const broadcaster = new Broadcaster(connectionManager, logger);
  const heartbeatManager = new HeartbeatManager(connectionManager, broadcaster, logger);

  const sessionStore = new SessionStore();
  const sessionIdGenerator = new HumanReadableSessionIdGenerator();
  const sessionManager = new SessionManager(sessionStore, sessionIdGenerator, logger);

  broadcaster.setSessionManager(sessionManager);

  const validator = new MessageValidator(logger);
  const messageHandler = new MessageHandler(broadcaster, sessionManager, logger);
  const gateway = new WebSocketGateway(
    connectionManager,
    broadcaster,
    heartbeatManager,
    validator,
    messageHandler,
    sessionManager,
    logger
  );

  app.register(fastifyWebsocket, {
    options: {
      maxPayload: 1048576, // 1MB payload limit
    },
  });

  app.register(async (fastify) => {
    fastify.get('/ws', { websocket: true }, (connection, req) => {
      const socket = (connection as { socket?: WebSocket }).socket || (connection as unknown as WebSocket);
      gateway.handleConnection(socket, req);
    });
  });

  app.get('/health', async () => {
    return {
      status: 'ok',
      service: 'collagility-server',
      activeClients: connectionManager.getClientCount(),
      activeSessions: sessionStore.getAll().length,
      timestamp: Date.now(),
    };
  });

  const listen = async (port = 8080, host = '0.0.0.0'): Promise<string> => {
    heartbeatManager.start();
    const address = await app.listen({ port, host });
    logger.info({ address, port }, 'Collagility Realtime Server listening');
    return address;
  };

  const close = async (): Promise<void> => {
    logger.info('Shutting down Collagility Realtime Server...');
    heartbeatManager.stop();
    connectionManager.clearAll();
    sessionStore.clear();
    await app.close();
    logger.info('Collagility Realtime Server stopped gracefully');
  };

  return {
    app,
    connectionManager,
    broadcaster,
    heartbeatManager,
    sessionManager,
    validator,
    messageHandler,
    gateway,
    listen,
    close,
  };
}
