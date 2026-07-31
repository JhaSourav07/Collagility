import type {
  EventEnvelope,
  AIPromptPayload,
  AIStatusPayload,
  AICompletedPayload,
  AIFAILEDPayload,
  AICancelledPayload,
  AIChunkPayload,
  ErrorPayload,
} from '@collagility/protocol';

export interface AdapterEventMap {
  'ai.started': EventEnvelope<AIStatusPayload>;
  'ai.ready': EventEnvelope<AIStatusPayload>;
  'ai.prompt': EventEnvelope<AIPromptPayload>;
  'ai.chunk': EventEnvelope<AIChunkPayload>;
  'ai.completed': EventEnvelope<AICompletedPayload>;
  'ai.cancelled': EventEnvelope<AICancelledPayload>;
  'ai.failed': EventEnvelope<AIFAILEDPayload>;
  'ai.status': EventEnvelope<AIStatusPayload>;
  'ai.error': EventEnvelope<ErrorPayload>;
}

export type AdapterEventName = keyof AdapterEventMap;
export type AdapterEventListener<K extends AdapterEventName> = (event: AdapterEventMap[K]) => void;
