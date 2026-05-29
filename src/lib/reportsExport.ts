import { csvDateOnlyIso } from './datePeriodQuery';
import type { ReportsBundle } from './reportsData';

function xlsxOptionalNumber(v: number | string | null | undefined): number | '' {
  if (v == null || v === '') return '';
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : '';
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '';
  return csvDateOnlyIso(d);
}

async function finalizeWorkbook(
  XLSX: typeof import('xlsx'),
  wb: ReturnType<typeof import('xlsx')['utils']['book_new']>,
  filenameBase: string,
  branchLabel: string,
) {
  const safeBranch = branchLabel.replace(/[^\w.-]+/g, '_').slice(0, 40);
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filenameBase}-${safeBranch || 'export'}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export interface ReportsSectionExportParams {
  bundle: ReportsBundle;
  branchLabel: string;
  periodLabel: string;
}

function salesSeriesSheet(XLSX: typeof import('xlsx'), bundle: ReportsBundle) {
  return XLSX.utils.aoa_to_sheet([
    ['Period', 'Month Key', 'Revenue', 'Orders', 'Avg Order Value', 'Growth %'],
    ...bundle.salesSeries.map((r) => [
      r.period,
      r.monthKey,
      xlsxOptionalNumber(r.revenue),
      xlsxOptionalNumber(r.orders),
      xlsxOptionalNumber(r.avgOrderValue),
      xlsxOptionalNumber(r.growth),
    ]),
  ]);
}

function branchRevenueShareSheet(XLSX: typeof import('xlsx'), bundle: ReportsBundle) {
  return XLSX.utils.aoa_to_sheet([
    ['Branch', 'Revenue'],
    ...bundle.branchRevenueShare.map((r) => [r.branchName, xlsxOptionalNumber(r.revenue)]),
  ]);
}

function categoryMarginSheet(XLSX: typeof import('xlsx'), bundle: ReportsBundle) {
  return XLSX.utils.aoa_to_sheet([
    ['Category', 'Revenue', 'Profit', 'Margin %', 'Units Sold'],
    ...bundle.enhancements.categoryMargins.map((c) => [
      c.categoryName,
      xlsxOptionalNumber(c.revenue),
      xlsxOptionalNumber(c.profit),
      xlsxOptionalNumber(c.marginPct),
      xlsxOptionalNumber(c.unitsSold),
    ]),
  ]);
}

