import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  FileQuestion,
  FileText,
  Package,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';

/** Supabase PostgREST "no rows" error from `.single()`. */
export function isSupabaseNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = (error as { code?: string }).code;
  return code === 'PGRST116';
}

export function looksLikeMissingEntityMessage(message: string | null | undefined): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes('not found') ||
    lower.includes('does not exist') ||
    lower.includes('doesn\'t exist') ||
    lower === 'not found'
  );
}

export type EntityNotFoundProps = {
  title: string;
  description?: string;
  backLabel?: string;
  backTo?: string;
  onBack?: () => void;
  icon?: LucideIcon;
  variant?: 'missing' | 'error';
  errorDetail?: string | null;
  onRetry?: () => void;
  retryLabel?: string;
  /** Full viewport centering for public / standalone pages. */
  standalone?: boolean;
  /** Hide the back button (e.g. public customer pages with no in-app history). */
  hideBackButton?: boolean;
  className?: string;
};

export function EntityNotFound({
  title,
  description,
  backLabel = 'Go back',
  backTo,
  onBack,
  icon: Icon = FileText,
  variant = 'missing',
  errorDetail,
  onRetry,
  retryLabel = 'Retry',
  standalone = false,
  hideBackButton = false,
  className,
}: EntityNotFoundProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (backTo) {
      navigate(backTo);
      return;
    }
    navigate(-1);
  };

  const content = (
    <Card className={standalone ? 'shadow-md' : undefined}>
      <CardContent className="p-8 sm:p-12 text-center">
        {variant === 'error' ? (
          <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
        ) : (
          <Icon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        )}
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">{title}</h1>
        {description && (
          <p className="text-gray-500 mb-2 max-w-md mx-auto">{description}</p>
        )}
        {errorDetail && variant === 'error' && (
          <p className="text-sm text-gray-500 mb-4 max-w-md mx-auto">{errorDetail}</p>
        )}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2">
          {onRetry && (
            <Button variant="outline" onClick={onRetry} className="gap-2 w-full sm:w-auto">
              <RefreshCw className="w-4 h-4" />
              {retryLabel}
            </Button>
          )}
          {!hideBackButton && (
            <Button
              variant={onRetry ? 'outline' : 'primary'}
              onClick={handleBack}
              className="gap-2 w-full sm:w-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              {backLabel}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (standalone) {
    return (
      <div className={`min-h-screen bg-gray-50 flex items-center justify-center px-4 ${className ?? ''}`}>
        <div className="w-full max-w-lg">{content}</div>
      </div>
    );
  }

  return (
    <div className={`p-4 md:p-8 flex items-center justify-center min-h-[400px] ${className ?? ''}`}>
      <div className="w-full max-w-lg">{content}</div>
    </div>
  );
}

export function PageNotFound() {
  const navigate = useNavigate();

  return (
    <div className="p-4 md:p-8">
      <Card>
        <CardContent className="p-8 sm:p-12 text-center">
          <FileQuestion className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h1>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            The page you&apos;re looking for doesn&apos;t exist or may have been moved.
          </p>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/** Shorthand titles/descriptions for common entity types. */
export const NOT_FOUND_COPY = {
  order: {
    title: 'Order Not Found',
    description: 'This order does not exist or may have been removed.',
    backLabel: 'Back to Orders',
    backTo: '/orders',
    icon: FileText,
  },
  orderSummary: {
    title: 'Unable to load order',
    description:
      'This order could not be loaded or does not exist. Please contact your sales agent for assistance.',
    icon: FileText,
  },
  product: {
    title: 'Product Not Found',
    description: 'This product does not exist or may have been removed.',
    backLabel: 'Back to Products',
    backTo: '/products',
    icon: Package,
  },
  productCategory: {
    title: 'Category Not Found',
    description: 'This product category does not exist or may have been removed.',
    backLabel: 'Back to Products',
    backTo: '/products',
    icon: Package,
  },
  material: {
    title: 'Material Not Found',
    description: 'This raw material does not exist or may have been removed.',
    backLabel: 'Back to Materials',
    backTo: '/materials',
    icon: Package,
  },
  materialCategory: {
    title: 'Category Not Found',
    description: 'This material category does not exist or may have been removed.',
    backLabel: 'Back to Materials',
    backTo: '/materials',
    icon: Package,
  },
  customer: {
    title: 'Customer Not Found',
    description: 'This customer does not exist or may have been removed.',
    backLabel: 'Back to Customers',
    backTo: '/customers',
  },
  supplier: {
    title: 'Supplier Not Found',
    description: 'This supplier does not exist or may have been removed.',
    backLabel: 'Back to Suppliers',
    backTo: '/suppliers',
  },
  employee: {
    title: 'Employee Not Found',
    description: 'This employee does not exist or is not available in the directory.',
    backLabel: 'Back to Employees',
    backTo: '/employees',
  },
  truck: {
    title: 'Truck Not Found',
    description: 'This truck does not exist or is not part of the fleet.',
    backLabel: 'Back to Fleet',
    backTo: '/logistics',
  },
  purchaseOrder: {
    title: 'Purchase Order Not Found',
    description: 'This purchase order does not exist or may have been removed.',
    backLabel: 'Back to Purchase Orders',
    backTo: '/purchase-orders',
  },
  productionRequest: {
    title: 'Production Request Not Found',
    description: 'This production request does not exist or may have been removed.',
    backLabel: 'Back to Production Requests',
    backTo: '/production-requests',
  },
  interBranchRequest: {
    title: 'Inter-Branch Request Not Found',
    description: 'This inter-branch request does not exist or may have been removed.',
    backLabel: 'Back to Inter-Branch Requests',
    backTo: '/inter-branch-requests',
  },
} as const satisfies Record<
  string,
  {
    title: string;
    description: string;
    backLabel?: string;
    backTo?: string;
    icon?: LucideIcon;
  }
>;
