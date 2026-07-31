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

  // AI Adapter Event Types (Milestone 6)
  AI_STARTED: 'ai.started',
  AI_READY: 'ai.ready',
  AI_PROMPT: 'ai.prompt',
  AI_CHUNK: 'ai.chunk',
  AI_COMPLETED: 'ai.completed',
  AI_CANCELLED: 'ai.cancelled',
  AI_FAILED: 'ai.failed',
  AI_STATUS: 'ai.status',
  AI_ERROR: 'ai.error',
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES] | (string & {});
