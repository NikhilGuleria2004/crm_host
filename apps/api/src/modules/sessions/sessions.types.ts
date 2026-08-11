export interface SessionResponse {
  id: string;
  userId: string;
  organizationId: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
}

export interface CreateSessionInput {
  userId: string;
  organizationId: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface RevokeSessionInput {
  sessionId: string;
}
