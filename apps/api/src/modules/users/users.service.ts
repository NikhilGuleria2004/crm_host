import { hashPassword, generateSessionToken } from '../../utils/crypto';
import { ObjectId } from 'mongodb';
import { collections } from '../../db/collections';
import { UserRepository } from './users.repository';
import type { CreateUserInput, UpdateUserInput, InviteUserInput, UserResponse } from './users.types';

export class UserService {
  constructor(private repository: UserRepository) {}

  async create(organizationId: string, input: CreateUserInput): Promise<UserResponse> {
    const emailNormalized = input.email.toLowerCase().trim();
    const existing = await this.repository.findByEmail(organizationId, emailNormalized);
    if (existing) {
      throw new Error('User with this email already exists');
    }

    const passwordHash = await hashPassword(input.password);
    const user = await this.repository.create({
      organizationId,
      email: input.email,
      emailNormalized,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      roleIds: input.roleIds || [],
      teamIds: input.teamIds || [],
    });
    return this.repository.toResponse(user)!;
  }

  async invite(organizationId: string, input: InviteUserInput): Promise<UserResponse> {
    const emailNormalized = input.email.toLowerCase().trim();
    const existing = await this.repository.findByEmail(organizationId, emailNormalized);
    if (existing) {
      throw new Error('User with this email already exists');
    }

    const passwordHash = await hashPassword(generateSessionToken());
    const user = await this.repository.create({
      organizationId,
      email: input.email,
      emailNormalized,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      roleIds: input.roleIds,
      teamIds: input.teamIds || [],
      status: 'invited',
    });
    return this.repository.toResponse(user)!;
  }

  async getById(id: string, organizationId: string): Promise<UserResponse | null> {
    const user = await this.repository.findById(id, organizationId);
    return this.repository.toResponse(user);
  }

  async list(organizationId: string): Promise<UserResponse[]> {
    const users = await this.repository.findByOrganizationId(organizationId);
    return users.map((user) => this.repository.toResponse(user)).filter((user): user is UserResponse => user !== null);
  }

  async update(id: string, organizationId: string, input: UpdateUserInput): Promise<UserResponse | null> {
    const user = await this.repository.update(id, organizationId, input);
    return this.repository.toResponse(user);
  }

  async deactivate(id: string, organizationId: string): Promise<void> {
    const existing = await this.repository.findById(id, organizationId);
    if (!existing) {
      return;
    }
    await this.repository.update(id, organizationId, { status: 'deactivated' });

    await collections.sessions().updateMany(
      { userId: new ObjectId(id), revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } }
    );

    await collections.auditLogs().insertOne({
      organizationId: new ObjectId(organizationId),
      actorId: new ObjectId(id),
      action: 'user.deactivated',
      resource: 'user',
      resourceId: id,
      metadata: {},
      createdAt: new Date(),
    } as any);
  }
}
