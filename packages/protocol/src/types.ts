export interface EventSender {
  id: string;
  name?: string;
  role?: 'owner' | 'member' | 'system' | 'ai';
}

export interface EventEnvelope<T = unknown> {
  version: number;
  id: string;
  timestamp: number;
  seq?: number;
  sessionId?: string;
  sender?: EventSender;
  type: string;
  payload: T;
}

export type BaseEnvelope<T = unknown> = EventEnvelope<T>;

export interface ChatMessagePayload {
  text: string;
  format?: 'plain' | 'markdown';
}

export interface ChatSystemPayload {
  message: string;
  level?: 'info' | 'warn' | 'error';
}

export interface ErrorPayload {
  error: string;
  code?: string;
  details?: unknown;
}

// AI Event Payloads (Milestone 6)
export interface AIPromptPayload {
  prompt: string;
  context?: Record<string, unknown>;
}

export interface AIStatusPayload {
  adapterName: string;
  status: 'uninitialized' | 'initializing' | 'ready' | 'processing' | 'cancelled' | 'failed' | 'stopped';
  message?: string;
}

export interface AICompletedPayload {
  adapterName: string;
  response: string;
  metadata?: Record<string, unknown>;
}

export interface AIFAILEDPayload {
  adapterName: string;
  error: string;
  code?: string;
}

export interface AICancelledPayload {
  adapterName: string;
  reason?: string;
}

export interface AIChunkPayload {
  adapterName: string;
  messageId: string;
  chunkIndex: number;
  content: string;
  isFinal: boolean;
}

// AI Stream Event Payloads (Milestone 8)
export interface AIStreamStartedPayload {
  streamId: string;
  adapterName: string;
  prompt: string;
  ownerId: string;
  startedAt: number;
  initialState?: string;
}

export interface AIStreamChunkPayload {
  streamId: string;
  sequenceNumber: number;
  timestamp: number;
  sender: EventSender;
  sessionId: string;
  content: string;
  isFinal: boolean;
  adapterName?: string;
  metadata?: Record<string, unknown>;
}

export interface AIStreamProgressPayload {
  streamId: string;
  sequenceNumber: number;
  totalChunks: number;
  bufferedBytes: number;
  elapsedMs: number;
}

export interface AIStreamCompletedPayload {
  streamId: string;
  adapterName: string;
  totalChunks: number;
  fullResponse: string;
  durationMs: number;
  metadata?: Record<string, unknown>;
}

export interface AIStreamCancelledPayload {
  streamId: string;
  adapterName: string;
  reason?: string;
  cancelledAt: number;
}

export interface AIStreamFailedPayload {
  streamId: string;
  adapterName: string;
  error: string;
  code?: string;
  failedAt: number;
}

export interface AIStreamTimeoutPayload {
  streamId: string;
  adapterName: string;
  timeoutMs: number;
}

export interface AIStreamErrorPayload {
  streamId?: string;
  adapterName?: string;
  error: string;
  code?: string;
}

export interface PTYOutputPayload {
  streamId: string;
  adapterName: string;
  data: string;
}

export interface PTYResizePayload {
  streamId: string;
  cols: number;
  rows: number;
}

export interface PTYInputPayload {
  streamId: string;
  data: string;
}

export interface TerminalScreenStreamPayload {
  sessionId: string;
  senderId: string;
  pane: 'right' | 'left' | 'main';
  data: string;
  cols?: number;
  rows?: number;
  timestamp: number;
}

// Interactive AI Event Payloads
export interface AIQuestionPayload {
  questionId: string;
  streamId: string;
  prompt: string;
  options?: string[];
  defaultOption?: string;
}

export interface AIAnswerPayload {
  questionId: string;
  streamId: string;
  answer: string;
}

export interface AIPlanPayload {
  planId: string;
  streamId: string;
  title: string;
  steps: string[];
  requiresApproval?: boolean;
}

export interface AIPlanApprovePayload {
  planId: string;
  streamId: string;
}

export interface AIPlanRejectPayload {
  planId: string;
  streamId: string;
  reason?: string;
}

export interface AISelectionPayload {
  selectionId: string;
  streamId: string;
  title: string;
  options: Array<{ key: string; label: string }>;
}

export interface AISelectionResponsePayload {
  selectionId: string;
  streamId: string;
  selectedKey: string;
}

export interface AIConfirmationPayload {
  confirmationId: string;
  streamId: string;
  prompt: string;
  defaultValue?: boolean;
}

export interface AIConfirmationResponsePayload {
  confirmationId: string;
  streamId: string;
  approved: boolean;
}

export interface AIToolRequestPayload {
  toolId: string;
  streamId: string;
  toolName: string;
  args?: Record<string, unknown>;
}

export interface AIToolApprovedPayload {
  toolId: string;
  streamId: string;
}

export interface AIToolRejectedPayload {
  toolId: string;
  streamId: string;
  reason?: string;
}

export interface AIWaitingPayload {
  streamId: string;
  reason?: string;
}

export interface AIFinishedPayload {
  streamId: string;
  summary?: string;
}

// Security & Permission Subsystem Types
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type SecurityMode = 'manual' | 'accept-edits' | 'plan-only' | 'auto';
export type PermissionDecision = 'allow-once' | 'allow-session' | 'deny';

export interface PermissionRequest {
  id: string;
  toolName: string;
  command: string;
  riskLevel: RiskLevel;
  metadata?: Record<string, any>;
}

export interface SessionPermissionRequestPayload extends PermissionRequest {
  sessionId?: string;
}

export interface SessionPermissionResponsePayload {
  requestId: string;
  decision: PermissionDecision;
  userId: string;
  sessionId?: string;
}

export interface StreamChunk {
  id: string;
  type: 'TEXT' | 'TOOL' | 'FILE';
  content: string;
  timestamp: number;
}

export interface SessionStreamBroadcastPayload {
  sessionId: string;
  chunk: StreamChunk;
  timestamp: number;
}

export interface SessionStreamHistoryPayload {
  sessionId: string;
  history: StreamChunk[];
}




