const TERMINAL = ['Completed', 'Cancelled', 'Rejected'] as const;

function startOfLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Parse YYYY-MM-DD or ISO date string to local calendar date (date parts only). */
function parseDateOnly(s: string): Date {
  const m = s.slice(0, 10);
  const [y, mo, d] = m.split('-').map((x) => parseInt(x, 10));
  if (Number.isNaN(y) || Number.isNaN(mo) || Number.isNaN(d)) return new Date(NaN);
  return new Date(y, mo - 1, d);
}

/**
 * True when an expected completion date is set, is before today (local), and the request is not closed.
 */
export function isPrExpectedOverdue(
  expectedCompletionDate: string | null | undefined,
  status: string,
): boolean {
  if (expectedCompletionDate == null || String(expectedCompletionDate).trim() === '') return false;
  if ((TERMINAL as readonly string[]).includes(status)) return false;
  const exp = parseDateOnly(String(expectedCompletionDate));
  if (Number.isNaN(exp.getTime())) return false;
  const today = startOfLocalDay(new Date());
  return startOfLocalDay(exp) < today;
}
