export const CURRENT_PROTOCOL_VERSION = 1;

export const EVENT_TYPES = {
  CHAT_MESSAGE: 'chat.message',
  CHAT_SYSTEM: 'chat.system',
  CHAT_JOIN: 'chat.join',
  CHAT_LEAVE: 'chat.leave',
  SESSION_CREATE: 'session.create',
  SESSION_CREATED: 'session.created',
  SESSION_JOIN: 'session.join',
  SESSION_JOINED: 'session.joined',
  SESSION_LEAVE: 'session.leave',
  SESSION_LEFT: 'session.left',
  SESSION_CLOSED: 'session.closed',
  SESSION_UPDATED: 'session.updated',
  CONNECTION_CONNECTED: 'connection.connected',
  CONNECTION_DISCONNECTED: 'connection.disconnected',
  HEARTBEAT: 'heartbeat',
  ERROR: 'error',
  UNKNOWN: 'unknown',
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES] | (string & {});
