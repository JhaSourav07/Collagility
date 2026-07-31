import type { OutgoingMessage } from '../types/client.js';

export function createConnectedEvent(clientId: string): OutgoingMessage {
  return {
    type: 'system.connected',
    payload: { clientId },
    timestamp: Date.now(),
  };
}

export function createDisconnectedEvent(clientId: string, reason?: string): OutgoingMessage {
  return {
    type: 'system.disconnected',
    payload: { clientId, reason: reason || 'client_disconnect' },
    timestamp: Date.now(),
  };
}

export function createErrorEvent(error: string, code = 'INVALID_PACKET'): OutgoingMessage {
  return {
    type: 'system.error',
    payload: { error, code },
    timestamp: Date.now(),
  };
}

export function createPongEvent(): OutgoingMessage {
  return {
    type: 'system.pong',
    payload: {},
    timestamp: Date.now(),
  };
}

export function createChatEvent(senderId: string, payload: unknown): OutgoingMessage {
  return {
    type: 'chat',
    senderId,
    payload,
    timestamp: Date.now(),
  };
}
