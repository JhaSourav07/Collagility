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

  public async createSession(ownerId: string, metadata: Record<string, unknown> = {}): Promise<Session> {
    const existingSession = await this.store.getByClientId(ownerId);
    if (existingSession) {
      throw new UserAlreadyInSessionError(ownerId, existingSession.id);
    }

    const sessionId = this.idGenerator.generate();
    const workspacePath = String(metadata['workspacePath'] || metadata['cwd'] || process.cwd());
    const session: Session = {
      id: sessionId,
      ownerId,
      members: new Set([ownerId]),
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active',
      workspacePath,
      metadata,
    };

    await this.store.save(session);
    this.logger.info({ sessionId, ownerId }, 'Session created');
    return session;
  }

  public async joinSession(sessionId: string, clientId: string): Promise<Session> {
    const session = await this.store.getById(sessionId);
    if (!session) {
      throw new SessionNotFoundError(sessionId);
    }

    if (session.status === 'closed') {
      throw new SessionClosedError(sessionId);
    }

    const existingSession = await this.store.getByClientId(clientId);
    if (existingSession && existingSession.id !== sessionId) {
      throw new UserAlreadyInSessionError(clientId, existingSession.id);
    }

    await this.store.addMember(sessionId, clientId);
    this.logger.info({ sessionId, clientId, memberCount: session.members.size }, 'Member joined session');
    return session;
  }

  public async leaveSession(clientId: string): Promise<LeaveSessionResult | undefined> {
    const session = await this.store.getByClientId(clientId);
    if (!session) {
      return undefined;
    }

    const wasOwner = session.ownerId === clientId;
    await this.store.removeMember(session.id, clientId);
    this.logger.info(
      { sessionId: session.id, clientId, wasOwner, remainingMembers: session.members.size },
      'Member left session'
    );

    let destroyed = false;

    // Automatic destruction rule: if empty, delete session automatically
    if (session.members.size === 0) {
      session.status = 'closed';
      await this.store.delete(session.id);
      destroyed = true;
      this.logger.info({ sessionId: session.id }, 'Session destroyed because all members left');
    }

    return { session, destroyed, wasOwner };
  }

  public async getSession(sessionId: string): Promise<Session | undefined> {
    return await this.store.getById(sessionId);
  }

  public async getClientSession(clientId: string): Promise<Session | undefined> {
    return await this.store.getByClientId(clientId);
  }

  public async closeSession(sessionId: string): Promise<Session | undefined> {
    const session = await this.store.getById(sessionId);
    if (!session) {
      return undefined;
    }

    session.status = 'closed';
    await this.store.delete(sessionId);
    this.logger.info({ sessionId }, 'Session closed explicitly');
    return session;
  }
}
