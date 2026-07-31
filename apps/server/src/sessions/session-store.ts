import type { Session } from './session.js';

export class SessionStore {
  private sessions: Map<string, Session> = new Map();
  private clientSessionMap: Map<string, string> = new Map();

  public save(session: Session): void {
    this.sessions.set(session.id, session);
    for (const memberId of session.members) {
      this.clientSessionMap.set(memberId, session.id);
    }
  }

  public getById(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  public getByClientId(clientId: string): Session | undefined {
    const sessionId = this.clientSessionMap.get(clientId);
    return sessionId ? this.sessions.get(sessionId) : undefined;
  }

  public delete(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }
    for (const memberId of session.members) {
      this.clientSessionMap.delete(memberId);
    }
    return this.sessions.delete(sessionId);
  }

  public removeMember(sessionId: string, clientId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.members.delete(clientId);
      session.updatedAt = new Date();
      this.clientSessionMap.delete(clientId);
    }
  }

  public addMember(sessionId: string, clientId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.members.add(clientId);
      session.updatedAt = new Date();
      this.clientSessionMap.set(clientId, sessionId);
    }
  }

  public getAll(): Session[] {
    return Array.from(this.sessions.values());
  }

  public clear(): void {
    this.sessions.clear();
    this.clientSessionMap.clear();
  }
}
