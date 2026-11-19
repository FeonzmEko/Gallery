import { eq } from 'drizzle-orm';
import type { ArchiveDb } from '@archive/database';
import {
  type AuthPort,
  type AuthUser,
  type AuthSession,
  NotFoundError,
  UnauthorizedError,
} from '@archive/contracts';
import { users, type UserSelect } from '../infrastructure/schema.js';
import { verifyPassword, signJwt, verifyJwt } from '../domain/crypto.js';

export interface AuthServiceConfig {
  jwtSecret: string;
  sessionDurationSeconds?: number;
}

export class AuthService implements AuthPort {
  private readonly db: ArchiveDb;
  private readonly jwtSecret: string;
  private readonly sessionDuration: number;

  constructor(db: ArchiveDb, config: AuthServiceConfig) {
    this.db = db;
    this.jwtSecret = config.jwtSecret;
    this.sessionDuration = config.sessionDurationSeconds ?? 7 * 24 * 3600;
  }

  /**
   * Validate user credentials against the database.
   * Returns authenticated user info on success, or null on failure.
   */
  async validateCredentials(email: string, password: string): Promise<AuthUser | null> {
    const cleanEmail = email.trim().toLowerCase();
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.email, cleanEmail))
      .limit(1);

    const user = result[0];
    if (!user) {
      return null;
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return null;
    }

    return {
      userId: user.id,
      role: user.role as AuthUser['role'],
      email: user.email,
      displayName: user.displayName,
    };
  }

  /**
   * Create an authentication session token for a given user.
   */
  async createSession(userId: string): Promise<AuthSession> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const user = result[0];
    if (!user) {
      throw new NotFoundError('用户不存在', userId);
    }

    const authUser: AuthUser = {
      userId: user.id,
      role: user.role as AuthUser['role'],
      email: user.email,
      displayName: user.displayName,
    };

    const token = await signJwt(
      {
        userId: authUser.userId,
        role: authUser.role,
        email: authUser.email,
        displayName: authUser.displayName,
      },
      this.jwtSecret,
      this.sessionDuration
    );

    const expiresAt = Date.now() + this.sessionDuration * 1000;

    return {
      token,
      expiresAt,
      user: authUser,
    };
  }

  /**
   * Verify an authentication token and return the associated AuthUser.
   */
  async verifyToken(token: string): Promise<AuthUser | null> {
    if (!token) {
      return null;
    }

    const payload = await verifyJwt<{
      userId: string;
      role: string;
      email?: string;
      displayName?: string;
    }>(token, this.jwtSecret);

    if (!payload || !payload.userId || !payload.role) {
      return null;
    }

    return {
      userId: payload.userId,
      role: payload.role as AuthUser['role'],
      email: payload.email,
      displayName: payload.displayName,
    };
  }

  /**
   * Revoke or invalidate a session.
   */
  async invalidateSession(_token: string): Promise<void> {
    // JWT is stateless; revocation can be enhanced with an in-memory / KV blacklist in future
  }

  /**
   * Get user profile details for `/me` route, excluding sensitive password hash.
   */
  async getUserProfile(userId: string): Promise<Omit<UserSelect, 'passwordHash'> | null> {
    const result = await this.db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Get AuthUser details by ID.
   */
  async getUserById(userId: string): Promise<AuthUser | null> {
    const profile = await this.getUserProfile(userId);
    if (!profile) {
      return null;
    }
    return {
      userId: profile.id,
      role: profile.role as AuthUser['role'],
      email: profile.email,
      displayName: profile.displayName,
    };
  }
}
