import type { Branch } from '@/src/types';

export const SELECTED_BRANCH_STORAGE_KEY = 'lamtex:selectedBranch';

/** Last branch chosen in the topbar — shared across tabs via localStorage. */
export function getSelectedBranch(): Branch {
  try {
    return (localStorage.getItem(SELECTED_BRANCH_STORAGE_KEY) ?? '') as Branch;
  } catch {
    return '';
  }
}

export function setSelectedBranch(branch: Branch): void {
  try {
    const trimmed = branch?.trim() ?? '';
    if (trimmed) localStorage.setItem(SELECTED_BRANCH_STORAGE_KEY, trimmed);
    else localStorage.removeItem(SELECTED_BRANCH_STORAGE_KEY);
  } catch {
    /* private browsing / blocked storage */
  }
}
