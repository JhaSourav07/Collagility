import type { SessionDTO } from './session.js';
import type { OutgoingMessage } from '../types/client.js';

export function createSessionCreatedEvent(session: SessionDTO): OutgoingMessage {
  return {
    type: 'session.created',
    payload: { session },
    timestamp: Date.now(),
  };
}

export function createSessionJoinedEvent(session: SessionDTO, memberId: string): OutgoingMessage {
  return {
    type: 'session.joined',
    payload: { session, memberId },
    timestamp: Date.now(),
  };
}

export function createMemberJoinedEvent(sessionId: string, memberId: string): OutgoingMessage {
  return {
    type: 'member.joined',
    payload: { sessionId, memberId },
    timestamp: Date.now(),
  };
}

export function createMemberLeftEvent(sessionId: string, memberId: string, isOwner: boolean): OutgoingMessage {
  return {
    type: 'member.left',
    payload: { sessionId, memberId, isOwner },
    timestamp: Date.now(),
  };
}

export function createSessionLeftEvent(sessionId: string): OutgoingMessage {
  return {
    type: 'session.left',
    payload: { sessionId },
    timestamp: Date.now(),
  };
}

export function createSessionClosedEvent(sessionId: string, reason: string): OutgoingMessage {
  return {
    type: 'session.closed',
    payload: { sessionId, reason },
    timestamp: Date.now(),
  };
}

export function createSessionErrorEvent(error: string, code: string): OutgoingMessage {
  return {
    type: 'session.error',
    payload: { error, code },
    timestamp: Date.now(),
  };
}
