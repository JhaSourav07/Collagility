import type { Session } from './session.js';
import type { SessionStore } from './session-store.js';
import type { SessionIdGenerator } from './id-generator.js';
import type { ServerLogger } from '../logger/logger.js';
import {
  SessionNotFoundError,
  UserAlreadyInSessionError,
  SessionClosedError,
} from './session-errors.js';

export interface LeaveSessionResult {
  session: Session;
  destroyed: boolean;
  wasOwner: boolean;
}

export class SessionManager {
  private store: SessionStore;
  private idGenerator: SessionIdGenerator;
  private logger: ServerLogger;

  constructor(store: SessionStore, idGenerator: SessionIdGenerator, logger: ServerLogger) {
    this.store = store;
    this.idGenerator = idGenerator;
    this.logger = logger;
  }

  public createSession(ownerId: string, metadata: Record<string, unknown> = {}): Session {
    const existingSession = this.store.getByClientId(ownerId);
    if (existingSession) {
      throw new UserAlreadyInSessionError(ownerId, existingSession.id);
    }

    const sessionId = this.idGenerator.generate();
    const session: Session = {
      id: sessionId,
      ownerId,
      members: new Set([ownerId]),
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active',
      metadata,
    };

    this.store.save(session);
    this.logger.info({ sessionId, ownerId }, 'Session created');
    return session;
  }

  public joinSession(sessionId: string, clientId: string): Session {
    const session = this.store.getById(sessionId);
    if (!session) {
      throw new SessionNotFoundError(sessionId);
    }

    if (session.status === 'closed') {
      throw new SessionClosedError(sessionId);
    }

    const existingSession = this.store.getByClientId(clientId);
    if (existingSession && existingSession.id !== sessionId) {
      throw new UserAlreadyInSessionError(clientId, existingSession.id);
    }

    this.store.addMember(sessionId, clientId);
    this.logger.info({ sessionId, clientId, memberCount: session.members.size }, 'Member joined session');
    return session;
  }

  public leaveSession(clientId: string): LeaveSessionResult | undefined {
    const session = this.store.getByClientId(clientId);
    if (!session) {
      return undefined;
    }

    const wasOwner = session.ownerId === clientId;
    this.store.removeMember(session.id, clientId);
    this.logger.info(
      { sessionId: session.id, clientId, wasOwner, remainingMembers: session.members.size },
      'Member left session'
    );

    let destroyed = false;

    // Automatic destruction rule: if empty, delete session automatically
    if (session.members.size === 0) {
      session.status = 'closed';
      this.store.delete(session.id);
      destroyed = true;
      this.logger.info({ sessionId: session.id }, 'Session destroyed because all members left');
    }

    return { session, destroyed, wasOwner };
  }

  public getSession(sessionId: string): Session | undefined {
    return this.store.getById(sessionId);
  }

  public getClientSession(clientId: string): Session | undefined {
    return this.store.getByClientId(clientId);
  }

  public closeSession(sessionId: string): Session | undefined {
    const session = this.store.getById(sessionId);
    if (!session) {
      return undefined;
    }

    session.status = 'closed';
    this.store.delete(sessionId);
    this.logger.info({ sessionId }, 'Session closed explicitly');
    return session;
  }
}
