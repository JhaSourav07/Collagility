import type { WebSocket } from 'ws';

export interface ConnectedClient {
  id: string;
  socket: WebSocket;
  connectedAt: Date;
  isAlive: boolean;
  metadata?: Record<string, unknown>;
}

export interface IncomingMessage {
  type: string;
  payload?: unknown;
}

export interface OutgoingMessage {
  type: string;
  payload?: unknown;
  senderId?: string;
  timestamp: number;
}
