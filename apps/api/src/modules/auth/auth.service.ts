import { ObjectId } from 'mongodb';
import { MembershipRepository } from '../memberships/memberships.repository';
import { OrganizationRepository } from '../organizations/organizations.repository';
import { UserRepository } from '../users/users.repository';
import { SessionRepository } from '../sessions/sessions.repository';
import { RoleService } from '../roles/roles.service';
import { AuthRepository } from './auth.repository';
import { hashPassword, comparePasswords, generateSessionToken, hashToken } from '../../utils/crypto';
import { collections } from '../../db/collections';
import type { AuthResponse, RegisterInput, LoginInput, ForgotPasswordInput, ResetPasswordInput, ChangePasswordInput } from './auth.types';

function toAuthResponse(
  user: { _id: ObjectId; email: string; firstName: string; lastName: string; status: string; roleIds: string[] },
  organization: { id: string; name: string },
  permissions: string[]
): AuthResponse {
  return {
    user: {
      id: user._id.toHexString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
    },
    organization: {
      id: organization.id,
      name: organization.name,
    },
    permissions,
  };
}

async function getUserPermissions(roleIds: string[]): Promise<string[]> {
  const rolePermissions = await collections.rolePermissions().find({
    roleId: { $in: roleIds.map((id) => new ObjectId(id)) },
  }).toArray();
  const permissions = new Set<string>();
  for (const rp of rolePermissions) {
    permissions.add(rp.permission);
  }
  return Array.from(permissions);
}

export class AuthService {
  constructor(
    private organizationRepository: OrganizationRepository,
    private userRepository: UserRepository,
    private sessionRepository: SessionRepository,
    private roleService: RoleService,
    private authRepository: AuthRepository,
    private membershipRepository: MembershipRepository
  ) {}

  async register(input: RegisterInput): Promise<{ authResponse: AuthResponse; sessionId: string }> {
    const emailNormalized = input.email.toLowerCase().trim();
    const existing = await this.userRepository.findByEmailNormalized(emailNormalized);
    if (existing) {
      throw new Error('User with this email already exists');
    }

    const orgName = input.firstName + ' ' + input.lastName + "'s Organization";
    let slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    let existingOrg = await this.organizationRepository.findBySlug(slug);
    let suffix = 1;
    while (existingOrg) {
      slug = `${slug}-${suffix}`;
      existingOrg = await this.organizationRepository.findBySlug(slug);
      suffix++;
    }

    const org = await this.organizationRepository.create({
      name: orgName,
      slug,
      timezone: 'UTC',
      currency: 'USD',
      locale: 'en',
    });

    await this.roleService.seedDefaultRoles(org.id);
    const ownerRole = await collections.roles().findOne({
      organizationId: new ObjectId(org.id),
      name: 'Owner',
    });
    if (!ownerRole) throw new Error('Owner role not found after seeding');

    const passwordHash = await hashPassword(input.password);
    const user = await this.userRepository.create({
      organizationId: org.id,
      email: input.email,
      emailNormalized,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      roleIds: [ownerRole._id.toHexString()],
      teamIds: [],
      status: 'active',
    });

    await this.membershipRepository.create({
      userId: user._id.toHexString(),
      organizationId: org.id,
      roleId: ownerRole._id.toHexString(),
      teamIds: [],
      status: 'active',
    });

    const token = generateSessionToken();
    const tokenHash = hashToken(token);
    void this.sessionRepository.create({
      userId: user._id.toHexString(),
      organizationId: org.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    const permissions = await getUserPermissions([ownerRole._id.toHexString()]);
    return {
      authResponse: toAuthResponse(
        { ...user, roleIds: user.roleIds.map((id) => id.toHexString()) },
        { id: org.id, name: org.name },
        permissions
      ),
      sessionId: token,
    };
  }

  async login(input: LoginInput, ipAddress?: string, userAgent?: string): Promise<{ authResponse: AuthResponse; sessionId: string }> {
    const emailNormalized = input.email.toLowerCase().trim();
    const user = await this.userRepository.findByEmailNormalized(emailNormalized);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const valid = await comparePasswords(input.password, user.passwordHash);
    if (!valid) {
      throw new Error('Invalid credentials');
    }

    if (user.status !== 'active') {
      throw new Error('Account is not active');
    }

    const org = await this.organizationRepository.findById(user.organizationId.toHexString());
    if (!org) {
      throw new Error('Organization not found');
    }

    const token = generateSessionToken();
    const tokenHash = hashToken(token);
    void this.sessionRepository.create({
      userId: user._id.toHexString(),
      organizationId: user.organizationId.toHexString(),
      tokenHash,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      ipAddress,
      userAgent,
    });

    const permissions = await getUserPermissions(user.roleIds.map((id) => id.toHexString()));
    return {
      authResponse: toAuthResponse(
        { ...user, roleIds: user.roleIds.map((id) => id.toHexString()) },
        { id: org.id, name: org.name },
        permissions
      ),
      sessionId: token,
    };
  }

  async logout(sessionId: string): Promise<void> {
    await this.sessionRepository.revokeByTokenHash(hashToken(sessionId));
  }

  async me(userId: string, organizationId: string): Promise<AuthResponse> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const org = await this.organizationRepository.findById(organizationId);
    if (!org) {
      throw new Error('Organization not found');
    }

    const permissions = await getUserPermissions(user.roleIds.map((id) => id.toHexString()));
    return toAuthResponse(
      { ...user, roleIds: user.roleIds.map((id) => id.toHexString()) },
      { id: org.id, name: org.name },
      permissions
    );
  }

  async forgotPassword(input: ForgotPasswordInput): Promise<void> {
    const emailNormalized = input.email.toLowerCase().trim();
    const user = await this.userRepository.findByEmailNormalized(emailNormalized);
    if (!user) {
      return;
    }

    const token = generateSessionToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.authRepository.createPasswordResetToken(
      user._id.toHexString(),
      user.organizationId.toHexString(),
      tokenHash,
      expiresAt
    );

    // In production, send email with token to user
  }

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const tokenHash = hashToken(input.token);
    const resetToken = await this.authRepository.findValidPasswordResetToken(tokenHash);
    if (!resetToken) {
      throw new Error('Invalid or expired reset token');
    }

    const user = await this.userRepository.findById(resetToken.userId.toHexString());
    if (!user) {
      throw new Error('User not found');
    }

    const passwordHash = await hashPassword(input.password);
    await this.userRepository.updatePassword(user._id.toHexString(), passwordHash);
    await this.authRepository.markPasswordResetTokenUsed(resetToken._id.toHexString());
    await this.sessionRepository.revokeAllUserSessions(user._id.toHexString());
  }

  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const valid = await comparePasswords(input.currentPassword, user.passwordHash);
    if (!valid) {
      throw new Error('Current password is incorrect');
    }

    const passwordHash = await hashPassword(input.newPassword);
    await this.userRepository.updatePassword(userId, passwordHash);
  }
}