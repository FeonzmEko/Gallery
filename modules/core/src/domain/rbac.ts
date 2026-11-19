import {
  hasAdminPrivileges,
  canViewEntry,
  type AuthUser,
  type UserRole,
  UnauthorizedError,
  ForbiddenError,
} from '@archive/contracts';

export { hasAdminPrivileges, canViewEntry };

/**
 * Asserts that the given user has administrator / owner privileges.
 * Throws UnauthorizedError if unauthenticated, or ForbiddenError if insufficient role.
 */
export function assertAdmin(user?: AuthUser | null): asserts user is AuthUser {
  if (!user) {
    throw new UnauthorizedError('需要管理员身份登录');
  }
  if (!hasAdminPrivileges(user.role)) {
    throw new ForbiddenError('权限不足，仅管理员可执行该操作');
  }
}