export async function downloadReportsOverviewWorkbook(params: ReportsSectionExportParams) {
  const { bundle, branchLabel, periodLabel } = params;
  const s = bundle.agents.summary;
  const enh = bundle.enhancements;
  const finance = bundle.finance;
  const aov = s.totalOrders > 0 ? s.totalRevenue / s.totalOrders : 0;
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['Field', 'Value'],
      ['Export Period', periodLabel],
      ['Branch', branchLabel],
      ['Revenue', xlsxOptionalNumber(s.totalRevenue)],
      ['Revenue Δ% vs Prior', xlsxOptionalNumber(s.revenueDeltaPct)],
      ['Gross Profit', xlsxOptionalNumber(s.totalProfit)],
      ['Profit Margin %', xlsxOptionalNumber(s.profitMarginPct)],
      ['Profit Δ% vs Prior', xlsxOptionalNumber(s.profitDeltaPct)],
      ['Orders', xlsxOptionalNumber(s.totalOrders)],
      ['Orders Δ% vs Prior', xlsxOptionalNumber(enh.periodCounts.ordersDeltaPct)],
      ['Avg Order Value', xlsxOptionalNumber(aov)],
      ['On-Time Collection Rate %', xlsxOptionalNumber(enh.collectionCompare.collectionRateCurrent)],
      ['Collected On Time', xlsxOptionalNumber(enh.collectionCompare.collectedCurrent)],
      ['Overdue Balance', xlsxOptionalNumber(enh.collectionCompare.overdueBalanceCurrent)],
      ['Overdue Orders', xlsxOptionalNumber(enh.collectionCompare.overdueOrderCountCurrent)],
      ['Outstanding AR', xlsxOptionalNumber(finance.totalOutstanding)],
      ['AR Overdue Count', xlsxOptionalNumber(finance.overdueCount)],
      ['On-Time Delivery %', xlsxOptionalNumber(enh.periodCounts.onTimeMtd)],
      ['In Transit Now', xlsxOptionalNumber(bundle.executive.logistics.inTransitNow)],
      ['Commissions Paid', xlsxOptionalNumber(s.commissionPaid)],
      ['Commissions Earned', xlsxOptionalNumber(s.commissionEarned)],
      ['Commission Liability', xlsxOptionalNumber(s.commissionLiability)],
    ]),
    'Summary',
  );

  XLSX.utils.book_append_sheet(wb, salesSeriesSheet(XLSX, bundle), 'Monthly Sales');
  XLSX.utils.book_append_sheet(wb, branchRevenueShareSheet(XLSX, bundle), 'Branch Revenue Share');

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['Branch', 'Health Score', 'Revenue', 'Quota Attainment %', 'Profit Margin %', 'On-Time %', 'Outstanding', 'Overdue Ratio %'],
      ...enh.branchScorecard.map((b) => [
        b.branchName,
        xlsxOptionalNumber(b.healthScore),
        xlsxOptionalNumber(b.revenue),
        xlsxOptionalNumber(b.quotaAttainmentPct),
        xlsxOptionalNumber(b.profitMarginPct),
        xlsxOptionalNumber(b.onTimePct),
        xlsxOptionalNumber(b.outstanding),
        xlsxOptionalNumber(b.overdueRatioPct),
      ]),
    ]),
    'Branch Scorecard',
  );

  XLSX.utils.book_append_sheet(wb, categoryMarginSheet(XLSX, bundle), 'Category Revenue Mix');

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      [
        'Customer Code',
        'Customer',
        'Agent',
        'Branch',
        'Outstanding Balance',
        'Overdue Balance',
        'Overdue Orders',
        'Open Orders',
        'Max Days Overdue',
        'Oldest Due Date',
      ],
      ...enh.customerArRows.map((c) => [
        c.customerCode ?? '',
        c.customerName,
        c.agentName ?? '',
        c.branchName ?? '',
        xlsxOptionalNumber(c.outstandingBalance),
        xlsxOptionalNumber(c.overdueBalance),
        xlsxOptionalNumber(c.overdueOrderCount),
        xlsxOptionalNumber(c.openOrderCount),
        xlsxOptionalNumber(c.maxDaysOverdue),
        fmtDate(c.oldestDueDate),
      ]),
    ]),
    'Outstanding AR',
  );

  await finalizeWorkbook(XLSX, wb, 'reports-overview', branchLabel);
}

export async function downloadReportsSalesWorkbook(params: ReportsSectionExportParams) {
  const { bundle, branchLabel, periodLabel } = params;
  const s = bundle.agents.summary;
  const enh = bundle.enhancements;
  const snap = enh.customerSalesSnapshot;
  const cc = enh.collectionCompare;
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['Field', 'Value'],
      ['Export Period', periodLabel],
      ['Branch', branchLabel],
      ['Period Revenue', xlsxOptionalNumber(s.totalRevenue)],
      ['Revenue Δ% vs Prior', xlsxOptionalNumber(s.revenueDeltaPct)],
      ['Active Customers', xlsxOptionalNumber(snap.activeCustomers)],
      ['On-Time Collection Rate %', xlsxOptionalNumber(cc.collectionRateCurrent)],
      ['Collection Rate Δ pts', xlsxOptionalNumber(cc.collectionRateDeltaPts)],
      ['Collected On Time', xlsxOptionalNumber(cc.collectedCurrent)],
      ['Matured Order Value', xlsxOptionalNumber(cc.maturedGrossCurrent)],
      ['Prior On-Time Rate %', xlsxOptionalNumber(cc.collectionRatePrev)],
      ['Overdue AR', xlsxOptionalNumber(snap.totalOverdueBalance)],
      ['Customers With Overdue', xlsxOptionalNumber(snap.customersWithOverdue)],
      ['Total AR', xlsxOptionalNumber(snap.totalOutstanding)],
    ]),
    'Summary',
  );

  XLSX.utils.book_append_sheet(wb, salesSeriesSheet(XLSX, bundle), 'Monthly Sales');
  XLSX.utils.book_append_sheet(wb, branchRevenueShareSheet(XLSX, bundle), 'Branch Revenue Share');

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      [
        'Customer Code',
        'Customer',
        'Agent',
        'Branch',
        'Orders',
        'Revenue',
        'Avg Order Value',
        'Outstanding',
        'Overdue',
        'Overdue Orders',
        'Open Orders',
        'Max Days Overdue',
        'Oldest Due',
        'Credit Limit',
        'Credit Used',
        'Credit Utilization %',
      ],
      ...enh.customersInPeriod.map((c) => [
        c.customerCode ?? '',
        c.customerName,
        c.agentName ?? '',
        c.branchName ?? '',
        xlsxOptionalNumber(c.orderCount),
        xlsxOptionalNumber(c.revenue),
        xlsxOptionalNumber(c.averageOrderValue),
        xlsxOptionalNumber(c.outstandingBalance),
        xlsxOptionalNumber(c.overdueBalance),
        xlsxOptionalNumber(c.overdueOrderCount),
        xlsxOptionalNumber(c.openOrderCount),
        xlsxOptionalNumber(c.maxDaysOverdue),
        fmtDate(c.oldestDueDate),
        xlsxOptionalNumber(c.creditLimit),
        xlsxOptionalNumber(c.creditUsed),
        xlsxOptionalNumber(c.creditUtilizationPct),
      ]),
    ]),
    'Customers',
  );

  await finalizeWorkbook(XLSX, wb, 'reports-sales', branchLabel);
}

