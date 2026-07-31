export class SessionError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'SessionError';
    this.code = code;
  }
}

export class SessionNotFoundError extends SessionError {
  constructor(sessionId: string) {
    super(`Session '${sessionId}' was not found`, 'SESSION_NOT_FOUND');
  }
}

export class UserAlreadyInSessionError extends SessionError {
  constructor(clientId: string, sessionId: string) {
    super(`Client '${clientId}' already belongs to active session '${sessionId}'`, 'ALREADY_IN_SESSION');
  }
}

export class SessionClosedError extends SessionError {
  constructor(sessionId: string) {
    super(`Session '${sessionId}' is closed`, 'SESSION_CLOSED');
  }
}
