/**
 * Shared domain type declarations for Collagility.
 */

export type UserRole = 'HOST' | 'CO_DRIVER' | 'OBSERVER';

export interface Participant {
  userId: string;
  role: UserRole;
  clientType: 'CLI' | 'BROWSER' | 'IDE';
  connectedAt: number;
}

export interface SessionConfig {
  sessionId: string;
  workspaceId: string;
  hostUserId: string;
  createdAt: number;
}
