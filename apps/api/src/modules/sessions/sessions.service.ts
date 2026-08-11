import { hashToken, generateSessionToken } from '../../utils/crypto';
import { SessionRepository } from './sessions.repository';
import type { CreateSessionInput, SessionResponse } from './sessions.types';

export class SessionService {
  constructor(private repository: SessionRepository) {}

  async create(input: CreateSessionInput): Promise<SessionResponse> {
    const token = generateSessionToken();
    const tokenHash = hashToken(token);
    const session = await this.repository.create({ ...input, tokenHash });
    return this.repository.toResponse(session)!;
  }

  async getById(id: string): Promise<SessionResponse | null> {
    const session = await this.repository.findById(id);
    return this.repository.toResponse(session);
  }

  async getByUserId(userId: string): Promise<SessionResponse[]> {
    const sessions = await this.repository.findByUserId(userId);
    return sessions.map((session) => this.repository.toResponse(session)).filter((session): session is SessionResponse => session !== null);
  }

  async revoke(id: string): Promise<void> {
    await this.repository.revoke(id);
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    await this.repository.revokeAllUserSessions(userId);
  }

  async revokeAllUserSessionsExcept(userId: string, sessionId: string): Promise<void> {
    await this.repository.revokeAllUserSessionsExcept(userId, sessionId);
  }
}