export async function downloadReportsProductsWorkbook(params: ReportsSectionExportParams) {
  const { bundle, branchLabel, periodLabel } = params;
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['Export Period', periodLabel],
      ['Branch', branchLabel],
      [],
      ['Category', 'Revenue', 'Profit', 'Margin %', 'Units Sold'],
      ...bundle.enhancements.categoryMargins.map((c) => [
        c.categoryName,
        xlsxOptionalNumber(c.revenue),
        xlsxOptionalNumber(c.profit),
        xlsxOptionalNumber(c.marginPct),
        xlsxOptionalNumber(c.unitsSold),
      ]),
    ]),
    'Category Performance',
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['Product', 'Category', 'Units Sold', 'Revenue', 'Orders', 'Profit', 'Margin %'],
      ...bundle.productsInPeriod.map((p) => [
        p.productName,
        p.categoryName,
        xlsxOptionalNumber(p.unitsSold),
        xlsxOptionalNumber(p.revenue),
        xlsxOptionalNumber(p.orderCount),
        xlsxOptionalNumber(p.profit),
        xlsxOptionalNumber(p.marginPct),
      ]),
    ]),
    'Product Revenue',
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['SKU', 'Product', 'Size', 'Units Sold', 'Revenue', 'Profit', 'Margin %', 'Orders'],
      ...bundle.productVariantSales.map((v) => [
        v.sku,
        v.productName,
        v.size,
        xlsxOptionalNumber(v.unitsSold),
        xlsxOptionalNumber(v.revenue),
        xlsxOptionalNumber(v.profit),
        xlsxOptionalNumber(v.marginPct),
        xlsxOptionalNumber(v.orderCount),
      ]),
    ]),
    'Variant Breakdown',
  );

  // Roll the per-order product/customer lines up to one row per customer.
  const byCustomer = new Map<
    string,
    { code: string; name: string; agent: string; units: number; revenue: number }
  >();
  for (const line of bundle.productCustomerLines) {
    const cur = byCustomer.get(line.customerId) ?? {
      code: line.customerCode ?? '',
      name: line.customerName,
      agent: line.agentName ?? '',
      units: 0,
      revenue: 0,
    };
    cur.units += line.unitsSold;
    cur.revenue += line.revenue;
    byCustomer.set(line.customerId, cur);
  }
  const topCustomers = [...byCustomer.values()].sort((a, b) => b.revenue - a.revenue);

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['Customer Code', 'Customer', 'Agent', 'Units Sold', 'Revenue'],
      ...topCustomers.map((c) => [
        c.code,
        c.name,
        c.agent,
        xlsxOptionalNumber(c.units),
        xlsxOptionalNumber(c.revenue),
      ]),
    ]),
    'Top Customers',
  );

  await finalizeWorkbook(XLSX, wb, 'reports-products', branchLabel);
}

