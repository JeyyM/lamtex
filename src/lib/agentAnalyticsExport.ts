import { csvDateOnlyIso } from './datePeriodQuery';
import {
  fetchAgentQuotaMissHistory,
  type AgentAnalyticsBundle,
} from './agentAnalytics';

function xlsxOptionalNumber(v: number | string | null | undefined): number | '' {
  if (v == null || v === '') return '';
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : '';
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

export interface AgentAnalyticsSectionExportParams {
  bundle: AgentAnalyticsBundle;
  branchLabel: string;
  periodLabel: string;
}

/**
 * Overview section: KPI summary, full agent leaderboard, branch comparison.
 * Shared by the Agent Analytics page (Overview tab) and the Reports page (Agents tab).
 */
export async function downloadAgentOverviewWorkbook(params: AgentAnalyticsSectionExportParams) {
  const { bundle, branchLabel, periodLabel } = params;
  const s = bundle.summary;
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['Field', 'Value'],
      ['Export Period', periodLabel],
      ['Branch', branchLabel],
      ['Total Revenue', xlsxOptionalNumber(s.totalRevenue)],
      ['Revenue Δ% vs Prior', xlsxOptionalNumber(s.revenueDeltaPct)],
      ['Total Orders', xlsxOptionalNumber(s.totalOrders)],
      ['Total Agents', xlsxOptionalNumber(s.totalAgents)],
      ['Agents Above Quota', xlsxOptionalNumber(s.agentsAboveQuota)],
      ['Agents On Track', xlsxOptionalNumber(s.agentsOnTrack)],
      ['Agents Below Quota', xlsxOptionalNumber(s.agentsBelowQuota)],
      ['Avg Attainment %', xlsxOptionalNumber(s.attainmentAvgPct)],
      ['Commission Earned', xlsxOptionalNumber(s.commissionEarned)],
      ['Commission Paid', xlsxOptionalNumber(s.commissionPaid)],
      ['Commission Liability', xlsxOptionalNumber(s.commissionLiability)],
      ['Gross Profit', xlsxOptionalNumber(s.totalProfit)],
      ['Profit Δ% vs Prior', xlsxOptionalNumber(s.profitDeltaPct)],
      ['Profit Margin %', xlsxOptionalNumber(s.profitMarginPct)],
      ['Unassigned Customers', xlsxOptionalNumber(s.customersUnassigned)],
    ]),
    'Summary',
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      [
        'Agent Code',
        'Agent',
        'Branch',
        'Revenue',
        'Gross Sales',
        'Orders',
        'Avg Order Value',
        'Amount Paid',
        'Balance Due',
        'Avg Discount %',
        'Collection Rate %',
        'Distinct Customers',
        'New Customers',
        'Overdue Orders',
        'Overdue Balance',
        'Monthly Target',
        'Quarterly Target',
        'Effective Target',
        'Attainment %',
        'Pacing %',
        'Expected Revenue To Date',
        'Revenue Gap',
        'Commission Earned',
        'Commission Paid',
        'Commission Accrued',
        'Prev Revenue',
        'Revenue Δ%',
        'Profit',
      ],
      ...bundle.agents.map((a) => [
        a.employeePublicId,
        a.agentName,
        a.branchName ?? '',
        xlsxOptionalNumber(a.revenue),
        xlsxOptionalNumber(a.grossSales),
        xlsxOptionalNumber(a.orderCount),
        xlsxOptionalNumber(a.averageOrderValue),
        xlsxOptionalNumber(a.amountPaid),
        xlsxOptionalNumber(a.balanceDue),
        xlsxOptionalNumber(a.avgDiscountPercent),
        xlsxOptionalNumber(a.collectionRate),
        xlsxOptionalNumber(a.distinctCustomers),
        xlsxOptionalNumber(a.newCustomers),
        xlsxOptionalNumber(a.overdueOrders),
        xlsxOptionalNumber(a.overdueBalance),
        xlsxOptionalNumber(a.monthlyTarget),
        xlsxOptionalNumber(a.quarterlyTarget),
        xlsxOptionalNumber(a.effectiveTarget),
        xlsxOptionalNumber(a.attainmentPct),
        xlsxOptionalNumber(a.pacingPct),
        xlsxOptionalNumber(a.expectedRevenueToDate),
        xlsxOptionalNumber(a.revenueGap),
        xlsxOptionalNumber(a.commissionEarned),
        xlsxOptionalNumber(a.commissionPaid),
        xlsxOptionalNumber(a.commissionAccrued),
        xlsxOptionalNumber(a.prevRevenue),
        xlsxOptionalNumber(a.revenueDeltaPct),
        xlsxOptionalNumber(a.profit),
      ]),
    ]),
    'Agent Performance',
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      [
        'Branch',
        'Branch Code',
        'Agents',
        'Revenue',
        'Orders',
        'Avg Order Value',
        'Attainment %',
        'Total Target',
        'Collection Rate %',
        'Outstanding',
        'Total Profit',
        'Gross Sales',
        'Avg Margin %',
        'Rank',
        'Prev Revenue',
        'Revenue Δ%',
      ],
      ...bundle.branches.map((b) => [
        b.branchName,
        b.branchCode,
        xlsxOptionalNumber(b.agentCount),
        xlsxOptionalNumber(b.revenue),
        xlsxOptionalNumber(b.orderCount),
        xlsxOptionalNumber(b.averageOrderValue),
        xlsxOptionalNumber(b.attainmentPct),
        xlsxOptionalNumber(b.totalTarget),
        xlsxOptionalNumber(b.collectionRate),
        xlsxOptionalNumber(b.outstanding),
        xlsxOptionalNumber(b.totalProfit),
        xlsxOptionalNumber(b.grossSales),
        xlsxOptionalNumber(b.avgMarginPct),
        xlsxOptionalNumber(b.rank),
        xlsxOptionalNumber(b.prevRevenue),
        xlsxOptionalNumber(b.revenueDeltaPct),
      ]),
    ]),
    'Branch Comparison',
  );

  await finalizeWorkbook(XLSX, wb, 'agent-analytics-overview', branchLabel);
}

