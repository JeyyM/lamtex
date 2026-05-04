import { supabase } from '@/src/lib/supabase';
import { insertProductLog } from '@/src/lib/domainActivityLog';

const STATUS_PRIORITY: Record<string, number> = {
  'Out of Stock': 4,
  Critical: 3,
  'Low Stock': 2,
  Active: 1,
};

export type ProductStatusLogActor = {
  performedBy: string;
  performedByRole: string;
};

export async function refreshParentProductStatus(
  productId: string,
  actor?: ProductStatusLogActor,
): Promise<void> {
  const { data: product } = await supabase
    .from('products')
    .select('status')
    .eq('id', productId)
    .maybeSingle();
  const prevStatus = (product as { status?: string } | null)?.status ?? null;

  const { data: allVariants } = await supabase
    .from('product_variants')
    .select('status')
    .eq('product_id', productId);
  if (allVariants && allVariants.length > 0) {
    const worstStatus = allVariants.reduce<string>((worst, v) => {
      const vStatus = (v as { status?: string }).status ?? 'Active';
      return (STATUS_PRIORITY[vStatus] ?? 0) > (STATUS_PRIORITY[worst] ?? 0) ? vStatus : worst;
    }, 'Active');
    if (prevStatus === worstStatus) return;
    await supabase.from('products').update({ status: worstStatus }).eq('id', productId);
    if (actor) {
      await insertProductLog(supabase, {
        productId,
        action: 'status_synced',
        description: `Product status updated to ${worstStatus} (rolled up from variants).`,
        performedBy: actor.performedBy,
        performedByRole: actor.performedByRole,
        oldValue: { status: prevStatus },
        newValue: { status: worstStatus },
      });
    }
  }
}
