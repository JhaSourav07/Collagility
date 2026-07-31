import { describe, it, expect } from 'vitest';
import { SessionManager } from './session-manager.js';
import { SessionStore } from './session-store.js';
import { HumanReadableSessionIdGenerator } from './id-generator.js';
import { logger } from '../logger/logger.js';
import {
  UserAlreadyInSessionError,
  SessionNotFoundError,
} from './session-errors.js';

describe('SessionManager', () => {
  const createTestManager = () => {
    const store = new SessionStore();
    const generator = new HumanReadableSessionIdGenerator();
    return new SessionManager(store, generator, logger);
  };

  it('should create a new session with owner as sole initial member and store workspacePath', () => {
    const manager = createTestManager();
    const ownerId = 'user-owner-1';
    const workspacePath = '/run/media/sourav/New Volume/Projects/Collagility';

    const session = manager.createSession(ownerId, { title: 'Test Session', workspacePath });

    expect(session.id).toBeDefined();
    expect(session.ownerId).toBe(ownerId);
    expect(session.members.has(ownerId)).toBe(true);
    expect(session.members.size).toBe(1);
    expect(session.status).toBe('active');
    expect(session.workspacePath).toBe(workspacePath);
    expect(session.metadata).toEqual({ title: 'Test Session', workspacePath });
  });

  it('should reject creating a second session if user is already in a session', () => {
    const manager = createTestManager();
    const ownerId = 'user-owner-1';

    manager.createSession(ownerId);

    expect(() => manager.createSession(ownerId)).toThrow(UserAlreadyInSessionError);
  });

  it('should allow another user to join an active session', () => {
    const manager = createTestManager();
    const ownerId = 'user-owner';
    const memberId = 'user-member';

    const session = manager.createSession(ownerId);
    const joinedSession = manager.joinSession(session.id, memberId);

    expect(joinedSession.members.has(memberId)).toBe(true);
    expect(joinedSession.members.size).toBe(2);
  });

  it('should throw error when joining non-existent session ID', () => {
    const manager = createTestManager();
    expect(() => manager.joinSession('invalid-id', 'user-member')).toThrow(SessionNotFoundError);
  });

  it('should handle member leaving session and auto-destroy session when empty', () => {
    const manager = createTestManager();
    const ownerId = 'user-owner';

    const session = manager.createSession(ownerId);
    const leaveResult = manager.leaveSession(ownerId);

    expect(leaveResult).toBeDefined();
    expect(leaveResult?.destroyed).toBe(true);
    expect(leaveResult?.wasOwner).toBe(true);
    expect(manager.getSession(session.id)).toBeUndefined();
  });
});
