import type { SessionManager } from '../session-manager.js';
import type { Broadcaster } from '../../websocket/broadcaster.js';
import { toSessionDTO } from '../session.js';
import { createSessionCreatedEvent, createSessionErrorEvent } from '../session-events.js';
import { SessionError } from '../session-errors.js';

export function handleCreateSession(
  clientId: string,
  payload: Record<string, unknown> | undefined,
  sessionManager: SessionManager,
  broadcaster: Broadcaster
): void {
  try {
    const metadata = (payload?.['metadata'] as Record<string, unknown>) || {};
    const session = sessionManager.createSession(clientId, metadata);
    const dto = toSessionDTO(session);
    const event = createSessionCreatedEvent(dto);
    broadcaster.sendToClient(clientId, event);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create session';
    const code = error instanceof SessionError ? error.code : 'CREATE_SESSION_FAILED';
    const errorEvent = createSessionErrorEvent(message, code);
    broadcaster.sendToClient(clientId, errorEvent);
  }
}
