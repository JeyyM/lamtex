import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Daily cron: mark newly overdue orders and create in-app notifications (Supabase RPC).
 * Emails for those orders are sent when Finance loads or can be extended here later.
 *
 * Secured with CRON_SECRET (Vercel sets Authorization: Bearer <CRON_SECRET> on cron invocations).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const cronSecret = process.env.CRON_SECRET?.trim();
  if (process.env.VERCEL && !cronSecret) {
    res.status(503).json({ error: 'CRON_SECRET is required on Vercel' });
    return;
  }
  if (cronSecret) {
    const auth = req.headers.authorization?.trim() ?? '';
    if (auth !== `Bearer ${cronSecret}`) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
  }

  const supabaseUrl = process.env.SUPABASE_URL?.trim() ?? process.env.VITE_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceRoleKey) {
    res.status(503).json({
      error: 'Missing SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY',
    });
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.rpc('process_newly_overdue_orders');
  if (error) {
    console.error('[cron/overdue-payments] RPC failed', error);
    res.status(502).json({ error: error.message });
    return;
  }

  const rows = (data ?? []) as Array<{ order_id: string; days_overdue: number }>;
  res.json({
    ok: true,
    processed: rows.length,
    orders: rows.map((r) => ({
      orderId: r.order_id,
      daysOverdue: Number(r.days_overdue) || 0,
    })),
  });
}
