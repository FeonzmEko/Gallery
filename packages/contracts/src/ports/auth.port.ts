/**
 * Authentication and Authorization (RBAC) Port
 *
 * Implements the "Public Read + Admin Write" permission model.
 * - Guest visitors can freely read public, published content without login.
 * - Write operations (create, update, delete, media upload) and access to private entries require Admin/Owner credentials.
 */

export type UserRole = 'owner' | 'admin' | 'viewer' | 'guest';

export interface AuthUser {
  userId: string;
  role: UserRole;
  email?: string;
  displayName?: string;
}

export interface AuthSession {
  token: string;
  expiresAt: number;
  user: AuthUser;
}

export interface AuthPort {
  /**
   * Verify an authentication token (JWT or Session Token).
   * Returns authenticated user details, or null if invalid or expired.
   */
  verifyToken(token: string): Promise<AuthUser | null>;

  /**
   * Create a new persistent or temporary session for a user.
   */
  createSession(userId: string): Promise<AuthSession>;

  /**
   * Revoke or invalidate an active session token.
   */
  invalidateSession(token: string): Promise<void>;
}

/**
 * Helper to check whether a role has admin/write permissions.
 */
export function hasAdminPrivileges(role?: UserRole | null): boolean {
  return role === 'admin' || role === 'owner';
}

/**
 * Helper to determine whether an entry is viewable by a given role.
 */
export function canViewEntry(
  role: UserRole | null | undefined,
  visibility: 'public' | 'unlisted' | 'private',
  status: 'published' | 'draft' | 'archived',
  deletedAt?: number | null
): boolean {
  if (deletedAt !== null && deletedAt !== undefined) {
    // Deleted entries are only visible to admins/owners
    return hasAdminPrivileges(role);
  }

  if (hasAdminPrivileges(role)) {
    return true;
  }

  // Guest or viewer: only public and published entries are accessible
  if (visibility === 'public' && status === 'published') {
    return true;
  }

  // Unlisted entries might be viewable with direct slug/id if published, but not private
  if (visibility === 'unlisted' && status === 'published') {
    return true;
  }

  return false;
}
