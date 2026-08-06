import fs from 'node:fs';
import path from 'node:path';
import type { Session, SessionDTO } from './session.js';
import { toSessionDTO } from './session.js';

export interface SessionCheckpoint {
  session: SessionDTO;
  turns: Array<{ id: string; sender: string; content: string; timestamp: number }>;
  astState?: Record<string, unknown>;
  fileDiffs?: Array<{ filePath: string; additions: number; deletions: number; diff: string }>;
  savedAt: number;
}

export class SessionStore {
  private sessions: Map<string, Session> = new Map();
  private clientSessionMap: Map<string, string> = new Map();
  private baseStorageDir: string;

  constructor(storageDir?: string) {
    this.baseStorageDir = storageDir || path.resolve(process.cwd(), '.collagility', 'sessions');
  }

  private ensureStorageDir(): void {
    try {
      if (!fs.existsSync(this.baseStorageDir)) {
        fs.mkdirSync(this.baseStorageDir, { recursive: true });
      }
    } catch {
      // Ignore directory creation errors if filesystem is read-only
    }
  }

  public save(session: Session, checkpointData?: Partial<SessionCheckpoint>): void {
    this.sessions.set(session.id, session);
    for (const memberId of session.members) {
      this.clientSessionMap.set(memberId, session.id);
    }

    this.persistCheckpointToDisk(session, checkpointData);
  }

  public persistCheckpointToDisk(session: Session, checkpointData?: Partial<SessionCheckpoint>): void {
    try {
      this.ensureStorageDir();
      const filePath = path.join(this.baseStorageDir, `${session.id}.json`);
      const dto = toSessionDTO(session);

      const checkpoint: SessionCheckpoint = {
        session: dto,
        turns: checkpointData?.turns || [],
        astState: checkpointData?.astState || {},
        fileDiffs: checkpointData?.fileDiffs || [],
        savedAt: Date.now(),
      };

      fs.writeFileSync(filePath, JSON.stringify(checkpoint, null, 2), 'utf-8');
    } catch {
      // Ignore persistence disk write errors gracefully
    }
  }

  public loadCheckpointFromDisk(sessionId: string): SessionCheckpoint | null {
    try {
      const filePath = path.join(this.baseStorageDir, `${sessionId}.json`);
      if (!fs.existsSync(filePath)) return null;

      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as SessionCheckpoint;
    } catch {
      return null;
    }
  }

  public getById(sessionId: string): Session | undefined {
    const memory = this.sessions.get(sessionId);
    if (memory) return memory;

    // Fallback to local disk checkpoint restoration
    const checkpoint = this.loadCheckpointFromDisk(sessionId);
    if (checkpoint && checkpoint.session) {
      const restored: Session = {
        id: checkpoint.session.id,
        ownerId: checkpoint.session.ownerId,
        members: new Set(checkpoint.session.members),
        createdAt: new Date(checkpoint.session.createdAt),
        updatedAt: new Date(checkpoint.session.updatedAt),
        status: checkpoint.session.status,
        workspacePath: checkpoint.session.workspacePath,
        metadata: checkpoint.session.metadata || {},
      };
      this.sessions.set(restored.id, restored);
      return restored;
    }

    return undefined;
  }

  public getByClientId(clientId: string): Session | undefined {
    const sessionId = this.clientSessionMap.get(clientId);
    return sessionId ? this.getById(sessionId) : undefined;
  }

  public delete(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session) {
      for (const memberId of session.members) {
        this.clientSessionMap.delete(memberId);
      }
    }
    const removedMemory = this.sessions.delete(sessionId);

    try {
      const filePath = path.join(this.baseStorageDir, `${sessionId}.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // Ignore file removal error
    }

    return removedMemory;
  }

  public removeMember(sessionId: string, clientId: string): void {
    const session = this.getById(sessionId);
    if (session) {
      session.members.delete(clientId);
      session.updatedAt = new Date();
      this.clientSessionMap.delete(clientId);
      this.save(session);
    }
  }

  public addMember(sessionId: string, clientId: string): void {
    const session = this.getById(sessionId);
    if (session) {
      session.members.add(clientId);
      session.updatedAt = new Date();
      this.clientSessionMap.set(clientId, sessionId);
      this.save(session);
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
