import type {
  EventEnvelope,
  AIPromptPayload,
  AIStatusPayload,
  AICompletedPayload,
  AIFAILEDPayload,
  AICancelledPayload,
  AIChunkPayload,
  ErrorPayload,
  PermissionRequest,
} from '@collagility/protocol';

export interface AdapterEventMap {
  'chunk': string;
  'thought': { content: string };
  'tool_call': { toolName: string; command: string; riskLevel?: string; metadata?: Record<string, unknown> };
  'tool_analysis': { content: string };
  'tool_file_edit': { path: string; instruction: string };
  'file_change': { path: string; action: string };
  'plan': { title?: string; filePath?: string; content: string; options?: string[] };
  'confirmation': { message?: string; prompt?: string; options?: string[] };
  'question': { question?: string; prompt?: string; options?: string[] };
  'error': { message: string; details?: unknown };
  'ai.started': EventEnvelope<AIStatusPayload>;
  'ai.ready': EventEnvelope<AIStatusPayload>;
  'ai.prompt': EventEnvelope<AIPromptPayload>;
  'ai.chunk': EventEnvelope<AIChunkPayload>;
  'ai.completed': EventEnvelope<AICompletedPayload>;
  'ai.cancelled': EventEnvelope<AICancelledPayload>;
  'ai.failed': EventEnvelope<AIFAILEDPayload>;
  'ai.status': EventEnvelope<AIStatusPayload>;
  'ai.error': EventEnvelope<ErrorPayload>;
  'permission_required': EventEnvelope<PermissionRequest>;
  'PERMISSION_REQUIRED': EventEnvelope<PermissionRequest>;
  'stdout': string;
  'stderr': string;
  'pty.data': string;
}


export type AdapterEventName = keyof AdapterEventMap;
export type AdapterEventListener<K extends AdapterEventName> = (event: AdapterEventMap[K]) => void;
