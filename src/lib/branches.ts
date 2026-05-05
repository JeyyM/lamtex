import { supabase } from '@/src/lib/supabase';

/** Dispatch after inserting/updating branches so the header selector refetches. */
export const LAMTEX_BRANCHES_CHANGED_EVENT = 'lamtex:branches-changed';

export function notifyBranchesChanged(): void {
  window.dispatchEvent(new Event(LAMTEX_BRANCHES_CHANGED_EVENT));
}

export async function createBranchRecord(input: {
  name: string;
  code: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const name = input.name.trim();
  const code = input.code.trim().toUpperCase();
  if (!name) return { ok: false, error: 'Branch name is required.' };
  if (!code) return { ok: false, error: 'Branch code is required.' };
  if (code.length > 10) return { ok: false, error: 'Branch code must be 10 characters or fewer.' };

  const { data, error } = await supabase
    .from('branches')
    .insert({ name, code, is_active: true })
    .select('id')
    .single();

  if (error) return { ok: false, error: error.message };
  if (!data?.id) return { ok: false, error: 'Could not create branch.' };
  return { ok: true, id: String(data.id) };
}
