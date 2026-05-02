import { supabase } from '@/src/lib/supabase';

const STATUS_PRIORITY: Record<string, number> = {
  'Out of Stock': 4,
  Critical: 3,
  'Low Stock': 2,
  Active: 1,
};

export async function refreshParentProductStatus(productId: string): Promise<void> {
  const { data: allVariants } = await supabase.from('product_variants').select('status').eq('product_id', productId);
  if (allVariants && allVariants.length > 0) {
    const worstStatus = allVariants.reduce<string>((worst, v) => {
      const vStatus = (v as { status?: string }).status ?? 'Active';
      return (STATUS_PRIORITY[vStatus] ?? 0) > (STATUS_PRIORITY[worst] ?? 0) ? vStatus : worst;
    }, 'Active');
    await supabase.from('products').update({ status: worstStatus }).eq('id', productId);
  }
}
