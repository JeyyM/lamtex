import {
  detailRow,
  emailRefLine,
  esc,
  infoCard,
  sectionTitle,
} from './emailHtmlUtils';

export type ProductStockAlertSeverity = 'out_of_stock' | 'critical' | 'low_stock';
export type ProductStockAlertAudience = 'executive' | 'warehouse';

export interface ProductStockAlertEmailPayload {
  variantId: string;
  productId: string;
  productName: string;
  sku: string;
  size: string | null;
  branchName: string | null;
  /** Severity computed from current stock vs reorder point. */
  severity: ProductStockAlertSeverity;
  /** Recipient role — controls the CTA + greeting. */
  audience: ProductStockAlertAudience;
  /** Stock state at the moment the alert fires. */
  newStock: number;
  previousStock: number;
  reorderPoint: number;
  /** `product_categories.slug` for family page routing. */
  categorySlug?: string | null;
  /** Who/what action triggered the change (e.g. "Stock adjustment by ana@lamtex.com"). */
  triggeredBy?: string | null;
}

function severityLabel(s: ProductStockAlertSeverity): string {
  switch (s) {
    case 'out_of_stock':
      return 'Out of stock';
    case 'critical':
      return 'Critical stock';
    case 'low_stock':
    default:
      return 'Below reorder point';
  }
}

function severityHeaderGradient(s: ProductStockAlertSeverity): string {
  if (s === 'out_of_stock' || s === 'critical') {
    return 'linear-gradient(135deg,#991b1b,#b91c1c)';
  }
  return 'linear-gradient(135deg,#b45309,#d97706)';
}

function severityHeaderSubtle(s: ProductStockAlertSeverity): string {
  if (s === 'out_of_stock' || s === 'critical') return '#fecaca';
  return '#fde68a';
}

function productPageUrl(productId: string, categorySlug?: string | null): string {
  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  const base = appUrl.replace(/\/$/, '');
  const slug = categorySlug?.trim();
  if (slug) {
    return `${base}/products/category/${encodeURIComponent(slug)}/family/${productId}`;
  }
  return `${base}/products/${productId}`;
}

function ctaLabel(audience: ProductStockAlertAudience): string {
  return audience === 'warehouse' ? 'Open product' : 'Review inventory';
}

/** Inventory alert email — fires when a product variant crosses a stock threshold. */
export function buildProductStockAlertEmailHtml(p: ProductStockAlertEmailPayload): string {
  const sizeLabel = p.size?.trim() ? `, ${p.size.trim()}` : '';
  const productLine = `${p.productName}${sizeLabel}`;
  const branchSuffix = p.branchName?.trim() ? ` — ${p.branchName.trim()}` : '';
  const severityText = severityLabel(p.severity);
  const headerGradient = severityHeaderGradient(p.severity);
  const headerSubtle = severityHeaderSubtle(p.severity);

  const summaryRows = [
    detailRow('Product', productLine),
    detailRow('SKU', p.sku),
    detailRow('Branch', p.branchName?.trim() || 'All branches'),
    detailRow('Current stock', `${p.newStock.toLocaleString()} units`),
    detailRow('Previous stock', `${p.previousStock.toLocaleString()} units`),
    detailRow('Reorder point', `${p.reorderPoint.toLocaleString()} units`),
    detailRow('Severity', severityText),
    ...(p.triggeredBy?.trim() ? [detailRow('Triggered by', p.triggeredBy.trim())] : []),
  ].join('');

  const bodyMessage =
    p.severity === 'out_of_stock'
      ? `${esc(p.sku)} · ${esc(productLine)} is <strong>out of stock</strong>${esc(branchSuffix)}.`
      : p.severity === 'critical'
        ? `${esc(p.sku)} · ${esc(productLine)} is at <strong>critical stock</strong>${esc(branchSuffix)}: ${p.newStock.toLocaleString()} units on hand (reorder at ${p.reorderPoint.toLocaleString()}).`
        : `${esc(p.sku)} · ${esc(productLine)} is <strong>below reorder point</strong>${esc(branchSuffix)}: ${p.newStock.toLocaleString()} units on hand (reorder at ${p.reorderPoint.toLocaleString()}).`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #e5e7eb;">
        <tr>
          <td style="background:${headerGradient};padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">Inventory alert — ${esc(severityText)}</h1>
            <p style="margin:8px 0 0;color:${headerSubtle};font-size:14px;">${esc(p.sku)} · ${esc(productLine)}${esc(branchSuffix)}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            ${emailRefLine(p.sku, `Stock alert · ${severityText}`)}
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.55;">
              ${bodyMessage}
            </p>
            ${infoCard('Stock snapshot', summaryRows, `${p.sku} · ${p.variantId}`)}
            ${sectionTitle('Next steps', p.sku)}
            <ul style="margin:0 0 24px;padding-left:20px;font-size:14px;line-height:1.6;color:#374151;">
              <li>Confirm on-hand stock against the system value.</li>
              <li>Open the product page to review variant history and assigned suppliers.</li>
              <li>Initiate a production request or inter-branch transfer as appropriate.</li>
            </ul>
            <div style="text-align:center;">
              <a href="${productPageUrl(p.productId, p.categorySlug)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,.06);">${esc(ctaLabel(p.audience))}</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">
            Lamtex · Inventory notification
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
