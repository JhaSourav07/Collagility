import { describe, it, expect } from 'vitest';
import { SessionStore } from './session-store.js';
import type { Session } from './session.js';

describe('SessionStore', () => {
  it('should store and retrieve sessions by ID and by client ID', () => {
    const store = new SessionStore();
    const mockSession: Session = {
      id: 'swift-lake-1234',
      ownerId: 'client-1',
      members: new Set(['client-1', 'client-2']),
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active',
      metadata: {},
    };

    store.save(mockSession);

    expect(store.getById('swift-lake-1234')).toBe(mockSession);
    expect(store.getByClientId('client-1')).toBe(mockSession);
    expect(store.getByClientId('client-2')).toBe(mockSession);
  });

  it('should cleanly remove a member and update lookup mappings', () => {
    const store = new SessionStore();
    const mockSession: Session = {
      id: 'swift-lake-1234',
      ownerId: 'client-1',
      members: new Set(['client-1', 'client-2']),
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active',
      metadata: {},
    };

    store.save(mockSession);
    store.removeMember('swift-lake-1234', 'client-2');

    expect(mockSession.members.has('client-2')).toBe(false);
    expect(store.getByClientId('client-2')).toBeUndefined();
    expect(store.getByClientId('client-1')).toBe(mockSession);
  });
});
