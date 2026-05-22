import { csvDateOnlyIso } from './datePeriodQuery';
import type { OutstandingOrderRow } from './financeData';

function xlsxOptionalNumber(v: number | null | undefined): number | '' {
  if (v == null || !Number.isFinite(v)) return '';
  return v;
}

export interface OutstandingOrderExportRow {
  order_number: string;
  order_date: string;
  customer_code: string;
  customer_name: string;
  agent_code: string;
  agent_name: string;
  branch: string;
  payment_terms: string;
  payment_method: string;
  order_status: string;
  total_amount: number | '';
  amount_paid: number | '';
  balance_due: number | '';
  due_date: string;
  days_overdue: number | '';
  payment_status: string;
}

function mapOutstandingOrderRow(row: OutstandingOrderRow): OutstandingOrderExportRow {
  return {
    order_number: row.orderNumber,
    order_date: csvDateOnlyIso(row.orderDate),
    customer_code: row.customerCode ?? '',
    customer_name: row.customerName ?? '',
    agent_code: row.agentCode ?? '',
    agent_name: row.agentName ?? '',
    branch: row.branchName ?? '',
    payment_terms: row.paymentTerms ?? '',
    payment_method: row.paymentMethod ?? '',
    order_status: row.status,
    total_amount: xlsxOptionalNumber(row.totalAmount),
    amount_paid: xlsxOptionalNumber(row.amountPaid),
    balance_due: xlsxOptionalNumber(row.balanceDue),
    due_date: csvDateOnlyIso(row.dueDate),
    days_overdue: xlsxOptionalNumber(row.daysOverdue),
    payment_status: row.paymentStatus,
  };
}

export async function downloadOutstandingOrdersWorkbook(params: {
  branchLabel: string;
  periodLabel: string;
  rows: OutstandingOrderRow[];
}) {
  const mapped = params.rows.map(mapOutstandingOrderRow);
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['Export Period', params.periodLabel],
      ['Branch', params.branchLabel],
      [],
      [
        'Order Number',
        'Order Date',
        'Customer Code',
        'Customer',
        'Agent Code',
        'Agent',
        'Branch',
        'Payment Terms',
        'Payment Method',
        'Order Status',
        'Total Amount',
        'Amount Paid',
        'Balance Due',
        'Due Date',
        'Days Overdue',
        'Payment Status',
      ],
      ...mapped.map(r => [
        r.order_number,
        r.order_date,
        r.customer_code,
        r.customer_name,
        r.agent_code,
        r.agent_name,
        r.branch,
        r.payment_terms,
        r.payment_method,
        r.order_status,
        r.total_amount,
        r.amount_paid,
        r.balance_due,
        r.due_date,
        r.days_overdue,
        r.payment_status,
      ]),
    ]),
    'Outstanding Orders',
  );

  const safeBranch = params.branchLabel.replace(/[^\w.-]+/g, '_').slice(0, 40);
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `outstanding-orders-${safeBranch || 'export'}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
