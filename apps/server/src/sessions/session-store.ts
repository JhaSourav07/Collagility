import fs from 'node:fs/promises';
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

export interface SessionStoreOptions {
  storageDir?: string;
  maxAgeMs?: number;
  cleanupIntervalMs?: number;
}

export class SessionStore {
  private sessions: Map<string, Session> = new Map();
  private clientSessionMap: Map<string, string> = new Map();
  private terminalBuffers: Map<string, string> = new Map();
  private baseStorageDir: string;
  private maxAgeMs: number;
  private cleanupIntervalMs: number;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(options?: string | SessionStoreOptions) {
    if (typeof options === 'string') {
      this.baseStorageDir = options;
      this.maxAgeMs = 24 * 60 * 60 * 1000;
      this.cleanupIntervalMs = 60 * 60 * 1000;
    } else {
      this.baseStorageDir = options?.storageDir || path.resolve(process.cwd(), '.collagility', 'sessions');
      this.maxAgeMs = options?.maxAgeMs ?? 24 * 60 * 60 * 1000;
      this.cleanupIntervalMs = options?.cleanupIntervalMs ?? 60 * 60 * 1000;
    }
  }

  private async ensureStorageDir(): Promise<void> {
    try {
      await fs.mkdir(this.baseStorageDir, { recursive: true });
    } catch {
      // Ignore directory creation errors if filesystem is read-only
    }
  }

  public async save(session: Session, checkpointData?: Partial<SessionCheckpoint>): Promise<void> {
    this.sessions.set(session.id, session);
    for (const memberId of session.members) {
      this.clientSessionMap.set(memberId, session.id);
    }

    await this.persistCheckpointToDisk(session, checkpointData);
  }

  public async persistCheckpointToDisk(session: Session, checkpointData?: Partial<SessionCheckpoint>): Promise<void> {
    try {
      await this.ensureStorageDir();
      const filePath = path.join(this.baseStorageDir, `${session.id}.json`);
      const dto = toSessionDTO(session);

      const checkpoint: SessionCheckpoint = {
        session: dto,
        turns: checkpointData?.turns || [],
        astState: checkpointData?.astState || {},
        fileDiffs: checkpointData?.fileDiffs || [],
        savedAt: checkpointData?.savedAt || Date.now(),
      };

      await fs.writeFile(filePath, JSON.stringify(checkpoint, null, 2), 'utf-8');
    } catch {
      // Ignore persistence disk write errors gracefully
    }
  }

  public async loadCheckpointFromDisk(sessionId: string): Promise<SessionCheckpoint | null> {
    try {
      const filePath = path.join(this.baseStorageDir, `${sessionId}.json`);
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content) as SessionCheckpoint;
    } catch {
      return null;
    }
  }

  public async getById(sessionId: string): Promise<Session | undefined> {
    const memory = this.sessions.get(sessionId);
    if (memory) return memory;

    // Fallback to local disk checkpoint restoration
    const checkpoint = await this.loadCheckpointFromDisk(sessionId);
    if (checkpoint && checkpoint.session) {
      const now = Date.now();
      const savedAt = typeof checkpoint.savedAt === 'number' ? checkpoint.savedAt : 0;
      if (now - savedAt > this.maxAgeMs) {
        // Expired checkpoint: remove stale file from disk and return undefined
        try {
          const filePath = path.join(this.baseStorageDir, `${sessionId}.json`);
          await fs.unlink(filePath);
        } catch {
          // Ignore unlink failure
        }
        return undefined;
      }

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

  public async getByClientId(clientId: string): Promise<Session | undefined> {
    const sessionId = this.clientSessionMap.get(clientId);
    return sessionId ? await this.getById(sessionId) : undefined;
  }

  public async delete(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (session) {
      for (const memberId of session.members) {
        this.clientSessionMap.delete(memberId);
      }
    }
    this.terminalBuffers.delete(sessionId);
    const removedMemory = this.sessions.delete(sessionId);

    try {
      const filePath = path.join(this.baseStorageDir, `${sessionId}.json`);
      await fs.unlink(filePath);
    } catch {
      // Ignore file removal error
    }

    return removedMemory;
  }

  public appendTerminalBuffer(sessionId: string, chunk: string): string {
    const current = this.terminalBuffers.get(sessionId) || '';
    const combined = current + chunk;
    const maxBytes = 50 * 1024; // 50KB limit
    const trimmed = combined.length > maxBytes ? combined.slice(-maxBytes) : combined;
    this.terminalBuffers.set(sessionId, trimmed);
    return trimmed;
  }

  public getTerminalBuffer(sessionId: string): string {
    return this.terminalBuffers.get(sessionId) || '';
  }

  public setTerminalBuffer(sessionId: string, content: string): void {
    const maxBytes = 50 * 1024;
    const trimmed = content.length > maxBytes ? content.slice(-maxBytes) : content;
    this.terminalBuffers.set(sessionId, trimmed);
  }

  public clearTerminalBuffer(sessionId: string): void {
    this.terminalBuffers.delete(sessionId);
  }

  public async removeMember(sessionId: string, clientId: string): Promise<void> {
    const session = await this.getById(sessionId);
    if (session) {
      session.members.delete(clientId);
      session.updatedAt = new Date();
      this.clientSessionMap.delete(clientId);
      await this.save(session);
    }
  }

  public async addMember(sessionId: string, clientId: string): Promise<void> {
    const session = await this.getById(sessionId);
    if (session) {
      session.members.add(clientId);
      session.updatedAt = new Date();
      this.clientSessionMap.set(clientId, sessionId);
      await this.save(session);
    }
  }

  public async cleanExpiredCheckpoints(): Promise<number> {
    let removedCount = 0;
    try {
      const files = await fs.readdir(this.baseStorageDir);
      const jsonFiles = files.filter((f) => f.endsWith('.json'));

      const now = Date.now();
      for (const file of jsonFiles) {
        const filePath = path.join(this.baseStorageDir, file);
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const checkpoint = JSON.parse(content) as SessionCheckpoint;
          const savedAt = checkpoint && typeof checkpoint.savedAt === 'number' ? checkpoint.savedAt : 0;
          if (now - savedAt > this.maxAgeMs) {
            await fs.unlink(filePath);
            removedCount++;
          }
        } catch {
          // Corrupt file: unlink
          try {
            await fs.unlink(filePath);
            removedCount++;
          } catch {}
        }
      }
    } catch {
      // Ignore directory access errors
    }
    return removedCount;
  }

  public startCleanupTimer(intervalMs?: number): void {
    if (this.cleanupTimer) return;
    const interval = intervalMs ?? this.cleanupIntervalMs;

    this.cleanExpiredCheckpoints().catch(() => {});

    this.cleanupTimer = setInterval(() => {
      this.cleanExpiredCheckpoints().catch(() => {});
    }, interval);
  }

  public stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  public getAll(): Session[] {
    return Array.from(this.sessions.values());
  }

  public clear(): void {
    this.stopCleanupTimer();
    this.sessions.clear();
    this.clientSessionMap.clear();
  }
}