export interface AgentTrendsExportParams extends AgentAnalyticsSectionExportParams {
  /** Branch UUID for the quota-miss-history lookback fetch (null = all branches). */
  branchId: string | null;
}

/**
 * Trends section: monthly revenue trend, per-branch revenue lines, quota miss history,
 * unassigned customers, alerts. Quota miss history is fetched here (separate from the bundle).
 */
export async function downloadAgentTrendsWorkbook(params: AgentTrendsExportParams) {
  const { bundle, branchLabel, periodLabel, branchId } = params;

  const missHistory = await fetchAgentQuotaMissHistory({ branchId }).catch(() => []);

  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['Export Period', periodLabel],
      ['Branch', branchLabel],
      [],
      ['Month', 'Period Key', 'Revenue', 'Monthly Quota', 'Avg Agent Revenue'],
      ...bundle.monthlyTrend.map((m) => [
        m.monthLabel,
        m.periodKey,
        xlsxOptionalNumber(m.revenue),
        xlsxOptionalNumber(m.quotaMonthly),
        xlsxOptionalNumber(m.avgAgentRevenue),
      ]),
    ]),
    'Monthly Trend',
  );

  if (bundle.branchRevenueTrendLines && bundle.branchRevenueTrendLines.length > 0) {
    const rows: (string | number)[][] = [['Branch', 'Month', 'Period Key', 'Revenue']];
    for (const line of bundle.branchRevenueTrendLines) {
      line.monthlyRevenue.forEach((rev, i) => {
        const month = bundle.monthlyTrend[i];
        rows.push([
          line.branchName,
          month?.monthLabel ?? '',
          month?.periodKey ?? '',
          xlsxOptionalNumber(rev) === '' ? 0 : (xlsxOptionalNumber(rev) as number),
        ]);
      });
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Branch Revenue Trend');
  }

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['Agent Code', 'Agent', 'Branch', 'Period Key', 'Month', 'Quota', 'Collected', 'Attainment %', 'Gap'],
      ...missHistory.flatMap((agent) =>
        agent.misses.map((m) => [
          agent.employeePublicId,
          agent.agentName,
          agent.branchName ?? '',
          m.periodKey,
          m.displayLabel,
          xlsxOptionalNumber(m.quota),
          xlsxOptionalNumber(m.revenue),
          xlsxOptionalNumber(m.attainmentPct),
          xlsxOptionalNumber(m.quota - m.revenue),
        ]),
      ),
    ]),
    'Quota Misses',
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['Customer', 'City', 'Branch', 'Type'],
      ...bundle.unassignedCustomers.map((c) => [
        c.name,
        c.city ?? '',
        c.branchName ?? '',
        c.type ?? '',
      ]),
    ]),
    'Unassigned Customers',
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['Type', 'Severity', 'Title', 'Message', 'Action Required', 'Created'],
      ...bundle.alerts.map((al) => [
        al.type,
        al.severity,
        al.title,
        al.message,
        al.actionRequired ? 'Yes' : 'No',
        csvDateOnlyIso(al.createdAt),
      ]),
    ]),
    'Alerts',
  );

  await finalizeWorkbook(XLSX, wb, 'agent-analytics-trends', branchLabel);
}