export async function downloadReportsInventoryWorkbook(params: ReportsSectionExportParams) {
  const { bundle, branchLabel, periodLabel } = params;
  const inv = bundle.inventoryReport;
  const sum = inv.summary;
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['Field', 'Value'],
      ['Export Period', periodLabel],
      ['Branch', branchLabel],
      ['PO Spend', xlsxOptionalNumber(sum.purchaseOrderSpend)],
      ['PO Count', xlsxOptionalNumber(sum.purchaseOrderCount)],
      ['PO Paid', xlsxOptionalNumber(sum.purchaseOrderPaid)],
      ['PO Outstanding', xlsxOptionalNumber(sum.purchaseOrderSpend - sum.purchaseOrderPaid)],
      ['Production Requests', xlsxOptionalNumber(sum.productionRequestCount)],
      ['Pending Production Requests', xlsxOptionalNumber(sum.pendingProductionRequestCount)],
      ['Inventory Value', xlsxOptionalNumber(sum.inventoryValue)],
      ['Raw Materials', xlsxOptionalNumber(sum.rawMaterialCount)],
      ['Low-Stock Materials', xlsxOptionalNumber(sum.lowStockMaterialCount)],
      ['Pending POs', xlsxOptionalNumber(sum.pendingPurchaseOrderCount)],
      ['Pending PO Value', xlsxOptionalNumber(sum.pendingPurchaseOrderValue)],
      ['Active Suppliers', xlsxOptionalNumber(sum.activeSupplierCount)],
    ]),
    'Summary',
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['Month', 'Month Key', 'PO Spend', 'PO Count'],
      ...inv.expenditureSeries.map((p) => [
        p.label,
        p.monthKey,
        xlsxOptionalNumber(p.poSpend),
        xlsxOptionalNumber(p.poCount),
      ]),
    ]),
    'Expenditure Trend',
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['Category', 'Spend', 'Lines', 'Share %'],
      ...inv.materialCategorySpend.map((c) => [
        c.categoryName,
        xlsxOptionalNumber(c.spend),
        xlsxOptionalNumber(c.lineCount),
        xlsxOptionalNumber(c.sharePct),
      ]),
    ]),
    'Material Category Spend',
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['Supplier Type', 'Spend', 'POs', 'Share %'],
      ...inv.supplierTypeSpend.map((r) => [
        r.supplierType,
        xlsxOptionalNumber(r.spend),
        xlsxOptionalNumber(r.poCount),
        xlsxOptionalNumber(r.sharePct),
      ]),
    ]),
    'Supplier Type Spend',
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['Supplier', 'POs', 'Spend'],
      ...inv.suppliers.map((s) => [s.supplierName, xlsxOptionalNumber(s.poCount), xlsxOptionalNumber(s.spend)]),
    ]),
    'Suppliers By Spend',
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      [
        'SKU',
        'Material',
        'Category',
        'Unit',
        'Total Stock',
        'Reorder Point',
        'Monthly Consumption',
        'Days of Cover',
        'Total Value',
        'Supplier',
        'Low Stock',
      ],
      ...inv.materials.map((m) => [
        m.sku,
        m.name,
        m.categoryName,
        m.unit,
        xlsxOptionalNumber(m.totalStock),
        xlsxOptionalNumber(m.reorderPoint),
        xlsxOptionalNumber(m.monthlyConsumption),
        xlsxOptionalNumber(m.daysOfCover),
        xlsxOptionalNumber(m.totalValue),
        m.supplierName ?? '',
        m.isLowStock ? 'Yes' : 'No',
      ]),
    ]),
    'Materials',
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['PO Number', 'Supplier', 'Status', 'Order Date', 'Total Amount', 'Amount Paid', 'Payment Status', 'Items'],
      ...inv.purchaseOrders.map((po) => [
        po.poNumber,
        po.supplierName ?? '',
        po.status,
        fmtDate(po.orderDate),
        xlsxOptionalNumber(po.totalAmount),
        xlsxOptionalNumber(po.amountPaid),
        po.paymentStatus,
        xlsxOptionalNumber(po.itemCount),
      ]),
    ]),
    'Purchase Orders',
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['PR Number', 'Status', 'Request Date', 'Target Date', 'Items', 'Quantity', 'Created By'],
      ...inv.productionRequests.map((pr) => [
        pr.prNumber,
        pr.status,
        fmtDate(pr.requestDate),
        fmtDate(pr.expectedCompletionDate),
        xlsxOptionalNumber(pr.itemCount),
        xlsxOptionalNumber(pr.quantityTotal),
        pr.createdBy ?? '',
      ]),
    ]),
    'Production Requests',
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['Material', 'Unit', 'Total Qty', 'Total Cost', 'Events'],
      ...inv.consumption.options.map((o) => [
        o.materialName,
        o.unit,
        xlsxOptionalNumber(o.totalQty),
        xlsxOptionalNumber(o.totalCost),
        xlsxOptionalNumber(o.eventCount),
      ]),
    ]),
    'Material Consumption',
  );

  await finalizeWorkbook(XLSX, wb, 'reports-inventory', branchLabel);
}
