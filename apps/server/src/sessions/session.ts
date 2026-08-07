import type { StreamChunk } from '@collagility/protocol';

export type SessionStatus = 'active' | 'closed';

export interface Session {
  id: string;
  ownerId: string;
  members: Set<string>;
  createdAt: Date;
  updatedAt: Date;
  status: SessionStatus;
  workspacePath: string;
  metadata: Record<string, unknown>;
  streamHistory?: StreamChunk[];
}

export interface SessionDTO {
  id: string;
  ownerId: string;
  members: string[];
  createdAt: number;
  updatedAt: number;
  status: SessionStatus;
  workspacePath: string;
  metadata: Record<string, unknown>;
}

export function toSessionDTO(session: Session): SessionDTO {
  return {
    id: session.id,
    ownerId: session.ownerId,
    members: Array.from(session.members),
    createdAt: session.createdAt.getTime(),
    updatedAt: session.updatedAt.getTime(),
    status: session.status,
    workspacePath: session.workspacePath || String(session.metadata?.['workspacePath'] || session.metadata?.['cwd'] || process.cwd()),
    metadata: session.metadata,
  };
}
