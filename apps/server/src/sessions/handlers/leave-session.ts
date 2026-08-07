import type { SessionManager } from '../session-manager.js';
import type { Broadcaster } from '../../websocket/broadcaster.js';
import {
  createSessionLeftEvent,
  createMemberLeftEvent,
  createSessionClosedEvent,
} from '../session-events.js';

export async function handleLeaveSession(
  clientId: string,
  sessionManager: SessionManager,
  broadcaster: Broadcaster
): Promise<void> {
  const result = await sessionManager.leaveSession(clientId);
  if (!result) {
    return;
  }

  const { session, destroyed, wasOwner } = result;

  // Notify leaving client
  const leftEvent = createSessionLeftEvent(session.id);
  broadcaster.sendToClient(clientId, leftEvent);

  if (destroyed) {
    // Notify session closure if last member left
    const closedEvent = createSessionClosedEvent(session.id, 'all_members_left');
    await broadcaster.broadcastToSession(session.id, closedEvent);
  } else {
    // Notify remaining peers that a member left
    const memberLeftEvent = createMemberLeftEvent(session.id, clientId, wasOwner);
    await broadcaster.broadcastToSession(session.id, memberLeftEvent);
  }
}
