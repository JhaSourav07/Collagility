export type SessionStatus = 'active' | 'closed';

export interface Session {
  id: string;
  ownerId: string;
  members: Set<string>;
  createdAt: Date;
  updatedAt: Date;
  status: SessionStatus;
  metadata: Record<string, unknown>;
}

export interface SessionDTO {
  id: string;
  ownerId: string;
  members: string[];
  createdAt: number;
  updatedAt: number;
  status: SessionStatus;
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
    metadata: session.metadata,
  };
}
