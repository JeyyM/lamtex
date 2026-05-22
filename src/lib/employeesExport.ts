import { csvDateOnlyIso } from './datePeriodQuery';
import type { EmployeePerfRow } from './employeesData';

function fmtDate(d: string | null | undefined): string {
  if (!d) return '';
  return csvDateOnlyIso(d);
}

function formatStatus(status: string): string {
  if (!status) return '';
  return status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ');
}

export interface EmployeeExportRow {
  employee_id: string;
  name: string;
  role: string;
  branch: string;
  status: string;
  join_date: string;
  tenure_months: number | '';
  email: string;
  phone: string;
}

function mapEmployeeRow(row: EmployeePerfRow): EmployeeExportRow {
  return {
    employee_id: row.employeeId,
    name: row.employeeName,
    role: row.role ?? '',
    branch: row.branchName ?? '',
    status: formatStatus(row.status),
    join_date: fmtDate(row.joinDate),
    tenure_months: Number.isFinite(row.tenure) ? row.tenure : '',
    email: row.email ?? '',
    phone: row.phone ?? '',
  };
}

export async function downloadEmployeesWorkbook(params: {
  branchLabel: string;
  rows: EmployeePerfRow[];
}) {
  const mapped = params.rows.map(mapEmployeeRow);
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['Branch', params.branchLabel],
      [],
      [
        'Employee ID',
        'Name',
        'Role',
        'Branch',
        'Status',
        'Join Date',
        'Tenure (months)',
        'Email',
        'Phone',
      ],
      ...mapped.map(r => [
        r.employee_id,
        r.name,
        r.role,
        r.branch,
        r.status,
        r.join_date,
        r.tenure_months,
        r.email,
        r.phone,
      ]),
    ]),
    'Employees',
  );

  const safeBranch = params.branchLabel.replace(/[^\w.-]+/g, '_').slice(0, 40);
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `employees-${safeBranch || 'export'}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
