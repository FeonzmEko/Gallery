import { describe, it, expect, beforeEach } from 'vitest';
import {
  AuthService,
  hashPassword,
  verifyPassword,
  assertAdmin,
  canViewEntry,
} from '../src/index.js';
import { users } from '../src/infrastructure/schema.js';
import { createTestDatabase } from './test-db.js';
import { UnauthorizedError, ForbiddenError } from '@archive/contracts';

describe('Domain Crypto & Password Hashing', () => {
  it('should hash and verify passwords using PBKDF2', async () => {
    const password = 'SecretPassword123!';
    const hash = await hashPassword(password);

    expect(hash).toMatch(/^pbkdf2:100000:[0-9a-f]{32}:[0-9a-f]{64}$/);

    const isMatch = await verifyPassword(password, hash);
    expect(isMatch).toBe(true);

    const isWrong = await verifyPassword('WrongPassword', hash);
    expect(isWrong).toBe(false);
  });

  it('should reject empty or null hash gracefully', async () => {
    expect(await verifyPassword('test', null)).toBe(false);
    expect(await verifyPassword('test', '')).toBe(false);
  });
});

describe('RBAC Assertion Guards', () => {
  it('should allow admin or owner', () => {
    expect(() => assertAdmin({ userId: 'u1', role: 'owner' })).not.toThrow();
    expect(() => assertAdmin({ userId: 'u2', role: 'admin' })).not.toThrow();
  });

  it('should throw UnauthorizedError when user is not logged in', () => {
    expect(() => assertAdmin(null)).toThrow(UnauthorizedError);
    expect(() => assertAdmin(undefined)).toThrow(UnauthorizedError);
  });

  it('should throw ForbiddenError when user has viewer/guest role', () => {
    expect(() => assertAdmin({ userId: 'u3', role: 'viewer' })).toThrow(ForbiddenError);
    expect(() => assertAdmin({ userId: 'u4', role: 'guest' })).toThrow(ForbiddenError);
  });

  it('should correctly evaluate canViewEntry for visitors vs admin', () => {
    // Visitor: only public + published
    expect(canViewEntry('guest', 'public', 'published')).toBe(true);
    expect(canViewEntry('guest', 'private', 'published')).toBe(false);
    expect(canViewEntry('guest', 'public', 'draft')).toBe(false);
    expect(canViewEntry('guest', 'public', 'published', Date.now())).toBe(false);

    // Admin: sees everything
    expect(canViewEntry('admin', 'private', 'draft')).toBe(true);
    expect(canViewEntry('owner', 'private', 'published')).toBe(true);
    expect(canViewEntry('admin', 'public', 'published', Date.now())).toBe(true);
  });
});

describe('AuthService', () => {
  let authService: AuthService;
  let db: ReturnType<typeof createTestDatabase>['db'];

  beforeEach(async () => {
    const testDb = createTestDatabase();
    db = testDb.db;
    authService = new AuthService(db, {
      jwtSecret: 'test-secret-key-32-bytes-long!!',
      sessionDurationSeconds: 3600,
    });

    // Seed test admin user
    const passwordHash = await hashPassword('AdminPass2026!');
    await db.insert(users).values({
      id: 'admin_1',
      email: 'admin@archive.internal',
      displayName: 'Archivist Master',
      passwordHash,
      role: 'owner',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  it('should authenticate valid credentials and reject invalid ones', async () => {
    const validUser = await authService.validateCredentials(
      'admin@archive.internal',
      'AdminPass2026!'
    );
    expect(validUser).not.toBeNull();
    expect(validUser?.userId).toBe('admin_1');
    expect(validUser?.role).toBe('owner');

    const wrongPassword = await authService.validateCredentials(
      'admin@archive.internal',
      'BadPass'
    );
    expect(wrongPassword).toBeNull();

    const wrongEmail = await authService.validateCredentials(
      'nonexistent@archive.internal',
      'AdminPass2026!'
    );
    expect(wrongEmail).toBeNull();
  });

  it('should create and verify JWT session token', async () => {
    const session = await authService.createSession('admin_1');
    expect(session.token).toBeDefined();
    expect(session.user.userId).toBe('admin_1');
    expect(session.expiresAt).toBeGreaterThan(Date.now());

    // Verify token
    const verified = await authService.verifyToken(session.token);
    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe('admin_1');
    expect(verified?.role).toBe('owner');
    expect(verified?.email).toBe('admin@archive.internal');
  });

  it('should return null when token is tampered or invalid', async () => {
    const invalidResult = await authService.verifyToken('malformed.token.here');
    expect(invalidResult).toBeNull();

    const emptyResult = await authService.verifyToken('');
    expect(emptyResult).toBeNull();
  });

  it('should retrieve user profile excluding password hash for /me', async () => {
    const profile = await authService.getUserProfile('admin_1');
    expect(profile).not.toBeNull();
    expect(profile?.id).toBe('admin_1');
    expect(profile?.email).toBe('admin@archive.internal');
    expect(profile?.displayName).toBe('Archivist Master');
    expect((profile as any).passwordHash).toBeUndefined();
  });
});
