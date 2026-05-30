import type { UserRole } from '@/src/types';

const KEY_PREFIX = 'lamtex:activeDashboardRole:';

export function getStoredActiveDashboardRole(employeeId: string): UserRole | null {
  try {
    const raw = localStorage.getItem(`${KEY_PREFIX}${employeeId}`);
    return raw ? (raw as UserRole) : null;
  } catch {
    return null;
  }
}

export function setStoredActiveDashboardRole(employeeId: string, role: UserRole): void {
  try {
    localStorage.setItem(`${KEY_PREFIX}${employeeId}`, role);
  } catch {
    /* private browsing / blocked storage */
  }
}
