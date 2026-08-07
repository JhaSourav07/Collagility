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

  // AI Stream Event Types (Milestone 8)
  AI_STREAM_STARTED: 'ai.stream.started',
  AI_STREAM_CHUNK: 'ai.stream.chunk',
  AI_STREAM_PROGRESS: 'ai.stream.progress',
  AI_STREAM_COMPLETED: 'ai.stream.completed',
  AI_STREAM_CANCELLED: 'ai.stream.cancelled',
  AI_STREAM_FAILED: 'ai.stream.failed',
  AI_STREAM_TIMEOUT: 'ai.stream.timeout',
  AI_STREAM_ERROR: 'ai.stream.error',

  // PTY Event Types
  PTY_OUTPUT: 'pty.output',
  PTY_RESIZE: 'pty.resize',
  PTY_INPUT: 'pty.input',
  TERMINAL_SCREEN_STREAM: 'terminal.screen.stream',
  TERMINAL_PTY_FRAME: 'terminal.pty.frame',

  // Interactive AI Agent Event Types
  AI_QUESTION: 'ai.question',
  AI_ANSWER: 'ai.answer',
  AI_PLAN: 'ai.plan',
  AI_PLAN_APPROVE: 'ai.plan.approve',
  AI_PLAN_REJECT: 'ai.plan.reject',
  AI_SELECTION: 'ai.selection',
  AI_SELECTION_RESPONSE: 'ai.selection.response',
  AI_CONFIRMATION: 'ai.confirmation',
  AI_CONFIRMATION_RESPONSE: 'ai.confirmation.response',
  AI_TOOL_REQUEST: 'ai.tool.request',
  AI_TOOL_APPROVED: 'ai.tool.approved',
  AI_TOOL_REJECTED: 'ai.tool.rejected',
  AI_WAITING: 'ai.waiting',
  AI_FINISHED: 'ai.finished',

  // Realtime Permission Synchronization Event Types
  SESSION_PERMISSION_REQUEST: 'session.permission.request',
  SESSION_PERMISSION_RESPONSE: 'session.permission.response',

  // Session Stream History & RAM Buffer Event Types
  SESSION_STREAM_BROADCAST: 'session.stream.broadcast',
  SESSION_STREAM_HISTORY: 'session.stream.history',
} as const;


export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES] | (string & {});
