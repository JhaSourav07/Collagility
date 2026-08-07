import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it, expect, afterEach } from 'vitest';
import { SessionStore } from './session-store.js';
import type { Session } from './session.js';

describe('SessionStore', () => {
  const testStorageDir = path.resolve(process.cwd(), '.collagility', `test-sessions-${Date.now()}`);

  afterEach(async () => {
    try {
      await fs.rm(testStorageDir, { recursive: true, force: true });
    } catch {}
  });

  it('should store and retrieve sessions by ID and by client ID', async () => {
    const store = new SessionStore({ storageDir: testStorageDir });
    const mockSession: Session = {
      id: 'swift-lake-1234',
      ownerId: 'client-1',
      members: new Set(['client-1', 'client-2']),
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active',
      workspacePath: '/test/path',
      metadata: {},
    };

    await store.save(mockSession);

    expect(await store.getById('swift-lake-1234')).toBe(mockSession);
    expect(await store.getByClientId('client-1')).toBe(mockSession);
    expect(await store.getByClientId('client-2')).toBe(mockSession);
  });

  it('should cleanly remove a member and update lookup mappings', async () => {
    const store = new SessionStore({ storageDir: testStorageDir });
    const mockSession: Session = {
      id: 'swift-lake-1234',
      ownerId: 'client-1',
      members: new Set(['client-1', 'client-2']),
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active',
      workspacePath: '/test/path',
      metadata: {},
    };

    await store.save(mockSession);
    await store.removeMember('swift-lake-1234', 'client-2');

    expect(mockSession.members.has('client-2')).toBe(false);
    expect(await store.getByClientId('client-2')).toBeUndefined();
    expect(await store.getByClientId('client-1')).toBe(mockSession);
  });

  it('should restore a fresh checkpoint from disk when not in memory', async () => {
    const store1 = new SessionStore({ storageDir: testStorageDir });
    const mockSession: Session = {
      id: 'fresh-session-1',
      ownerId: 'owner-1',
      members: new Set(['owner-1']),
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active',
      workspacePath: '/test/path',
      metadata: { workspacePath: '/test/path' },
    };

    await store1.save(mockSession, { savedAt: Date.now() });

    // New store instance (simulating server restart / memory clear)
    const store2 = new SessionStore({ storageDir: testStorageDir });
    const restored = await store2.getById('fresh-session-1');

    expect(restored).toBeDefined();
    expect(restored?.id).toBe('fresh-session-1');
    expect(restored?.ownerId).toBe('owner-1');
  });

  it('should reject and delete an expired checkpoint when getById() is called', async () => {
    const maxAgeMs = 1000; // 1 second threshold
    const store1 = new SessionStore({ storageDir: testStorageDir, maxAgeMs });
    const mockSession: Session = {
      id: 'expired-session-1',
      ownerId: 'owner-1',
      members: new Set(['owner-1']),
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active',
      workspacePath: '/test/path',
      metadata: {},
    };

    // Save checkpoint with savedAt 5 seconds ago
    await store1.save(mockSession, { savedAt: Date.now() - 5000 });

    const store2 = new SessionStore({ storageDir: testStorageDir, maxAgeMs });
    const result = await store2.getById('expired-session-1');

    expect(result).toBeUndefined();

    // Verify stale file was unlinked from disk
    const filePath = path.join(testStorageDir, 'expired-session-1.json');
    await expect(fs.readFile(filePath, 'utf-8')).rejects.toThrow();
  });

  it('should remove expired checkpoints on disk without touching fresh ones during cleanExpiredCheckpoints pass', async () => {
    const maxAgeMs = 1000;
    const store = new SessionStore({ storageDir: testStorageDir, maxAgeMs });

    const freshSession: Session = {
      id: 'fresh-1',
      ownerId: 'user-1',
      members: new Set(['user-1']),
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active',
      workspacePath: '/test/path',
      metadata: {},
    };

    const expiredSession: Session = {
      id: 'expired-1',
      ownerId: 'user-2',
      members: new Set(['user-2']),
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active',
      workspacePath: '/test/path',
      metadata: {},
    };

    await store.save(freshSession, { savedAt: Date.now() });
    await store.save(expiredSession, { savedAt: Date.now() - 5000 });

    const cleanedCount = await store.cleanExpiredCheckpoints();
    expect(cleanedCount).toBe(1);

    const freshFilePath = path.join(testStorageDir, 'fresh-1.json');
    const expiredFilePath = path.join(testStorageDir, 'expired-1.json');

    const freshExists = await fs.readFile(freshFilePath, 'utf-8').then(() => true).catch(() => false);
    const expiredExists = await fs.readFile(expiredFilePath, 'utf-8').then(() => true).catch(() => false);

    expect(freshExists).toBe(true);
    expect(expiredExists).toBe(false);
  });

  it('should maintain a rolling terminal buffer capped at 50KB for session late joiners', () => {
    const store = new SessionStore({ storageDir: testStorageDir });
    const sessionId = 'test-sess-100';

    store.appendTerminalBuffer(sessionId, 'Hello ');
    store.appendTerminalBuffer(sessionId, 'World!');

    expect(store.getTerminalBuffer(sessionId)).toBe('Hello World!');

    // Fill buffer beyond 50KB limit
    const chunk50k = 'A'.repeat(50 * 1024);
    store.appendTerminalBuffer(sessionId, chunk50k);
    store.appendTerminalBuffer(sessionId, 'END');

    const buffer = store.getTerminalBuffer(sessionId);
    expect(buffer.length).toBe(50 * 1024);
    expect(buffer.endsWith('END')).toBe(true);
  });

  it('should store and append streamChunks in RAM streamHistory up to 1000 items', async () => {
    const store = new SessionStore({ storageDir: testStorageDir });
    const mockSession: Session = {
      id: 'stream-hist-sess',
      ownerId: 'client-1',
      members: new Set(['client-1']),
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active',
      workspacePath: '/test/path',
      metadata: {},
    };

    await store.save(mockSession);

    // Append 1005 chunks to test ring buffer cap of 1000
    for (let i = 1; i <= 1005; i++) {
      store.appendStreamChunk('stream-hist-sess', {
        id: `chunk-${i}`,
        type: 'TEXT',
        content: `Stream line ${i}`,
        timestamp: Date.now(),
      });
    }

    const history = store.getStreamHistory('stream-hist-sess');
    expect(history.length).toBe(1000);
    expect(history[0].id).toBe('chunk-6');
    expect(history[history.length - 1].id).toBe('chunk-1005');
  });
});
