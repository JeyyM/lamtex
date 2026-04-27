/**
 * Must match `branches.name` exactly (used in `eq('branch', branch)`, `products.branch`, etc.).
 * Your live DB uses short city names; if you rename rows in `branches`, update these strings.
 */
export const LAMTEX_BRANCH_NCR = 'Manila';
export const LAMTEX_BRANCH_VISAYAS = 'Cebu';
export const LAMTEX_BRANCH_CALABARZON = 'Batangas';

export const LAMTEX_DEMO_BRANCHES = [LAMTEX_BRANCH_NCR, LAMTEX_BRANCH_VISAYAS, LAMTEX_BRANCH_CALABARZON] as const;
