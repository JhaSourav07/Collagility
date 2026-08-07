import type { SessionManager } from '../session-manager.js';
import type { Broadcaster } from '../../websocket/broadcaster.js';
import { toSessionDTO } from '../session.js';
import {
  createSessionJoinedEvent,
  createMemberJoinedEvent,
  createSessionErrorEvent,
} from '../session-events.js';
import { SessionError } from '../session-errors.js';

export async function handleJoinSession(
  clientId: string,
  payload: { sessionId: string },
  sessionManager: SessionManager,
  broadcaster: Broadcaster
): Promise<void> {
  try {
    const session = await sessionManager.joinSession(payload.sessionId, clientId);
    const dto = toSessionDTO(session);

    // Send confirmation to joined client
    const joinedEvent = createSessionJoinedEvent(dto, clientId);
    broadcaster.sendToClient(clientId, joinedEvent);

    // Notify peers in the session
    const memberJoinedEvent = createMemberJoinedEvent(session.id, clientId);
    await broadcaster.broadcastToSession(session.id, memberJoinedEvent, clientId);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to join session';
    const code = error instanceof SessionError ? error.code : 'JOIN_SESSION_FAILED';
    const errorEvent = createSessionErrorEvent(message, code);
    broadcaster.sendToClient(clientId, errorEvent);
  }
}
