import React, { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Loader2, Package } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { finishedGoodProductHref } from '@/src/lib/productRoutes';
import { Button } from '@/src/components/ui/Button';

/** Redirects legacy `/products/:id` URLs to the family detail page. */
export function ProductLegacyRedirect() {
  const { id } = useParams<{ id: string }>();
  const [target, setTarget] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!id) {
      setMissing(true);
      return;
    }

    let cancelled = false;

    void (async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, branch, product_categories(slug)')
        .eq('id', id)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data) {
        setMissing(true);
        return;
      }

      const cat = data.product_categories as { slug?: string | null } | { slug?: string | null }[] | null;
      const slug = Array.isArray(cat) ? cat[0]?.slug : cat?.slug;
      setTarget(finishedGoodProductHref(String(data.id), slug, data.branch as string | null));
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (target) {
    return <Navigate to={target} replace />;
  }

  if (missing) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Product not found</p>
          <Button variant="outline" className="mt-4" onClick={() => window.history.back()}>
            Go back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-96">
      <Loader2 className="w-8 h-8 animate-spin text-red-500" />
    </div>
  );
}
