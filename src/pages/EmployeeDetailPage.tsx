import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Activity as ActivityLineIcon,
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpDown,
  Briefcase,
  Building2,
  Calendar,
  CalendarRange,
  ClipboardList,
  DollarSign,
  Eye,
  EyeOff,
  Folder,
  Clock,
  Download,
  GraduationCap,
  Loader2,
  Mail,
  MapPin,
  Package,
  Phone,
  Plus,
  Shield,
  Star,
  TrendingUp,
  Award,
  Camera,
  Truck,
  User,
  UserCheck,
  UserCircle,
  Users,
  Upload,
  Edit2,
  X,
  Search,
  ShoppingCart,
} from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { PortalModalOverlay } from '@/src/components/ui/PortalModalOverlay';
import { Badge } from '@/src/components/ui/Badge';
import { cn } from '@/src/lib/utils';
import { ACTIVITY_LOG_PAGE_SIZE, TABLE_PAGE_SIZE, TablePagination } from '@/src/components/ui/TablePagination';
import type { EmployeeRole } from '@/src/types/employee';
import { useAppContext } from '@/src/store/AppContext';
import { supabase } from '@/src/lib/supabase';
import {
  DATE_PERIOD_OPTIONS,
  inDatePeriodRange,
  pad2Local,
  periodTriggerLabel,
  resolveDatePeriodQuery,
  todayIsoLocal,
  type DatePeriodKind,
} from '@/src/lib/datePeriodQuery';
import ImageGalleryModal from '@/src/components/ImageGalleryModal';
import {
  fetchEmployeeFullProfile,
  fetchEmployeeWithPerformanceByIdentifier,
  fetchAgentOrders,
  fetchWarehouseManagerRequests,
  type EmployeeActivityFeedItem,
  type EmployeeAgentOrderRow,
  type EmployeeProductionRequestRow,
  type EmployeePurchaseOrderRow,
  type EmployeeFullProfile,
  type EmployeePerfRow,
  type LogisticsManagerPerf,
  type SalesAgentPerf,
  type TruckDriverPerf,
  type WarehouseManagerPerf,
} from '@/src/lib/employeesData';
import {
  fetchWarehouseAssignmentCatalog,
  fetchWarehouseAssignmentIds,
  saveWarehouseAssignments,
  type WarehouseCatalogMaterial,
  type WarehouseCatalogProduct,
} from '@/src/lib/warehouseAssignments';
import {
  upsertEmployeePersonalInfo,
  upsertEmployeeContactInfo,
  upsertPrimaryEmployeeAddress,
  upsertEmployeeEmploymentInfo,
  updateEmployeeDirectoryCore,
  upsertEmployeeGovernmentIds,
  upsertEmployeeCompensation,
  upsertEmployeeBankDetails,
  updateEmployeeSkillRow,
  updateEmployeeCertificationRow,
  updateEmployeeTrainingRow,
} from '@/src/lib/employeeProfileMutations';
import { fetchBranchTripHistory, fetchDriverTripHistory, type BranchTripHistoryRecord } from '@/src/lib/fleetTrucks';
import { fetchTripById } from '@/src/lib/logisticsScheduling';
import { dispatchTableStatusBadgeVariant, tripHistoryMatchesSearch, tripStatusDisplay } from '@/src/lib/dispatchQueueUi';
import { OrderTripIdCell } from '@/src/components/orders/OrderTripIdCell';
import { TripDetailsModal } from '@/src/components/logistics/TripDetailsModal';
import type { Trip } from '@/src/types/logistics';
import { OrderPermissionSection } from '@/src/components/employees/OrderPermissionToggles';
import { EmployeesPermissionSection } from '@/src/components/employees/EmployeesPermissionToggles';
import { AgentAnalyticsPermissionSection } from '@/src/components/employees/AgentAnalyticsPermissionToggles';
import { ReportsPermissionSection } from '@/src/components/employees/ReportsPermissionToggles';
import { SettingsPermissionSection } from '@/src/components/employees/SettingsPermissionToggles';
import { ProductPermissionSection } from '@/src/components/employees/ProductPermissionToggles';
import { MaterialPermissionSection } from '@/src/components/employees/MaterialPermissionToggles';
import { WarehousePermissionSection } from '@/src/components/employees/WarehousePermissionToggles';
import { LogisticsPermissionSection } from '@/src/components/employees/LogisticsPermissionToggles';
import { SupplierPermissionSection } from '@/src/components/employees/SupplierPermissionToggles';
import { CustomerPermissionSection } from '@/src/components/employees/CustomerPermissionToggles';
import { FinancePermissionSection } from '@/src/components/employees/FinancePermissionToggles';
import { ProductionRequestPermissionSection } from '@/src/components/employees/ProductionRequestPermissionToggles';
import { PurchaseOrderPermissionSection } from '@/src/components/employees/PurchaseOrderPermissionToggles';
import { InterBranchRequestPermissionSection } from '@/src/components/employees/InterBranchRequestPermissionToggles';
import {
  fetchEmployeeOrderPermissions,
  orderPermissionSetsEqual,
  saveEmployeeOrderPermissions,
} from '@/src/lib/permissions/employeeOrderPermissions';
import {
  fetchEmployeeProductPermissions,
  productPermissionSetsEqual,
  saveEmployeeProductPermissions,
} from '@/src/lib/permissions/employeeProductPermissions';
import {
  fetchEmployeeMaterialPermissions,
  materialPermissionSetsEqual,
  saveEmployeeMaterialPermissions,
} from '@/src/lib/permissions/employeeMaterialPermissions';
import {
  fetchEmployeeWarehousePermissions,
  warehousePermissionSetsEqual,
  saveEmployeeWarehousePermissions,
} from '@/src/lib/permissions/employeeWarehousePermissions';
import {
  fetchEmployeeLogisticsPermissions,
  logisticsPermissionSetsEqual,
  saveEmployeeLogisticsPermissions,
} from '@/src/lib/permissions/employeeLogisticsPermissions';
import {
  fetchEmployeeSupplierPermissions,
  supplierPermissionSetsEqual,
  saveEmployeeSupplierPermissions,
} from '@/src/lib/permissions/employeeSupplierPermissions';
import {
  fetchEmployeeCustomerPermissions,
  customerPermissionSetsEqual,
  saveEmployeeCustomerPermissions,
} from '@/src/lib/permissions/employeeCustomerPermissions';
import {
  fetchEmployeeFinancePermissions,
  financePermissionSetsEqual,
  saveEmployeeFinancePermissions,
} from '@/src/lib/permissions/employeeFinancePermissions';
import {
  fetchEmployeeEmployeesPermissions,
  employeesPermissionSetsEqual,
  saveEmployeeEmployeesPermissions,
} from '@/src/lib/permissions/employeeEmployeesPermissions';
import {
  fetchEmployeeAgentAnalyticsPermissions,
  agentAnalyticsPermissionSetsEqual,
  saveEmployeeAgentAnalyticsPermissions,
} from '@/src/lib/permissions/employeeAgentAnalyticsPermissions';
import {
  fetchEmployeeReportsPermissions,
  reportsPermissionSetsEqual,
  saveEmployeeReportsPermissions,
} from '@/src/lib/permissions/employeeReportsPermissions';
import {
  fetchEmployeeSettingsPermissions,
  settingsPermissionSetsEqual,
  saveEmployeeSettingsPermissions,
} from '@/src/lib/permissions/employeeSettingsPermissions';
import {
  fetchEmployeeProductionRequestPermissions,
  productionRequestPermissionSetsEqual,
  saveEmployeeProductionRequestPermissions,
} from '@/src/lib/permissions/employeeProductionRequestPermissions';
import {
  fetchEmployeePurchaseOrderPermissions,
  purchaseOrderPermissionSetsEqual,
  saveEmployeePurchaseOrderPermissions,
} from '@/src/lib/permissions/employeePurchaseOrderPermissions';
import {
  fetchEmployeeInterBranchRequestPermissions,
  interBranchRequestPermissionSetsEqual,
  saveEmployeeInterBranchRequestPermissions,
} from '@/src/lib/permissions/employeeInterBranchRequestPermissions';
import { applyDefaultPermissionsForRoles } from '@/src/lib/permissions/applyRoleDefaultPermissions';
import { resolveEmployeeDashboardRoles, saveEmployeeUserRoles } from '@/src/lib/permissions/employeeUserRoles';
import { rolesHaveDefaultTemplates } from '@/src/lib/permissions/roleDefaultPermissions';
import {
  DashboardRoleMultiSelect,
  type DashboardRoleAssignment,
} from '@/src/components/employees/DashboardRoleMultiSelect';
import {
  employeeHasAgentDetailTabs,
  employeeHasTripHistoryDetailTabs,
  employeeHasWarehouseDetailTabs,
  employeeUsesDriverTripHistoryView,
  filterEmployeeDetailTabs,
  isEmployeeDetailTabVisible,
} from '@/src/lib/employeeDetailTabs';
import type { UserRole } from '@/src/types';
import {
  ALL_ORDER_PERMISSIONS_GRANTED,
  type OrderPermissionSet,
} from '@/src/lib/permissions/orderPermissions';
import {
  ALL_PRODUCT_PERMISSIONS_GRANTED,
  type ProductPermissionSet,
} from '@/src/lib/permissions/productPermissions';
import {
  ALL_MATERIAL_PERMISSIONS_GRANTED,
  type MaterialPermissionSet,
} from '@/src/lib/permissions/materialPermissions';
import {
  ALL_WAREHOUSE_PERMISSIONS_GRANTED,
  type WarehousePermissionSet,
} from '@/src/lib/permissions/warehousePermissions';
import {
  ALL_LOGISTICS_PERMISSIONS_GRANTED,
  type LogisticsPermissionSet,
} from '@/src/lib/permissions/logisticsPermissions';
import {
  ALL_SUPPLIER_PERMISSIONS_GRANTED,
  type SupplierPermissionSet,
} from '@/src/lib/permissions/supplierPermissions';
import {
  ALL_CUSTOMER_PERMISSIONS_DENIED,
  type CustomerPermissionSet,
} from '@/src/lib/permissions/customerPermissions';
import {
  ALL_FINANCE_PERMISSIONS_GRANTED,
  type FinancePermissionSet,
} from '@/src/lib/permissions/financePermissions';
import {
  ALL_EMPLOYEES_PERMISSIONS_GRANTED,
  type EmployeesPermissionSet,
} from '@/src/lib/permissions/employeesPermissions';
import {
  ALL_AGENT_ANALYTICS_PERMISSIONS_GRANTED,
  type AgentAnalyticsPermissionSet,
} from '@/src/lib/permissions/agentAnalyticsPermissions';
import {
  ALL_REPORTS_PERMISSIONS_GRANTED,
  type ReportsPermissionSet,
} from '@/src/lib/permissions/reportsPermissions';
import {
  ALL_SETTINGS_PERMISSIONS_GRANTED,
  type SettingsPermissionSet,
} from '@/src/lib/permissions/settingsPermissions';
import { useEmployeesPermissions } from '@/src/lib/permissions/employeesPermissions';
import { ModuleAccessDenied } from '@/src/components/permissions/ModuleAccessDenied';
import { EntityNotFound, NOT_FOUND_COPY } from '@/src/components/ui/NotFound';
import {
  ALL_PRODUCTION_REQUEST_PERMISSIONS_GRANTED,
  type ProductionRequestPermissionSet,
} from '@/src/lib/permissions/productionRequestPermissions';
import {
  ALL_PURCHASE_ORDER_PERMISSIONS_GRANTED,
  type PurchaseOrderPermissionSet,
} from '@/src/lib/permissions/purchaseOrderPermissions';
import {
  ALL_INTER_BRANCH_REQUEST_PERMISSIONS_GRANTED,
  type InterBranchRequestPermissionSet,
} from '@/src/lib/permissions/interBranchRequestPermissions';

function isSalesAgent(emp: EmployeePerfRow): emp is SalesAgentPerf {
  return emp.role === 'Sales Agent';
}
function isLogisticsManager(emp: EmployeePerfRow): emp is LogisticsManagerPerf {
  return emp.role === 'Logistics Manager';
}
function isWarehouseManager(emp: EmployeePerfRow): emp is WarehouseManagerPerf {
  return emp.role === 'Warehouse Manager';
}
function isTruckDriver(emp: EmployeePerfRow): emp is TruckDriverPerf {
  return emp.role === 'Truck Driver';
}

function formatPeso(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `₱${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function formatPesoCompact(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const n = Math.abs(value);
  if (n >= 1_000_000) return `₱${(value / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000) return `₱${Math.round(value / 1000)}K`;
  return `₱${value.toLocaleString()}`;
}

function formatPesoOptionalHidden(value: number | null | undefined, revealed: boolean): string {
  if (value == null || !Number.isFinite(value)) return '—';
  if (!revealed) return '₱ ••••••';
  return formatPeso(value);
}

function maskSensitiveText(value: string | null, revealed: boolean): string {
  if (value == null || value === '') return '—';
  if (revealed) return value;
  if (value.length <= 3) return '•••';
  return `${value.slice(0, 2)}${'•'.repeat(Math.min(10, value.length - 3))}${value.slice(-1)}`;
}

/** Format Postgres TIME / `HH:MM:SS` strings for display, e.g. `08:00 AM`. */
function formatTimeAmPm(value: string | null | undefined): string | null {
  if (value == null || String(value).trim() === '') return null;
  const s = String(value).trim();
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?/.exec(s);
  if (!m) return s;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return s;
  const d = new Date();
  d.setHours(h, min, 0, 0);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function maskAccountNumber(value: string | null, revealed: boolean): string {
  if (value == null || value === '') return '—';
  if (revealed) return value;
  const tail = value.slice(-4);
  if (value.length <= 4) return '••••';
  return `••••••${tail}`;
}

/** Age in full years from a YYYY-MM-DD date (local calendar). */
function ageFromDateOfBirth(isoDate: string | null | undefined): number | null {
  if (isoDate == null || isoDate === '') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const day = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(day)) return null;
  const birth = new Date(y, mo, day);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const md = today.getMonth() - birth.getMonth();
  if (md < 0 || (md === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age;
}

/** Completed full years since hire (local calendar), for display next to date hired. */
function completedYearsFromJoinDate(isoDate: string | null | undefined): number | null {
  if (isoDate == null || isoDate === '') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const day = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(day)) return null;
  const hired = new Date(y, mo, day);
  const today = new Date();
  let years = today.getFullYear() - hired.getFullYear();
  const md = today.getMonth() - hired.getMonth();
  if (md < 0 || (md === 0 && today.getDate() < hired.getDate())) years -= 1;
  return Math.max(0, years);
}

function overviewField(label: string, value: string | null | undefined) {
  const display = value != null && String(value).trim() !== '' ? value : '—';
  return (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-0.5 text-base font-semibold text-gray-900">{display}</p>
    </div>
  );
}

function dashboardRolesOverviewField(roles: UserRole[], primaryRole: UserRole | null) {
  return (
    <div>
      <p className="text-sm text-gray-500">App dashboard roles</p>
      {roles.length === 0 ? (
        <p className="mt-0.5 text-base font-semibold text-gray-900">—</p>
      ) : (
        <div className="mt-1.5 flex flex-wrap gap-2">
          {roles.map((role) => {
            const isPrimary = primaryRole === role;
            return (
              <span
                key={role}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium',
                  isPrimary
                    ? 'border-amber-300 bg-amber-50 text-amber-900'
                    : 'border-gray-200 bg-gray-50 text-gray-800',
                )}
              >
                <Star className={cn('w-3.5 h-3.5', isPrimary ? 'fill-current text-amber-600' : 'text-gray-300')} />
                {role}
                {isPrimary ? (
                  <span className="text-[10px] uppercase tracking-wide text-amber-700 font-semibold">Main</span>
                ) : null}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function contactInfoCell(
  label: string,
  value: string | null | undefined,
  icon: React.ReactNode,
) {
  const display = value != null && String(value).trim() !== '' ? value : '—';
  return (
    <div>
      <p className="text-sm text-gray-500 mb-2">{label}</p>
      <div className="flex items-start gap-2 min-w-0">
        <span className="text-gray-400 flex-shrink-0 mt-0.5">{icon}</span>
        <p className="font-semibold text-gray-900 text-base break-all leading-snug">{display}</p>
      </div>
    </div>
  );
}

function formatProfileDate(d: string | null | undefined): string | null {
  if (d == null || String(d).trim() === '') return null;
  const s = String(d).slice(0, 10);
  try {
    return new Date(`${s}T12:00:00`).toLocaleDateString('en-PH', { dateStyle: 'medium' });
  } catch {
    return String(d);
  }
}

function formatActivityLogTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatOrderDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function orderPaymentStatusVariant(status: string): 'success' | 'warning' | 'info' | 'danger' | 'neutral' {
  switch (status) {
    case 'Paid':
      return 'success';
    case 'Partially Paid':
      return 'warning';
    case 'On Credit':
    case 'Invoiced':
      return 'info';
    case 'Overdue':
      return 'danger';
    default:
      return 'neutral';
  }
}

function productionRequestStatusVariant(status: string): 'success' | 'warning' | 'info' | 'danger' | 'neutral' | 'default' {
  if (status === 'Completed') return 'success';
  if (status === 'Cancelled' || status === 'Rejected') return 'danger';
  if (status === 'Requested') return 'warning';
  if (status === 'In Progress') return 'info';
  if (status === 'Accepted') return 'default';
  return 'neutral';
}

function purchaseOrderStatusVariant(status: string): 'success' | 'warning' | 'info' | 'danger' | 'neutral' | 'default' {
  if (status === 'Completed') return 'success';
  if (status === 'Received') return 'default';
  if (status === 'Partially Received') return 'warning';
  if (status === 'Cancelled' || status === 'Rejected') return 'danger';
  if (status === 'Requested') return 'warning';
  return 'neutral';
}

function activityFeedVariantIconClass(variant: EmployeeActivityFeedItem['variant']): string {
  switch (variant) {
    case 'success':
      return 'bg-green-100 text-green-600';
    case 'info':
      return 'bg-blue-100 text-blue-600';
    case 'accent':
      return 'bg-purple-100 text-purple-600';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

function SkillLevelBadge({ level }: { level: string }) {
  const l = level.trim().toLowerCase();
  if (l === 'expert')
    return <Badge className="bg-purple-100 text-purple-800 border-0">{level}</Badge>;
  if (l === 'advanced') return <Badge variant="info">{level}</Badge>;
  if (l === 'intermediate') return <Badge variant="success">{level}</Badge>;
  if (l === 'beginner') return <Badge variant="neutral">{level}</Badge>;
  return <Badge variant="neutral">{level || '—'}</Badge>;
}

function getRoleIcon(role: EmployeeRole | null) {
  switch (role) {
    case 'Sales Agent':
      return UserCheck;
    case 'Logistics Manager':
    case 'Truck Driver':
      return Truck;
    case 'Warehouse Manager':
      return Package;
    default:
      return Users;
  }
}

function getRoleColorClass(role: EmployeeRole | null) {
  switch (role) {
    case 'Sales Agent':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Logistics Manager':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'Warehouse Manager':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'Truck Driver':
      return 'bg-amber-100 text-amber-900 border-amber-200';
    default:
      return 'bg-slate-100 text-slate-800 border-slate-200';
  }
}

function statusBadgeVariant(
  status: string,
): 'success' | 'warning' | 'neutral' | 'default' | 'danger' {
  if (status === 'active') return 'success';
  if (status === 'on-leave') return 'warning';
  if (status === 'inactive') return 'neutral';
  return 'default';
}

function performanceSection(emp: EmployeePerfRow) {
  const cells: { label: string; value: React.ReactNode }[] = [];

  if (isSalesAgent(emp)) {
    cells.push(
      { label: 'Active customers', value: emp.activeCustomers.toLocaleString() },
      { label: 'Revenue (eligible orders)', value: formatPesoCompact(emp.totalRevenue) },
      { label: 'Commission (est. / recorded)', value: formatPesoCompact(emp.commission) },
      { label: 'Territory', value: emp.territoryCoverage ?? '—' },
    );
  } else if (isLogisticsManager(emp)) {
    cells.push(
      {
        label: 'On-time rate (scheduling)',
        value: emp.onTimeSchedulingRate == null ? '—' : `${emp.onTimeSchedulingRate}%`,
      },
      {
        label: 'Fleet utilization (branch avg.)',
        value: emp.fleetUtilizationPercent == null ? '—' : `${emp.fleetUtilizationPercent}%`,
      },
      { label: 'Trips (90 days)', value: emp.tripsLast90Days.toLocaleString() },
    );
  } else if (isWarehouseManager(emp)) {
    cells.push(
      {
        label: 'PO + PR created (90 days, branch)',
        value: emp.poPrCountLast90Days.toLocaleString(),
      },
      {
        label: 'Stock Gaps (branch)',
        value: emp.stockGapsCount.toLocaleString(),
      },
      {
        label: 'PO/PR on-time completion (90d, branch)',
        value: emp.poPrOnTimeCompletionRate == null ? '—' : `${emp.poPrOnTimeCompletionRate}%`,
      },
    );
  } else if (isTruckDriver(emp)) {
    cells.push({ label: 'Completed trips', value: emp.completedTrips.toLocaleString() });
  } else {
    return (
      <p className="text-sm text-gray-500">
        No role-specific performance metrics for this record.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cells.map(({ label, value }) => (
        <div key={label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{value}</p>
        </div>
      ))}
    </div>
  );
}

type DetailTab =
  | 'overview'
  | 'contact'
  | 'employment'
  | 'compensation'
  | 'customers'
  | 'orders'
  | 'trips'
  | 'requests'
  | 'catalog'
  | 'access'
  | 'skills'
  | 'documents'
  | 'assets'
  | 'activity';

const ACTIVITY_PAGE_SIZE = ACTIVITY_LOG_PAGE_SIZE;
const AGENT_ORDERS_PAGE_SIZE = TABLE_PAGE_SIZE;
const TRIP_HISTORY_PAGE_SIZE = TABLE_PAGE_SIZE;
const WAREHOUSE_PR_PAGE_SIZE = TABLE_PAGE_SIZE;
const WAREHOUSE_PO_PAGE_SIZE = TABLE_PAGE_SIZE;

type AgentOrdersSortKey =
  | 'orderNumber'
  | 'trip'
  | 'customer'
  | 'orderDate'
  | 'requiredDate'
  | 'total'
  | 'paid'
  | 'balance'
  | 'status'
  | 'payment';

type TripHistorySortKey =
  | 'tripNumber'
  | 'date'
  | 'vehicle'
  | 'driver'
  | 'orders'
  | 'status';

type WarehousePrSortKey =
  | 'prNumber'
  | 'requestDate'
  | 'expectedDate'
  | 'branch'
  | 'items'
  | 'status';

type WarehousePoSortKey =
  | 'poNumber'
  | 'orderDate'
  | 'expectedDate'
  | 'supplier'
  | 'total'
  | 'status';

const DETAIL_TABS: { id: DetailTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: Users },
  { id: 'contact', label: 'Contact Info', icon: Phone },
  { id: 'employment', label: 'Employment', icon: Briefcase },
  { id: 'compensation', label: 'Compensation', icon: DollarSign },
  { id: 'customers', label: 'Customers', icon: UserCircle },
  { id: 'orders', label: 'Orders', icon: ShoppingCart },
  { id: 'trips', label: 'Trip History', icon: Truck },
  { id: 'requests', label: 'PO & PR', icon: ClipboardList },
  { id: 'catalog', label: 'Catalog access', icon: Package },
  { id: 'skills', label: 'Skills & Training', icon: GraduationCap },
  { id: 'documents', label: 'Documents', icon: Folder },
  { id: 'assets', label: 'Assets', icon: Package },
  { id: 'activity', label: 'Activity', icon: ActivityLineIcon },
  { id: 'access', label: 'Access', icon: Shield },
];

const EMPLOYEE_DOCS_STORAGE_ROOT = 'employee-documents';
const EMPLOYEE_AVATARS_STORAGE_ROOT = 'employee-avatars';
const EMPLOYEE_DOC_PDF_MAX_BYTES = 25 * 1024 * 1024;

const EDIT_INPUT_CLASS =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none';

const GENDER_OPTIONS = ['Male', 'Female', 'Other'] as const;
const CIVIL_STATUS_OPTIONS = ['Single', 'Married', 'Widowed', 'Separated'] as const;
const EMPLOYMENT_STATUS_OPTIONS = ['Full-time', 'Part-time', 'Contract', 'Probationary'] as const;
const SKILL_LEVEL_OPTIONS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'] as const;
const BANK_TYPE_OPTIONS = ['Savings', 'Current'] as const;
const PAY_FREQ_OPTIONS = ['Weekly', 'Bi-weekly', 'Monthly'] as const;
const COMMISSION_TIER_OPTIONS = ['Bronze', 'Silver', 'Gold', 'Platinum'] as const;

const EMPLOYEE_DOCUMENT_TYPES = [
  'Resume',
  'ID',
  'Certificate',
  'Contract',
  'Performance Review',
  'Other',
] as const;

function sanitizeEmployeeDocFileName(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]+/g, '_').trim();
  return base.slice(0, 180) || 'document';
}

function formatEmployeeDocFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function displayNameFromPublicUrl(url: string): string {
  const raw = url.split('/').pop()?.split('?')[0] ?? 'document';
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** User-facing title: optional custom title; if multiple files, append original name in parentheses. */
function resolveDocumentEntryName(entryTitle: string, fallbackName: string, totalStagedCount: number): string {
  const t = entryTitle.trim();
  if (!t) return fallbackName;
  if (totalStagedCount <= 1) return t;
  return `${t} (${fallbackName})`;
}

function emptyProfileState(): EmployeeFullProfile {
  return {
    personal: null,
    contact: null,
    addresses: [],
    employment: null,
    compensation: null,
    bank: null,
    government: null,
    skills: [],
    certifications: [],
    trainings: [],
    documents: [],
    assets: [],
    activityFeed: [],
    notes: [],
    customerPortfolio: [],
    loginAccount: { linked: false, authUserId: null, userRole: null },
  };
}

export default function EmployeeDetailPage() {
  const { employeeId: routeParam } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const { employeeName, session, addAuditLog, employeeId: sessionEmployeeId, refreshWarehouseScope, refreshOrderPermissions, refreshProductPermissions, refreshMaterialPermissions, refreshWarehousePermissions, refreshProductionRequestPermissions, refreshPurchaseOrderPermissions, refreshInterBranchRequestPermissions, refreshLogisticsPermissions, refreshSupplierPermissions, refreshCustomerPermissions, refreshFinancePermissions, refreshEmployeesPermissions, refreshAgentAnalyticsPermissions, refreshReportsPermissions, refreshSettingsPermissions } = useAppContext();
  const employeesModulePerms = useEmployeesPermissions();
  const [employee, setEmployee] = useState<EmployeePerfRow | null | undefined>(undefined);
  const [employeeDashboardRoles, setEmployeeDashboardRoles] = useState<UserRole[]>([]);
  const [employeePrimaryDashboardRole, setEmployeePrimaryDashboardRole] = useState<UserRole | null>(null);
  const [profile, setProfile] = useState<EmployeeFullProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<DetailTab>('overview');
  const [showEmploymentGov, setShowEmploymentGov] = useState(false);
  /** When true, peso figures in Compensation are masked (toggle "Hide Amounts"). */
  const [hideCompAmounts, setHideCompAmounts] = useState(false);

  const [showDocGallery, setShowDocGallery] = useState(false);
  const [showPfpGallery, setShowPfpGallery] = useState(false);
  const [pfpSaving, setPfpSaving] = useState(false);
  const [pendingGalleryDocUrls, setPendingGalleryDocUrls] = useState<string[]>([]);
  const [pendingDocFiles, setPendingDocFiles] = useState<File[]>([]);
  const [docUploadType, setDocUploadType] = useState<string>('Other');
  const [docEntryTitle, setDocEntryTitle] = useState('');
  const [docSaving, setDocSaving] = useState(false);
  const employeeDocPdfInputRef = useRef<HTMLInputElement>(null);

  const [newAssetTitle, setNewAssetTitle] = useState('');
  const [newAssetDescription, setNewAssetDescription] = useState('');
  const [newAssetCategory, setNewAssetCategory] = useState('');
  const [newAssetDate, setNewAssetDate] = useState('');
  const [assetAddOpen, setAssetAddOpen] = useState(false);
  const [assetSaving, setAssetSaving] = useState(false);

  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [editOverview, setEditOverview] = useState(false);
  const [editContact, setEditContact] = useState(false);
  const [editEmployment, setEditEmployment] = useState(false);
  const [editCompensation, setEditCompensation] = useState(false);

  const [ovDob, setOvDob] = useState('');
  const [ovGender, setOvGender] = useState('');
  const [ovNationality, setOvNationality] = useState('');
  const [ovCivil, setOvCivil] = useState('');
  const [ovReligion, setOvReligion] = useState('');
  const [ovBlood, setOvBlood] = useState('');
  const [ovRoleAssignment, setOvRoleAssignment] = useState<DashboardRoleAssignment>({
    roles: [],
    primaryRole: null,
  });

  const [ctPrimary, setCtPrimary] = useState('');
  const [ctSecondary, setCtSecondary] = useState('');
  const [ctPersonalEmail, setCtPersonalEmail] = useState('');
  const [ctWorkEmail, setCtWorkEmail] = useState('');
  const [ctEmerName, setCtEmerName] = useState('');
  const [ctEmerPhone, setCtEmerPhone] = useState('');
  const [ctEmerRel, setCtEmerRel] = useState('');

  const [addrId, setAddrId] = useState<string | null>(null);
  const [addrLabel, setAddrLabel] = useState('');
  const [addrStreet, setAddrStreet] = useState('');
  const [addrBarangay, setAddrBarangay] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [addrProvince, setAddrProvince] = useState('');
  const [addrPostal, setAddrPostal] = useState('');
  const [addrCurrent, setAddrCurrent] = useState(true);

  const [emEmpCode, setEmEmpCode] = useState('');
  const [emJoinDate, setEmJoinDate] = useState('');
  const [emStatus, setEmStatus] = useState('');
  const [emPosition, setEmPosition] = useState('');
  const [emDepartment, setEmDepartment] = useState('');
  const [emReporting, setEmReporting] = useState('');
  const [emBranchMgr, setEmBranchMgr] = useState('');
  const [emDays, setEmDays] = useState('');
  const [emStart, setEmStart] = useState('');
  const [emEnd, setEmEnd] = useState('');
  const [emShift, setEmShift] = useState('');

  const [gvTin, setGvTin] = useState('');
  const [gvSss, setGvSss] = useState('');
  const [gvPhil, setGvPhil] = useState('');
  const [gvPag, setGvPag] = useState('');
  const [gvIdType, setGvIdType] = useState('');
  const [gvIdNum, setGvIdNum] = useState('');

  const [cmpBase, setCmpBase] = useState('');
  const [cmpCommRate, setCmpCommRate] = useState('');
  const [cmpTier, setCmpTier] = useState('');
  const [cmpBonus, setCmpBonus] = useState<'unset' | 'yes' | 'no'>('unset');
  const [cmpMq, setCmpMq] = useState('');
  const [cmpQq, setCmpQq] = useState('');
  const [cmpYq, setCmpYq] = useState('');
  const [cmpTr, setCmpTr] = useState('');
  const [cmpMeal, setCmpMeal] = useState('');
  const [cmpCommAllow, setCmpCommAllow] = useState('');
  const [cmpOther, setCmpOther] = useState('');
  const [cmpTotal, setCmpTotal] = useState('');

  const [bnName, setBnName] = useState('');
  const [bnAcctNum, setBnAcctNum] = useState('');
  const [bnAcctName, setBnAcctName] = useState('');
  const [bnType, setBnType] = useState('');
  const [bnFreq, setBnFreq] = useState('');

  const [skillEditId, setSkillEditId] = useState<string | null>(null);
  const [skName, setSkName] = useState('');
  const [skLevel, setSkLevel] = useState('');
  const [skDesc, setSkDesc] = useState('');
  const [skStarted, setSkStarted] = useState('');

  const [certEditId, setCertEditId] = useState<string | null>(null);
  const [certName, setCertName] = useState('');
  const [certOrg, setCertOrg] = useState('');
  const [certIssued, setCertIssued] = useState('');
  const [certExpiry, setCertExpiry] = useState('');

  const [trEditId, setTrEditId] = useState<string | null>(null);
  const [trName, setTrName] = useState('');
  const [trDur, setTrDur] = useState('');
  const [trDone, setTrDone] = useState('');
  const [trInst, setTrInst] = useState('');

  const [activityPage, setActivityPage] = useState(1);
  const [agentOrders, setAgentOrders] = useState<EmployeeAgentOrderRow[]>([]);
  const [agentOrdersLoading, setAgentOrdersLoading] = useState(false);
  const [agentOrdersError, setAgentOrdersError] = useState<string | null>(null);
  const [agentOrdersPage, setAgentOrdersPage] = useState(1);
  const [agentOrdersSearch, setAgentOrdersSearch] = useState('');
  const [agentOrdersSortKey, setAgentOrdersSortKey] = useState<AgentOrdersSortKey>('orderDate');
  const [agentOrdersSortDir, setAgentOrdersSortDir] = useState<'asc' | 'desc'>('desc');
  const [agentOrdersStatusFilter, setAgentOrdersStatusFilter] = useState('');
  const [agentOrdersPaymentFilter, setAgentOrdersPaymentFilter] = useState('');
  const [agentOrdersPeriodKind, setAgentOrdersPeriodKind] = useState<DatePeriodKind>('month');
  const [agentOrdersCustomStart, setAgentOrdersCustomStart] = useState('');
  const [agentOrdersCustomEnd, setAgentOrdersCustomEnd] = useState('');
  const [agentOrdersPeriodModalOpen, setAgentOrdersPeriodModalOpen] = useState(false);
  const [draftAgentOrdersPeriodKind, setDraftAgentOrdersPeriodKind] = useState<DatePeriodKind>('month');
  const [draftAgentOrdersCustomStart, setDraftAgentOrdersCustomStart] = useState('');
  const [draftAgentOrdersCustomEnd, setDraftAgentOrdersCustomEnd] = useState('');
  const [tripHistory, setTripHistory] = useState<BranchTripHistoryRecord[]>([]);
  const [tripHistoryLoading, setTripHistoryLoading] = useState(false);
  const [tripHistoryError, setTripHistoryError] = useState<string | null>(null);
  const [tripHistoryPage, setTripHistoryPage] = useState(1);
  const [tripHistorySearch, setTripHistorySearch] = useState('');
  const [tripHistorySortKey, setTripHistorySortKey] = useState<TripHistorySortKey>('date');
  const [tripHistorySortDir, setTripHistorySortDir] = useState<'asc' | 'desc'>('desc');
  const [tripHistoryStatusFilter, setTripHistoryStatusFilter] = useState('');
  const [tripHistoryPeriodKind, setTripHistoryPeriodKind] = useState<DatePeriodKind>('month');
  const [tripHistoryCustomStart, setTripHistoryCustomStart] = useState('');
  const [tripHistoryCustomEnd, setTripHistoryCustomEnd] = useState('');
  const [tripHistoryPeriodModalOpen, setTripHistoryPeriodModalOpen] = useState(false);
  const [draftTripHistoryPeriodKind, setDraftTripHistoryPeriodKind] = useState<DatePeriodKind>('month');
  const [draftTripHistoryCustomStart, setDraftTripHistoryCustomStart] = useState('');
  const [draftTripHistoryCustomEnd, setDraftTripHistoryCustomEnd] = useState('');
  const [tripDetailOpen, setTripDetailOpen] = useState(false);
  const [tripDetailTrip, setTripDetailTrip] = useState<Trip | null>(null);
  const [tripDetailLoading, setTripDetailLoading] = useState(false);
  const [warehouseProductionRequests, setWarehouseProductionRequests] = useState<EmployeeProductionRequestRow[]>([]);
  const [warehousePurchaseOrders, setWarehousePurchaseOrders] = useState<EmployeePurchaseOrderRow[]>([]);
  const [warehouseRequestsLoading, setWarehouseRequestsLoading] = useState(false);
  const [warehouseRequestsError, setWarehouseRequestsError] = useState<string | null>(null);
  const [warehouseRequestsSearch, setWarehouseRequestsSearch] = useState('');
  const [warehouseRequestsPeriodKind, setWarehouseRequestsPeriodKind] = useState<DatePeriodKind>('all');
  const [warehouseRequestsCustomStart, setWarehouseRequestsCustomStart] = useState('');
  const [warehouseRequestsCustomEnd, setWarehouseRequestsCustomEnd] = useState('');
  const [warehouseRequestsPeriodModalOpen, setWarehouseRequestsPeriodModalOpen] = useState(false);
  const [draftWarehouseRequestsPeriodKind, setDraftWarehouseRequestsPeriodKind] = useState<DatePeriodKind>('month');
  const [draftWarehouseRequestsCustomStart, setDraftWarehouseRequestsCustomStart] = useState('');
  const [draftWarehouseRequestsCustomEnd, setDraftWarehouseRequestsCustomEnd] = useState('');
  const [warehousePrPage, setWarehousePrPage] = useState(1);
  const [warehousePoPage, setWarehousePoPage] = useState(1);
  const [warehousePrSortKey, setWarehousePrSortKey] = useState<WarehousePrSortKey>('requestDate');
  const [warehousePrSortDir, setWarehousePrSortDir] = useState<'asc' | 'desc'>('desc');
  const [warehousePoSortKey, setWarehousePoSortKey] = useState<WarehousePoSortKey>('orderDate');
  const [warehousePoSortDir, setWarehousePoSortDir] = useState<'asc' | 'desc'>('desc');
  const [warehousePrStatusFilter, setWarehousePrStatusFilter] = useState('');
  const [warehousePoStatusFilter, setWarehousePoStatusFilter] = useState('');
  const [catalogProducts, setCatalogProducts] = useState<WarehouseCatalogProduct[]>([]);
  const [catalogMaterials, setCatalogMaterials] = useState<WarehouseCatalogMaterial[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<Set<string>>(new Set());
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogSaving, setCatalogSaving] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogSection, setCatalogSection] = useState<'products' | 'materials'>('products');
  const [catalogProductCategoryId, setCatalogProductCategoryId] = useState('');
  const [catalogMaterialCategoryId, setCatalogMaterialCategoryId] = useState('');

  const [orderPermDraft, setOrderPermDraft] = useState<OrderPermissionSet>({ ...ALL_ORDER_PERMISSIONS_GRANTED });
  const [orderPermSaved, setOrderPermSaved] = useState<OrderPermissionSet>({ ...ALL_ORDER_PERMISSIONS_GRANTED });
  const [orderPermLoading, setOrderPermLoading] = useState(false);
  const [orderPermSaving, setOrderPermSaving] = useState(false);
  const [orderPermError, setOrderPermError] = useState<string | null>(null);
  const [orderPermSaveSuccess, setOrderPermSaveSuccess] = useState(false);

  const [roleDefaultsApplying, setRoleDefaultsApplying] = useState(false);
  const [roleDefaultsMessage, setRoleDefaultsMessage] = useState<string | null>(null);
  const [roleDefaultsError, setRoleDefaultsError] = useState<string | null>(null);

  const [productPermDraft, setProductPermDraft] = useState<ProductPermissionSet>({ ...ALL_PRODUCT_PERMISSIONS_GRANTED });
  const [productPermSaved, setProductPermSaved] = useState<ProductPermissionSet>({ ...ALL_PRODUCT_PERMISSIONS_GRANTED });
  const [productPermLoading, setProductPermLoading] = useState(false);
  const [productPermSaving, setProductPermSaving] = useState(false);
  const [productPermError, setProductPermError] = useState<string | null>(null);
  const [productPermSaveSuccess, setProductPermSaveSuccess] = useState(false);

  const [materialPermDraft, setMaterialPermDraft] = useState<MaterialPermissionSet>({ ...ALL_MATERIAL_PERMISSIONS_GRANTED });
  const [materialPermSaved, setMaterialPermSaved] = useState<MaterialPermissionSet>({ ...ALL_MATERIAL_PERMISSIONS_GRANTED });
  const [materialPermLoading, setMaterialPermLoading] = useState(false);
  const [materialPermSaving, setMaterialPermSaving] = useState(false);
  const [materialPermError, setMaterialPermError] = useState<string | null>(null);
  const [materialPermSaveSuccess, setMaterialPermSaveSuccess] = useState(false);

  const [warehousePermDraft, setWarehousePermDraft] = useState<WarehousePermissionSet>({ ...ALL_WAREHOUSE_PERMISSIONS_GRANTED });
  const [warehousePermSaved, setWarehousePermSaved] = useState<WarehousePermissionSet>({ ...ALL_WAREHOUSE_PERMISSIONS_GRANTED });
  const [warehousePermLoading, setWarehousePermLoading] = useState(false);
  const [warehousePermSaving, setWarehousePermSaving] = useState(false);
  const [warehousePermError, setWarehousePermError] = useState<string | null>(null);
  const [warehousePermSaveSuccess, setWarehousePermSaveSuccess] = useState(false);

  const [logisticsPermDraft, setLogisticsPermDraft] = useState<LogisticsPermissionSet>({ ...ALL_LOGISTICS_PERMISSIONS_GRANTED });
  const [logisticsPermSaved, setLogisticsPermSaved] = useState<LogisticsPermissionSet>({ ...ALL_LOGISTICS_PERMISSIONS_GRANTED });
  const [logisticsPermLoading, setLogisticsPermLoading] = useState(false);
  const [logisticsPermSaving, setLogisticsPermSaving] = useState(false);
  const [logisticsPermError, setLogisticsPermError] = useState<string | null>(null);
  const [logisticsPermSaveSuccess, setLogisticsPermSaveSuccess] = useState(false);

  const [supplierPermDraft, setSupplierPermDraft] = useState<SupplierPermissionSet>({ ...ALL_SUPPLIER_PERMISSIONS_GRANTED });
  const [supplierPermSaved, setSupplierPermSaved] = useState<SupplierPermissionSet>({ ...ALL_SUPPLIER_PERMISSIONS_GRANTED });
  const [supplierPermLoading, setSupplierPermLoading] = useState(false);
  const [supplierPermSaving, setSupplierPermSaving] = useState(false);
  const [supplierPermError, setSupplierPermError] = useState<string | null>(null);
  const [supplierPermSaveSuccess, setSupplierPermSaveSuccess] = useState(false);

  const [customerPermDraft, setCustomerPermDraft] = useState<CustomerPermissionSet>({ ...ALL_CUSTOMER_PERMISSIONS_DENIED });
  const [customerPermSaved, setCustomerPermSaved] = useState<CustomerPermissionSet>({ ...ALL_CUSTOMER_PERMISSIONS_DENIED });
  const [customerPermLoading, setCustomerPermLoading] = useState(false);
  const [customerPermSaving, setCustomerPermSaving] = useState(false);
  const [customerPermError, setCustomerPermError] = useState<string | null>(null);
  const [customerPermSaveSuccess, setCustomerPermSaveSuccess] = useState(false);

  const [financePermDraft, setFinancePermDraft] = useState<FinancePermissionSet>({ ...ALL_FINANCE_PERMISSIONS_GRANTED });
  const [financePermSaved, setFinancePermSaved] = useState<FinancePermissionSet>({ ...ALL_FINANCE_PERMISSIONS_GRANTED });
  const [financePermLoading, setFinancePermLoading] = useState(false);
  const [financePermSaving, setFinancePermSaving] = useState(false);
  const [financePermError, setFinancePermError] = useState<string | null>(null);
  const [financePermSaveSuccess, setFinancePermSaveSuccess] = useState(false);

  const [employeesPermDraft, setEmployeesPermDraft] = useState<EmployeesPermissionSet>({ ...ALL_EMPLOYEES_PERMISSIONS_GRANTED });
  const [employeesPermSaved, setEmployeesPermSaved] = useState<EmployeesPermissionSet>({ ...ALL_EMPLOYEES_PERMISSIONS_GRANTED });
  const [employeesPermLoading, setEmployeesPermLoading] = useState(false);
  const [employeesPermSaving, setEmployeesPermSaving] = useState(false);
  const [employeesPermError, setEmployeesPermError] = useState<string | null>(null);
  const [employeesPermSaveSuccess, setEmployeesPermSaveSuccess] = useState(false);

  const [agentAnalyticsPermDraft, setAgentAnalyticsPermDraft] = useState<AgentAnalyticsPermissionSet>({ ...ALL_AGENT_ANALYTICS_PERMISSIONS_GRANTED });
  const [agentAnalyticsPermSaved, setAgentAnalyticsPermSaved] = useState<AgentAnalyticsPermissionSet>({ ...ALL_AGENT_ANALYTICS_PERMISSIONS_GRANTED });
  const [agentAnalyticsPermLoading, setAgentAnalyticsPermLoading] = useState(false);
  const [agentAnalyticsPermSaving, setAgentAnalyticsPermSaving] = useState(false);
  const [agentAnalyticsPermError, setAgentAnalyticsPermError] = useState<string | null>(null);
  const [agentAnalyticsPermSaveSuccess, setAgentAnalyticsPermSaveSuccess] = useState(false);

  const [reportsPermDraft, setReportsPermDraft] = useState<ReportsPermissionSet>({ ...ALL_REPORTS_PERMISSIONS_GRANTED });
  const [reportsPermSaved, setReportsPermSaved] = useState<ReportsPermissionSet>({ ...ALL_REPORTS_PERMISSIONS_GRANTED });
  const [reportsPermLoading, setReportsPermLoading] = useState(false);
  const [reportsPermSaving, setReportsPermSaving] = useState(false);
  const [reportsPermError, setReportsPermError] = useState<string | null>(null);
  const [reportsPermSaveSuccess, setReportsPermSaveSuccess] = useState(false);

  const [settingsPermDraft, setSettingsPermDraft] = useState<SettingsPermissionSet>({ ...ALL_SETTINGS_PERMISSIONS_GRANTED });
  const [settingsPermSaved, setSettingsPermSaved] = useState<SettingsPermissionSet>({ ...ALL_SETTINGS_PERMISSIONS_GRANTED });
  const [settingsPermLoading, setSettingsPermLoading] = useState(false);
  const [settingsPermSaving, setSettingsPermSaving] = useState(false);
  const [settingsPermError, setSettingsPermError] = useState<string | null>(null);
  const [settingsPermSaveSuccess, setSettingsPermSaveSuccess] = useState(false);

  const [productionRequestPermDraft, setProductionRequestPermDraft] = useState<ProductionRequestPermissionSet>({ ...ALL_PRODUCTION_REQUEST_PERMISSIONS_GRANTED });
  const [productionRequestPermSaved, setProductionRequestPermSaved] = useState<ProductionRequestPermissionSet>({ ...ALL_PRODUCTION_REQUEST_PERMISSIONS_GRANTED });
  const [productionRequestPermLoading, setProductionRequestPermLoading] = useState(false);
  const [productionRequestPermSaving, setProductionRequestPermSaving] = useState(false);
  const [productionRequestPermError, setProductionRequestPermError] = useState<string | null>(null);
  const [productionRequestPermSaveSuccess, setProductionRequestPermSaveSuccess] = useState(false);

  const [purchaseOrderPermDraft, setPurchaseOrderPermDraft] = useState<PurchaseOrderPermissionSet>({ ...ALL_PURCHASE_ORDER_PERMISSIONS_GRANTED });
  const [purchaseOrderPermSaved, setPurchaseOrderPermSaved] = useState<PurchaseOrderPermissionSet>({ ...ALL_PURCHASE_ORDER_PERMISSIONS_GRANTED });
  const [purchaseOrderPermLoading, setPurchaseOrderPermLoading] = useState(false);
  const [purchaseOrderPermSaving, setPurchaseOrderPermSaving] = useState(false);
  const [purchaseOrderPermError, setPurchaseOrderPermError] = useState<string | null>(null);
  const [purchaseOrderPermSaveSuccess, setPurchaseOrderPermSaveSuccess] = useState(false);

  const [interBranchRequestPermDraft, setInterBranchRequestPermDraft] = useState<InterBranchRequestPermissionSet>({ ...ALL_INTER_BRANCH_REQUEST_PERMISSIONS_GRANTED });
  const [interBranchRequestPermSaved, setInterBranchRequestPermSaved] = useState<InterBranchRequestPermissionSet>({ ...ALL_INTER_BRANCH_REQUEST_PERMISSIONS_GRANTED });
  const [interBranchRequestPermLoading, setInterBranchRequestPermLoading] = useState(false);
  const [interBranchRequestPermSaving, setInterBranchRequestPermSaving] = useState(false);
  const [interBranchRequestPermError, setInterBranchRequestPermError] = useState<string | null>(null);
  const [interBranchRequestPermSaveSuccess, setInterBranchRequestPermSaveSuccess] = useState(false);

  useEffect(() => {
    if (!routeParam) {
      setEmployee(null);
      setEmployeeDashboardRoles([]);
      setEmployeePrimaryDashboardRole(null);
      setProfile(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        setEmployeeDashboardRoles([]);
        setEmployeePrimaryDashboardRole(null);
        const emp = await fetchEmployeeWithPerformanceByIdentifier(routeParam);
        if (cancelled) return;
        setEmployee(emp);
        if (emp) {
          const prof = await fetchEmployeeFullProfile(emp.id);
          if (cancelled) return;
          setProfile(prof);
          const legacyRole =
            (prof?.loginAccount?.userRole as UserRole | null | undefined) ??
            (emp.loginAccount?.userRole as UserRole | null | undefined) ??
            null;
          const { roles, primaryRole } = await resolveEmployeeDashboardRoles(emp.id, legacyRole, emp.role);
          if (!cancelled) {
            setEmployeeDashboardRoles(roles);
            setEmployeePrimaryDashboardRole(primaryRole);
          }
        } else {
          setProfile(null);
          setEmployeeDashboardRoles([]);
          setEmployeePrimaryDashboardRole(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load employee');
          setEmployee(null);
          setEmployeeDashboardRoles([]);
          setEmployeePrimaryDashboardRole(null);
          setProfile(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [routeParam]);

  useEffect(() => {
    setPendingGalleryDocUrls([]);
    setPendingDocFiles([]);
    setShowDocGallery(false);
    setShowPfpGallery(false);
    setDocEntryTitle('');
    setNewAssetTitle('');
    setNewAssetDescription('');
    setNewAssetCategory('');
    setNewAssetDate('');
    setAssetAddOpen(false);
    setEditOverview(false);
    setEditContact(false);
    setEditEmployment(false);
    setEditCompensation(false);
    setEditCompensation(false);
    setSkillEditId(null);
    setCertEditId(null);
    setTrEditId(null);
    setEmEmpCode('');
    setEmJoinDate('');
  }, [employee?.id]);

  const refreshProfileFromServer = useCallback(async () => {
    const id = employee?.id;
    if (!id) return;
    const prof = await fetchEmployeeFullProfile(id);
    setProfile(prof);
  }, [employee?.id]);

  const reloadEmployeeHeader = useCallback(async () => {
    const id = employee?.id;
    const param = routeParam?.trim();
    const key = id ?? param;
    if (!key) return;
    const next = await fetchEmployeeWithPerformanceByIdentifier(key);
    setEmployee(next);
  }, [employee?.id, routeParam]);

  const handleProfilePhotoSelected = useCallback(
    async (imageUrl: string) => {
      const id = employee?.id;
      const name = employee?.employeeName;
      const empCode = employee?.employeeId;
      if (!id) return;
      setPfpSaving(true);
      try {
        const { error: upErr } = await supabase
          .from('employees')
          .update({ profile_photo: imageUrl, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (upErr) {
          window.alert(upErr.message);
          return;
        }
        setEmployee((prev) => (prev && prev.id === id ? { ...prev, profilePhoto: imageUrl } : prev));
        addAuditLog(
          'Employee profile photo',
          'Employee',
          `Updated profile photo for ${name ?? 'Employee'} (${empCode ?? id})`,
        );
      } finally {
        setPfpSaving(false);
      }
    },
    [employee, addAuditLog],
  );

  const handleEmployeeDocPdfInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list?.length) return;
    const next: File[] = [];
    for (let i = 0; i < list.length; i++) {
      const f = list.item(i);
      if (!f) continue;
      const isPdf = f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
      if (!isPdf) {
        window.alert(`${f.name} is not a PDF — skipped.`);
        continue;
      }
      if (f.size > EMPLOYEE_DOC_PDF_MAX_BYTES) {
        window.alert(`${f.name} is larger than 25MB — skipped.`);
        continue;
      }
      next.push(f);
    }
    if (next.length) setPendingDocFiles((prev) => [...prev, ...next]);
    e.target.value = '';
  }, []);

  const handleSavePendingEmployeeDocuments = useCallback(async () => {
    if (!employee?.id) return;
    if (pendingGalleryDocUrls.length === 0 && pendingDocFiles.length === 0) return;

    const uploader = employeeName || session?.user?.email || 'User';
    const folder = `${EMPLOYEE_DOCS_STORAGE_ROOT}/${employee.id}`;
    const today = new Date().toISOString().slice(0, 10);
    const typeVal = docUploadType;
    const totalStaged = pendingGalleryDocUrls.length + pendingDocFiles.length;

    setDocSaving(true);
    try {
      type InsertRow = {
        employee_id: string;
        document_type: string;
        document_name: string;
        file_url: string;
        file_size: string | null;
        uploaded_by: string;
        upload_date: string;
      };
      const rows: InsertRow[] = [];

      for (const url of pendingGalleryDocUrls) {
        rows.push({
          employee_id: employee.id,
          document_type: typeVal,
          document_name: resolveDocumentEntryName(docEntryTitle, displayNameFromPublicUrl(url), totalStaged),
          file_url: url,
          file_size: null,
          uploaded_by: uploader,
          upload_date: today,
        });
      }

      for (const file of pendingDocFiles) {
        const safe = sanitizeEmployeeDocFileName(file.name);
        const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}_${safe}`;
        const { error: upErr } = await supabase.storage
          .from('images')
          .upload(path, file, { cacheControl: '3600', upsert: false });
        if (upErr) {
          window.alert(`Upload failed for ${file.name}: ${upErr.message}`);
          return;
        }
        const { data: pub } = supabase.storage.from('images').getPublicUrl(path);
        rows.push({
          employee_id: employee.id,
          document_type: typeVal,
          document_name: resolveDocumentEntryName(docEntryTitle, file.name, totalStaged),
          file_url: pub.publicUrl,
          file_size: formatEmployeeDocFileSize(file.size),
          uploaded_by: uploader,
          upload_date: today,
        });
      }

      const { error: insErr } = await supabase.from('employee_documents').insert(rows);
      if (insErr) {
        window.alert(insErr.message);
        return;
      }

      addAuditLog(
        'Employee documents',
        'Employee',
        `${rows.length} file(s) attached to ${employee.employeeName} (${employee.employeeId})`,
      );
      setPendingGalleryDocUrls([]);
      setPendingDocFiles([]);
      setDocEntryTitle('');
      await refreshProfileFromServer();
    } finally {
      setDocSaving(false);
    }
  }, [
    employee,
    pendingGalleryDocUrls,
    pendingDocFiles,
    docUploadType,
    docEntryTitle,
    employeeName,
    session?.user?.email,
    addAuditLog,
    refreshProfileFromServer,
  ]);

  const handleAddEmployeeAsset = useCallback(async () => {
    if (!employee?.id) return;
    const title = newAssetTitle.trim();
    if (!title) {
      window.alert('Enter a title for the asset.');
      return;
    }
    setAssetSaving(true);
    try {
      const { error } = await supabase.from('employee_assets').insert({
        employee_id: employee.id,
        asset_type: 'Other',
        asset_name: title,
        asset_description: newAssetDescription.trim() || null,
        category_label: newAssetCategory.trim() || null,
        assigned_date: newAssetDate.trim() || null,
      });
      if (error) {
        window.alert(error.message);
        return;
      }
      addAuditLog(
        'Employee asset',
        'Employee',
        `Added asset "${title}" for ${employee.employeeName} (${employee.employeeId})`,
      );
      setNewAssetTitle('');
      setNewAssetDescription('');
      setNewAssetCategory('');
      setNewAssetDate('');
      setAssetAddOpen(false);
      await refreshProfileFromServer();
    } finally {
      setAssetSaving(false);
    }
  }, [
    employee,
    newAssetTitle,
    newAssetDescription,
    newAssetCategory,
    newAssetDate,
    addAuditLog,
    refreshProfileFromServer,
  ]);

  const RoleIcon = useMemo(() => getRoleIcon(employee?.role ?? null), [employee?.role]);

  const activityFeed = profile?.activityFeed ?? [];
  const activityTotalPages = Math.max(1, Math.ceil(activityFeed.length / ACTIVITY_PAGE_SIZE));
  const safeActivityPage = Math.min(Math.max(1, activityPage), activityTotalPages);
  const paginatedActivity = useMemo(
    () => activityFeed.slice((safeActivityPage - 1) * ACTIVITY_PAGE_SIZE, safeActivityPage * ACTIVITY_PAGE_SIZE),
    [activityFeed, safeActivityPage],
  );

  const distinctAgentOrderStatuses = useMemo(
    () => [...new Set(agentOrders.map(r => r.status).filter(Boolean))].sort(),
    [agentOrders],
  );
  const distinctAgentPaymentStatuses = useMemo(
    () => [...new Set(agentOrders.map(r => r.paymentStatus).filter(Boolean))].sort(),
    [agentOrders],
  );

  const agentOrdersPeriodQuery = useMemo(
    () => resolveDatePeriodQuery(agentOrdersPeriodKind, agentOrdersCustomStart, agentOrdersCustomEnd),
    [agentOrdersPeriodKind, agentOrdersCustomStart, agentOrdersCustomEnd],
  );

  const maxAgentOrdersCustomDate = useMemo(() => todayIsoLocal(), []);

  const draftAgentOrdersCustomInvalid = Boolean(
    draftAgentOrdersCustomStart && draftAgentOrdersCustomEnd && draftAgentOrdersCustomStart > draftAgentOrdersCustomEnd,
  );

  const filteredAgentOrders = useMemo(() => {
    const q = agentOrdersSearch.trim().toLowerCase();
    return agentOrders.filter(row => {
      if (!agentOrdersPeriodQuery.invalid) {
        if (!inDatePeriodRange(row.orderDate, agentOrdersPeriodQuery.from, agentOrdersPeriodQuery.to)) {
          return false;
        }
      }
      if (agentOrdersStatusFilter && row.status !== agentOrdersStatusFilter) return false;
      if (agentOrdersPaymentFilter && row.paymentStatus !== agentOrdersPaymentFilter) return false;
      if (!q) return true;
      return [
        row.orderNumber,
        row.tripNumber ?? '',
        row.tripId ?? '',
        row.customerName,
      ].some(v => v?.toLowerCase().includes(q));
    });
  }, [
    agentOrders,
    agentOrdersSearch,
    agentOrdersStatusFilter,
    agentOrdersPaymentFilter,
    agentOrdersPeriodQuery,
  ]);

  const sortedAgentOrders = useMemo(() => {
    return [...filteredAgentOrders].sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      switch (agentOrdersSortKey) {
        case 'orderNumber':
          av = a.orderNumber;
          bv = b.orderNumber;
          break;
        case 'trip':
          av = a.tripNumber ?? a.tripId ?? '';
          bv = b.tripNumber ?? b.tripId ?? '';
          break;
        case 'customer':
          av = (a.customerName ?? '').toLowerCase();
          bv = (b.customerName ?? '').toLowerCase();
          break;
        case 'orderDate':
          av = a.orderDate ?? '';
          bv = b.orderDate ?? '';
          break;
        case 'requiredDate':
          av = a.requiredDate ?? '';
          bv = b.requiredDate ?? '';
          break;
        case 'total':
          av = a.totalAmount;
          bv = b.totalAmount;
          break;
        case 'paid':
          av = a.amountPaid;
          bv = b.amountPaid;
          break;
        case 'balance':
          av = a.balanceDue;
          bv = b.balanceDue;
          break;
        case 'status':
          av = a.status;
          bv = b.status;
          break;
        case 'payment':
          av = a.paymentStatus;
          bv = b.paymentStatus;
          break;
        default:
          av = a.orderDate ?? '';
          bv = b.orderDate ?? '';
      }
      if (typeof av === 'number' && typeof bv === 'number') {
        return agentOrdersSortDir === 'asc' ? av - bv : bv - av;
      }
      const as = String(av);
      const bs = String(bv);
      if (as < bs) return agentOrdersSortDir === 'asc' ? -1 : 1;
      if (as > bs) return agentOrdersSortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredAgentOrders, agentOrdersSortKey, agentOrdersSortDir]);

  const agentOrdersTotalPages = Math.max(1, Math.ceil(sortedAgentOrders.length / AGENT_ORDERS_PAGE_SIZE));
  const safeAgentOrdersPage = Math.min(Math.max(1, agentOrdersPage), agentOrdersTotalPages);
  const paginatedAgentOrders = useMemo(
    () =>
      sortedAgentOrders.slice(
        (safeAgentOrdersPage - 1) * AGENT_ORDERS_PAGE_SIZE,
        safeAgentOrdersPage * AGENT_ORDERS_PAGE_SIZE,
      ),
    [sortedAgentOrders, safeAgentOrdersPage],
  );

  const handleAgentOrdersSort = (key: AgentOrdersSortKey) => {
    if (agentOrdersSortKey === key) {
      setAgentOrdersSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setAgentOrdersSortKey(key);
      setAgentOrdersSortDir('asc');
    }
  };

  const agentOrdersSortIcon = (col: AgentOrdersSortKey) => {
    if (agentOrdersSortKey !== col) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
    return agentOrdersSortDir === 'asc'
      ? <ArrowUp className="w-3 h-3 ml-1 text-blue-600" />
      : <ArrowDown className="w-3 h-3 ml-1 text-blue-600" />;
  };

  const openAgentOrdersPeriodModal = () => {
    setDraftAgentOrdersPeriodKind(agentOrdersPeriodKind);
    setDraftAgentOrdersCustomStart(agentOrdersCustomStart);
    setDraftAgentOrdersCustomEnd(agentOrdersCustomEnd);
    setAgentOrdersPeriodModalOpen(true);
  };

  const handleAgentOrdersPeriodChange = (kind: DatePeriodKind) => {
    setAgentOrdersPeriodKind(kind);
    if (kind === 'custom') {
      const t = new Date();
      const iso = todayIsoLocal();
      const start = `${t.getFullYear()}-${pad2Local(t.getMonth() + 1)}-01`;
      setAgentOrdersCustomStart(start);
      setAgentOrdersCustomEnd(iso);
    }
  };

  const handleAgentOrdersModalPresetPick = (kind: DatePeriodKind) => {
    if (kind !== 'custom') {
      handleAgentOrdersPeriodChange(kind);
      setAgentOrdersPeriodModalOpen(false);
      return;
    }
    setDraftAgentOrdersPeriodKind('custom');
    const t = new Date();
    const iso = todayIsoLocal();
    const start = `${t.getFullYear()}-${pad2Local(t.getMonth() + 1)}-01`;
    setDraftAgentOrdersCustomStart(prev => prev || agentOrdersCustomStart || start);
    setDraftAgentOrdersCustomEnd(prev => prev || agentOrdersCustomEnd || iso);
  };

  const applyAgentOrdersModalCustomRange = () => {
    setAgentOrdersPeriodKind('custom');
    setAgentOrdersCustomStart(draftAgentOrdersCustomStart);
    setAgentOrdersCustomEnd(draftAgentOrdersCustomEnd);
    setAgentOrdersPeriodModalOpen(false);
  };

  const tripHistoryPeriodQuery = useMemo(
    () => resolveDatePeriodQuery(tripHistoryPeriodKind, tripHistoryCustomStart, tripHistoryCustomEnd),
    [tripHistoryPeriodKind, tripHistoryCustomStart, tripHistoryCustomEnd],
  );

  const maxTripHistoryCustomDate = useMemo(() => todayIsoLocal(), []);

  const draftTripHistoryCustomInvalid = Boolean(
    draftTripHistoryCustomStart && draftTripHistoryCustomEnd && draftTripHistoryCustomStart > draftTripHistoryCustomEnd,
  );

  const distinctTripHistoryStatuses = useMemo(
    () => [...new Set(tripHistory.map(r => r.status).filter(Boolean))].sort(),
    [tripHistory],
  );

  const filteredTripHistory = useMemo(() => {
    return tripHistory.filter(row => {
      if (!tripHistoryPeriodQuery.invalid) {
        if (!inDatePeriodRange(row.date, tripHistoryPeriodQuery.from, tripHistoryPeriodQuery.to)) {
          return false;
        }
      }
      if (tripHistoryStatusFilter && row.status !== tripHistoryStatusFilter) return false;
      return tripHistoryMatchesSearch(
        {
          id: row.id,
          tripId: row.tripId,
          tripNumber: row.tripNumber,
          driverName: row.driverName,
          vehicleName: row.vehicleName,
          customerLabel: row.customerLabel,
          route: row.route,
          orderNumbers: row.orderNumbers,
        },
        tripHistorySearch,
      );
    });
  }, [tripHistory, tripHistorySearch, tripHistoryStatusFilter, tripHistoryPeriodQuery]);

  const sortedTripHistory = useMemo(() => {
    return [...filteredTripHistory].sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      switch (tripHistorySortKey) {
        case 'tripNumber':
          av = a.tripNumber;
          bv = b.tripNumber;
          break;
        case 'date':
          av = a.date;
          bv = b.date;
          break;
        case 'vehicle':
          av = (a.vehicleName ?? '').toLowerCase();
          bv = (b.vehicleName ?? '').toLowerCase();
          break;
        case 'driver':
          av = (a.driverName ?? '').toLowerCase();
          bv = (b.driverName ?? '').toLowerCase();
          break;
        case 'orders':
          av = a.ordersCount;
          bv = b.ordersCount;
          break;
        case 'status':
          av = a.status;
          bv = b.status;
          break;
        default:
          av = a.date;
          bv = b.date;
      }
      if (typeof av === 'number' && typeof bv === 'number') {
        return tripHistorySortDir === 'asc' ? av - bv : bv - av;
      }
      const as = String(av);
      const bs = String(bv);
      if (as < bs) return tripHistorySortDir === 'asc' ? -1 : 1;
      if (as > bs) return tripHistorySortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredTripHistory, tripHistorySortKey, tripHistorySortDir]);

  const tripHistoryTotalPages = Math.max(1, Math.ceil(sortedTripHistory.length / TRIP_HISTORY_PAGE_SIZE));
  const safeTripHistoryPage = Math.min(Math.max(1, tripHistoryPage), tripHistoryTotalPages);
  const paginatedTripHistory = useMemo(
    () =>
      sortedTripHistory.slice(
        (safeTripHistoryPage - 1) * TRIP_HISTORY_PAGE_SIZE,
        safeTripHistoryPage * TRIP_HISTORY_PAGE_SIZE,
      ),
    [sortedTripHistory, safeTripHistoryPage],
  );

  const handleTripHistorySort = (key: TripHistorySortKey) => {
    if (tripHistorySortKey === key) {
      setTripHistorySortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setTripHistorySortKey(key);
      setTripHistorySortDir('asc');
    }
  };

  const tripHistorySortIcon = (col: TripHistorySortKey) => {
    if (tripHistorySortKey !== col) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
    return tripHistorySortDir === 'asc'
      ? <ArrowUp className="w-3 h-3 ml-1 text-blue-600" />
      : <ArrowDown className="w-3 h-3 ml-1 text-blue-600" />;
  };

  const openTripHistoryPeriodModal = () => {
    setDraftTripHistoryPeriodKind(tripHistoryPeriodKind);
    setDraftTripHistoryCustomStart(tripHistoryCustomStart);
    setDraftTripHistoryCustomEnd(tripHistoryCustomEnd);
    setTripHistoryPeriodModalOpen(true);
  };

  const handleTripHistoryPeriodChange = (kind: DatePeriodKind) => {
    setTripHistoryPeriodKind(kind);
    if (kind === 'custom') {
      const t = new Date();
      const iso = todayIsoLocal();
      const start = `${t.getFullYear()}-${pad2Local(t.getMonth() + 1)}-01`;
      setTripHistoryCustomStart(start);
      setTripHistoryCustomEnd(iso);
    }
  };

  const handleTripHistoryModalPresetPick = (kind: DatePeriodKind) => {
    if (kind !== 'custom') {
      handleTripHistoryPeriodChange(kind);
      setTripHistoryPeriodModalOpen(false);
      return;
    }
    setDraftTripHistoryPeriodKind('custom');
    const t = new Date();
    const iso = todayIsoLocal();
    const start = `${t.getFullYear()}-${pad2Local(t.getMonth() + 1)}-01`;
    setDraftTripHistoryCustomStart(prev => prev || tripHistoryCustomStart || start);
    setDraftTripHistoryCustomEnd(prev => prev || tripHistoryCustomEnd || iso);
  };

  const applyTripHistoryModalCustomRange = () => {
    setTripHistoryPeriodKind('custom');
    setTripHistoryCustomStart(draftTripHistoryCustomStart);
    setTripHistoryCustomEnd(draftTripHistoryCustomEnd);
    setTripHistoryPeriodModalOpen(false);
  };

  const openTripDetailFromHistory = async (rec: BranchTripHistoryRecord) => {
    if (!rec.tripId) return;
    setTripDetailLoading(true);
    try {
      const { trip, error } = await fetchTripById(rec.tripId);
      if (error || !trip) {
        window.alert(error ?? 'Could not load trip.');
        return;
      }
      setTripDetailTrip(trip);
      setTripDetailOpen(true);
    } finally {
      setTripDetailLoading(false);
    }
  };

  const warehouseRequestsPeriodQuery = useMemo(
    () =>
      resolveDatePeriodQuery(
        warehouseRequestsPeriodKind,
        warehouseRequestsCustomStart,
        warehouseRequestsCustomEnd,
      ),
    [warehouseRequestsPeriodKind, warehouseRequestsCustomStart, warehouseRequestsCustomEnd],
  );

  const maxWarehouseRequestsCustomDate = useMemo(() => todayIsoLocal(), []);

  const draftWarehouseRequestsCustomInvalid = Boolean(
    draftWarehouseRequestsCustomStart &&
      draftWarehouseRequestsCustomEnd &&
      draftWarehouseRequestsCustomStart > draftWarehouseRequestsCustomEnd,
  );

  const distinctWarehousePrStatuses = useMemo(
    () => [...new Set(warehouseProductionRequests.map(r => r.status).filter(Boolean))].sort(),
    [warehouseProductionRequests],
  );

  const distinctWarehousePoStatuses = useMemo(
    () => [...new Set(warehousePurchaseOrders.map(r => r.status).filter(Boolean))].sort(),
    [warehousePurchaseOrders],
  );

  const filteredWarehouseProductionRequests = useMemo(() => {
    const q = warehouseRequestsSearch.trim().toLowerCase();
    return warehouseProductionRequests.filter(row => {
      if (!warehouseRequestsPeriodQuery.invalid) {
        if (!inDatePeriodRange(row.requestDate, warehouseRequestsPeriodQuery.from, warehouseRequestsPeriodQuery.to)) {
          return false;
        }
      }
      if (warehousePrStatusFilter && row.status !== warehousePrStatusFilter) return false;
      if (!q) return true;
      return [row.prNumber, row.branchName].some(v => v?.toLowerCase().includes(q));
    });
  }, [
    warehouseProductionRequests,
    warehouseRequestsSearch,
    warehousePrStatusFilter,
    warehouseRequestsPeriodQuery,
  ]);

  const filteredWarehousePurchaseOrders = useMemo(() => {
    const q = warehouseRequestsSearch.trim().toLowerCase();
    return warehousePurchaseOrders.filter(row => {
      if (!warehouseRequestsPeriodQuery.invalid) {
        if (!inDatePeriodRange(row.orderDate, warehouseRequestsPeriodQuery.from, warehouseRequestsPeriodQuery.to)) {
          return false;
        }
      }
      if (warehousePoStatusFilter && row.status !== warehousePoStatusFilter) return false;
      if (!q) return true;
      return [row.poNumber, row.supplierName, row.branchName].some(v => v?.toLowerCase().includes(q));
    });
  }, [
    warehousePurchaseOrders,
    warehouseRequestsSearch,
    warehousePoStatusFilter,
    warehouseRequestsPeriodQuery,
  ]);

  const sortedWarehouseProductionRequests = useMemo(() => {
    return [...filteredWarehouseProductionRequests].sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      switch (warehousePrSortKey) {
        case 'prNumber':
          av = a.prNumber;
          bv = b.prNumber;
          break;
        case 'requestDate':
          av = a.requestDate ?? '';
          bv = b.requestDate ?? '';
          break;
        case 'expectedDate':
          av = a.expectedCompletionDate ?? '';
          bv = b.expectedCompletionDate ?? '';
          break;
        case 'branch':
          av = (a.branchName ?? '').toLowerCase();
          bv = (b.branchName ?? '').toLowerCase();
          break;
        case 'items':
          av = a.itemCount;
          bv = b.itemCount;
          break;
        case 'status':
          av = a.status;
          bv = b.status;
          break;
        default:
          av = a.requestDate ?? '';
          bv = b.requestDate ?? '';
      }
      if (typeof av === 'number' && typeof bv === 'number') {
        return warehousePrSortDir === 'asc' ? av - bv : bv - av;
      }
      const as = String(av);
      const bs = String(bv);
      if (as < bs) return warehousePrSortDir === 'asc' ? -1 : 1;
      if (as > bs) return warehousePrSortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredWarehouseProductionRequests, warehousePrSortKey, warehousePrSortDir]);

  const sortedWarehousePurchaseOrders = useMemo(() => {
    return [...filteredWarehousePurchaseOrders].sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      switch (warehousePoSortKey) {
        case 'poNumber':
          av = a.poNumber;
          bv = b.poNumber;
          break;
        case 'orderDate':
          av = a.orderDate ?? '';
          bv = b.orderDate ?? '';
          break;
        case 'expectedDate':
          av = a.expectedDeliveryDate ?? '';
          bv = b.expectedDeliveryDate ?? '';
          break;
        case 'supplier':
          av = (a.supplierName ?? '').toLowerCase();
          bv = (b.supplierName ?? '').toLowerCase();
          break;
        case 'total':
          av = a.totalAmount;
          bv = b.totalAmount;
          break;
        case 'status':
          av = a.status;
          bv = b.status;
          break;
        default:
          av = a.orderDate ?? '';
          bv = b.orderDate ?? '';
      }
      if (typeof av === 'number' && typeof bv === 'number') {
        return warehousePoSortDir === 'asc' ? av - bv : bv - av;
      }
      const as = String(av);
      const bs = String(bv);
      if (as < bs) return warehousePoSortDir === 'asc' ? -1 : 1;
      if (as > bs) return warehousePoSortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredWarehousePurchaseOrders, warehousePoSortKey, warehousePoSortDir]);

  const warehousePrTotalPages = Math.max(
    1,
    Math.ceil(sortedWarehouseProductionRequests.length / WAREHOUSE_PR_PAGE_SIZE),
  );
  const safeWarehousePrPage = Math.min(Math.max(1, warehousePrPage), warehousePrTotalPages);
  const paginatedWarehouseProductionRequests = useMemo(
    () =>
      sortedWarehouseProductionRequests.slice(
        (safeWarehousePrPage - 1) * WAREHOUSE_PR_PAGE_SIZE,
        safeWarehousePrPage * WAREHOUSE_PR_PAGE_SIZE,
      ),
    [sortedWarehouseProductionRequests, safeWarehousePrPage],
  );

  const warehousePoTotalPages = Math.max(
    1,
    Math.ceil(sortedWarehousePurchaseOrders.length / WAREHOUSE_PO_PAGE_SIZE),
  );
  const safeWarehousePoPage = Math.min(Math.max(1, warehousePoPage), warehousePoTotalPages);
  const paginatedWarehousePurchaseOrders = useMemo(
    () =>
      sortedWarehousePurchaseOrders.slice(
        (safeWarehousePoPage - 1) * WAREHOUSE_PO_PAGE_SIZE,
        safeWarehousePoPage * WAREHOUSE_PO_PAGE_SIZE,
      ),
    [sortedWarehousePurchaseOrders, safeWarehousePoPage],
  );

  const handleWarehousePrSort = (key: WarehousePrSortKey) => {
    if (warehousePrSortKey === key) {
      setWarehousePrSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setWarehousePrSortKey(key);
      setWarehousePrSortDir('asc');
    }
  };

  const warehousePrSortIcon = (col: WarehousePrSortKey) => {
    if (warehousePrSortKey !== col) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
    return warehousePrSortDir === 'asc'
      ? <ArrowUp className="w-3 h-3 ml-1 text-blue-600" />
      : <ArrowDown className="w-3 h-3 ml-1 text-blue-600" />;
  };

  const handleWarehousePoSort = (key: WarehousePoSortKey) => {
    if (warehousePoSortKey === key) {
      setWarehousePoSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setWarehousePoSortKey(key);
      setWarehousePoSortDir('asc');
    }
  };

  const warehousePoSortIcon = (col: WarehousePoSortKey) => {
    if (warehousePoSortKey !== col) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
    return warehousePoSortDir === 'asc'
      ? <ArrowUp className="w-3 h-3 ml-1 text-blue-600" />
      : <ArrowDown className="w-3 h-3 ml-1 text-blue-600" />;
  };

  const openWarehouseRequestsPeriodModal = () => {
    setDraftWarehouseRequestsPeriodKind(warehouseRequestsPeriodKind);
    setDraftWarehouseRequestsCustomStart(warehouseRequestsCustomStart);
    setDraftWarehouseRequestsCustomEnd(warehouseRequestsCustomEnd);
    setWarehouseRequestsPeriodModalOpen(true);
  };

  const handleWarehouseRequestsPeriodChange = (kind: DatePeriodKind) => {
    setWarehouseRequestsPeriodKind(kind);
    if (kind === 'custom') {
      const t = new Date();
      const iso = todayIsoLocal();
      const start = `${t.getFullYear()}-${pad2Local(t.getMonth() + 1)}-01`;
      setWarehouseRequestsCustomStart(start);
      setWarehouseRequestsCustomEnd(iso);
    }
  };

  const handleWarehouseRequestsModalPresetPick = (kind: DatePeriodKind) => {
    if (kind !== 'custom') {
      handleWarehouseRequestsPeriodChange(kind);
      setWarehouseRequestsPeriodModalOpen(false);
      return;
    }
    setDraftWarehouseRequestsPeriodKind('custom');
    const t = new Date();
    const iso = todayIsoLocal();
    const start = `${t.getFullYear()}-${pad2Local(t.getMonth() + 1)}-01`;
    setDraftWarehouseRequestsCustomStart(prev => prev || warehouseRequestsCustomStart || start);
    setDraftWarehouseRequestsCustomEnd(prev => prev || warehouseRequestsCustomEnd || iso);
  };

  const applyWarehouseRequestsModalCustomRange = () => {
    setWarehouseRequestsPeriodKind('custom');
    setWarehouseRequestsCustomStart(draftWarehouseRequestsCustomStart);
    setWarehouseRequestsCustomEnd(draftWarehouseRequestsCustomEnd);
    setWarehouseRequestsPeriodModalOpen(false);
  };

  const visibleTabs = useMemo(
    () => filterEmployeeDetailTabs(DETAIL_TABS, employeeDashboardRoles),
    [employeeDashboardRoles],
  );

  useEffect(() => {
    setActivityPage(1);
  }, [activityFeed.length, employee?.id]);

  useEffect(() => {
    setAgentOrdersPage(1);
  }, [
    agentOrdersSearch,
    agentOrdersSortKey,
    agentOrdersSortDir,
    agentOrdersStatusFilter,
    agentOrdersPaymentFilter,
    agentOrdersPeriodKind,
    agentOrdersCustomStart,
    agentOrdersCustomEnd,
  ]);

  useEffect(() => {
    setAgentOrdersSearch('');
    setAgentOrdersStatusFilter('');
    setAgentOrdersPaymentFilter('');
    setAgentOrdersSortKey('orderDate');
    setAgentOrdersSortDir('desc');
    setAgentOrdersPeriodKind('month');
    setAgentOrdersPeriodModalOpen(false);
    setTripHistorySearch('');
    setTripHistoryStatusFilter('');
    setTripHistorySortKey('date');
    setTripHistorySortDir('desc');
    setTripHistoryPeriodKind(employeeUsesDriverTripHistoryView(employeeDashboardRoles) ? 'all' : 'month');
    setTripHistoryPeriodModalOpen(false);
    setTripDetailOpen(false);
    setTripDetailTrip(null);
    setWarehouseRequestsSearch('');
    setWarehousePrStatusFilter('');
    setWarehousePoStatusFilter('');
    setWarehousePrSortKey('requestDate');
    setWarehousePrSortDir('desc');
    setWarehousePoSortKey('orderDate');
    setWarehousePoSortDir('desc');
    setWarehouseRequestsPeriodKind('all');
    setWarehouseRequestsPeriodModalOpen(false);
    const t = new Date();
    const iso = todayIsoLocal();
    const start = `${t.getFullYear()}-${pad2Local(t.getMonth() + 1)}-01`;
    setAgentOrdersCustomStart(start);
    setAgentOrdersCustomEnd(iso);
    setTripHistoryCustomStart(start);
    setTripHistoryCustomEnd(iso);
    setWarehouseRequestsCustomStart(start);
    setWarehouseRequestsCustomEnd(iso);
    setCatalogSearch('');
    setCatalogSection('products');
    setCatalogProductCategoryId('');
    setCatalogMaterialCategoryId('');
  }, [employee?.id, employeeDashboardRoles]);

  useEffect(() => {
    setWarehousePrPage(1);
    setWarehousePoPage(1);
  }, [
    warehouseRequestsSearch,
    warehousePrSortKey,
    warehousePrSortDir,
    warehousePoSortKey,
    warehousePoSortDir,
    warehousePrStatusFilter,
    warehousePoStatusFilter,
    warehouseRequestsPeriodKind,
    warehouseRequestsCustomStart,
    warehouseRequestsCustomEnd,
  ]);

  useEffect(() => {
    if (!warehouseRequestsPeriodModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setWarehouseRequestsPeriodModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [warehouseRequestsPeriodModalOpen]);

  useEffect(() => {
    setTripHistoryPage(1);
  }, [
    tripHistorySearch,
    tripHistorySortKey,
    tripHistorySortDir,
    tripHistoryStatusFilter,
    tripHistoryPeriodKind,
    tripHistoryCustomStart,
    tripHistoryCustomEnd,
  ]);

  useEffect(() => {
    if (!tripHistoryPeriodModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTripHistoryPeriodModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tripHistoryPeriodModalOpen]);

  useEffect(() => {
    if (!agentOrdersPeriodModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAgentOrdersPeriodModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [agentOrdersPeriodModalOpen]);

  useEffect(() => {
    if (!isEmployeeDetailTabVisible(tab, employeeDashboardRoles)) {
      setTab('overview');
    }
  }, [tab, employeeDashboardRoles]);

  useEffect(() => {
    if (!employee || tab !== 'orders' || !employeeHasAgentDetailTabs(employeeDashboardRoles)) return;
    let cancelled = false;
    (async () => {
      setAgentOrdersLoading(true);
      setAgentOrdersError(null);
      try {
        const rows = await fetchAgentOrders(employee.id);
        if (!cancelled) {
          setAgentOrders(rows);
          setAgentOrdersPage(1);
        }
      } catch (e) {
        if (!cancelled) {
          setAgentOrdersError(e instanceof Error ? e.message : 'Failed to load orders');
          setAgentOrders([]);
        }
      } finally {
        if (!cancelled) setAgentOrdersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [employee, tab, employeeDashboardRoles]);

  useEffect(() => {
    if (!employee || tab !== 'trips' || !employeeHasTripHistoryDetailTabs(employeeDashboardRoles)) return;
    let cancelled = false;
    (async () => {
      setTripHistoryLoading(true);
      setTripHistoryError(null);
      try {
        const branchName = employee.branchName?.trim();
        if (employeeUsesDriverTripHistoryView(employeeDashboardRoles)) {
          const { records, error } = await fetchDriverTripHistory({
            driverId: employee.id,
            driverName: employee.employeeName,
            branchName: branchName ?? null,
          });
          if (cancelled) return;
          if (error) {
            setTripHistoryError(error);
            setTripHistory([]);
          } else {
            setTripHistory(records);
            setTripHistoryPage(1);
          }
          return;
        }

        if (!branchName) {
          if (!cancelled) {
            setTripHistory([]);
            setTripHistoryPage(1);
          }
          return;
        }
        const { records, error } = await fetchBranchTripHistory(branchName);
        if (cancelled) return;
        if (error) {
          setTripHistoryError(error);
          setTripHistory([]);
        } else {
          setTripHistory(records);
          setTripHistoryPage(1);
        }
      } catch (e) {
        if (!cancelled) {
          setTripHistoryError(e instanceof Error ? e.message : 'Failed to load trip history');
          setTripHistory([]);
        }
      } finally {
        if (!cancelled) setTripHistoryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [employee, tab, employeeDashboardRoles]);

  useEffect(() => {
    if (!employee || tab !== 'requests' || !employeeHasWarehouseDetailTabs(employeeDashboardRoles)) return;
    let cancelled = false;
    (async () => {
      setWarehouseRequestsLoading(true);
      setWarehouseRequestsError(null);
      try {
        const bundle = await fetchWarehouseManagerRequests(employee.id);
        if (!cancelled) {
          setWarehouseProductionRequests(bundle.productionRequests);
          setWarehousePurchaseOrders(bundle.purchaseOrders);
          setWarehousePrPage(1);
          setWarehousePoPage(1);
        }
      } catch (e) {
        if (!cancelled) {
          setWarehouseRequestsError(e instanceof Error ? e.message : 'Failed to load requests');
          setWarehouseProductionRequests([]);
          setWarehousePurchaseOrders([]);
        }
      } finally {
        if (!cancelled) setWarehouseRequestsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [employee, tab, employeeDashboardRoles]);

  useEffect(() => {
    if (!employee || tab !== 'catalog' || !employeeHasWarehouseDetailTabs(employeeDashboardRoles)) return;
    let cancelled = false;
    (async () => {
      setCatalogLoading(true);
      setCatalogError(null);
      try {
        const [catalog, ids] = await Promise.all([
          fetchWarehouseAssignmentCatalog(employee.branchName),
          fetchWarehouseAssignmentIds(employee.id),
        ]);
        if (cancelled) return;
        setCatalogProducts(catalog.products);
        setCatalogMaterials(catalog.materials);
        setSelectedProductIds(new Set(ids.productIds));
        setSelectedMaterialIds(new Set(ids.materialIds));
      } catch (e) {
        if (!cancelled) {
          setCatalogError(e instanceof Error ? e.message : 'Failed to load catalog assignments');
          setCatalogProducts([]);
          setCatalogMaterials([]);
          setSelectedProductIds(new Set());
          setSelectedMaterialIds(new Set());
        }
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [employee, tab, employeeDashboardRoles]);

  const catalogProductGroups = useMemo(() => {
    const groups = new Map<string, { categoryId: string; categoryName: string; items: WarehouseCatalogProduct[] }>();
    for (const item of catalogProducts) {
      const existing = groups.get(item.categoryId) ?? {
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        items: [],
      };
      existing.items.push(item);
      groups.set(item.categoryId, existing);
    }
    return [...groups.values()].sort((a, b) => a.categoryName.localeCompare(b.categoryName));
  }, [catalogProducts]);

  const catalogMaterialGroups = useMemo(() => {
    const groups = new Map<string, { categoryId: string; categoryName: string; items: WarehouseCatalogMaterial[] }>();
    for (const item of catalogMaterials) {
      const existing = groups.get(item.categoryId) ?? {
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        items: [],
      };
      existing.items.push(item);
      groups.set(item.categoryId, existing);
    }
    return [...groups.values()].sort((a, b) => a.categoryName.localeCompare(b.categoryName));
  }, [catalogMaterials]);

  const activeCatalogProductGroup = useMemo(
    () => catalogProductGroups.find(group => group.categoryId === catalogProductCategoryId) ?? null,
    [catalogProductGroups, catalogProductCategoryId],
  );

  const activeCatalogMaterialGroup = useMemo(
    () => catalogMaterialGroups.find(group => group.categoryId === catalogMaterialCategoryId) ?? null,
    [catalogMaterialGroups, catalogMaterialCategoryId],
  );

  const visibleCatalogProducts = useMemo(() => {
    if (!activeCatalogProductGroup) return [];
    const q = catalogSearch.trim().toLowerCase();
    if (!q) return activeCatalogProductGroup.items;
    return activeCatalogProductGroup.items.filter(item => item.name.toLowerCase().includes(q));
  }, [activeCatalogProductGroup, catalogSearch]);

  const visibleCatalogMaterials = useMemo(() => {
    if (!activeCatalogMaterialGroup) return [];
    const q = catalogSearch.trim().toLowerCase();
    if (!q) return activeCatalogMaterialGroup.items;
    return activeCatalogMaterialGroup.items.filter(item =>
      [item.name, item.sku].some(v => v.toLowerCase().includes(q)),
    );
  }, [activeCatalogMaterialGroup, catalogSearch]);

  useEffect(() => {
    if (catalogProductGroups.length === 0) {
      setCatalogProductCategoryId('');
      return;
    }
    if (!catalogProductCategoryId || !catalogProductGroups.some(g => g.categoryId === catalogProductCategoryId)) {
      setCatalogProductCategoryId(catalogProductGroups[0]!.categoryId);
    }
  }, [catalogProductGroups, catalogProductCategoryId]);

  useEffect(() => {
    if (catalogMaterialGroups.length === 0) {
      setCatalogMaterialCategoryId('');
      return;
    }
    if (!catalogMaterialCategoryId || !catalogMaterialGroups.some(g => g.categoryId === catalogMaterialCategoryId)) {
      setCatalogMaterialCategoryId(catalogMaterialGroups[0]!.categoryId);
    }
  }, [catalogMaterialGroups, catalogMaterialCategoryId]);

  const toggleProductAssignment = (productId: string, checked: boolean) => {
    setSelectedProductIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(productId);
      else next.delete(productId);
      return next;
    });
  };

  const toggleMaterialAssignment = (materialId: string, checked: boolean) => {
    setSelectedMaterialIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(materialId);
      else next.delete(materialId);
      return next;
    });
  };

  const toggleProductCategoryAssignment = (items: WarehouseCatalogProduct[], checked: boolean) => {
    setSelectedProductIds(prev => {
      const next = new Set(prev);
      for (const item of items) {
        if (checked) next.add(item.id);
        else next.delete(item.id);
      }
      return next;
    });
  };

  const toggleMaterialCategoryAssignment = (items: WarehouseCatalogMaterial[], checked: boolean) => {
    setSelectedMaterialIds(prev => {
      const next = new Set(prev);
      for (const item of items) {
        if (checked) next.add(item.id);
        else next.delete(item.id);
      }
      return next;
    });
  };

  const handleSaveCatalogAssignments = async () => {
    if (!employee) return;
    setCatalogSaving(true);
    setCatalogError(null);
    try {
      await saveWarehouseAssignments(employee.id, [...selectedProductIds], [...selectedMaterialIds]);
      addAuditLog(
        'Catalog access updated',
        'Employee',
        `${employee.employeeName}: ${selectedProductIds.size} product families, ${selectedMaterialIds.size} raw materials`,
      );
      if (sessionEmployeeId === employee.id) {
        await refreshWarehouseScope();
      }
    } catch (e) {
      setCatalogError(e instanceof Error ? e.message : 'Failed to save catalog access');
    } finally {
      setCatalogSaving(false);
    }
  };

  useEffect(() => {
    if (!employee?.id) return;
    let cancelled = false;
    setOrderPermLoading(true);
    setOrderPermError(null);
    setOrderPermSaveSuccess(false);
    void (async () => {
      try {
        const perms = await fetchEmployeeOrderPermissions(employee.id);
        if (!cancelled) {
          setOrderPermDraft(perms);
          setOrderPermSaved(perms);
        }
      } catch (e) {
        if (!cancelled) {
          setOrderPermError(e instanceof Error ? e.message : 'Failed to load permissions');
          const fallback = { ...ALL_ORDER_PERMISSIONS_GRANTED };
          setOrderPermDraft(fallback);
          setOrderPermSaved(fallback);
        }
      } finally {
        if (!cancelled) setOrderPermLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [employee?.id]);

  useEffect(() => {
    if (!employee?.id) return;
    let cancelled = false;
    setProductPermLoading(true);
    setProductPermError(null);
    setProductPermSaveSuccess(false);
    void (async () => {
      try {
        const perms = await fetchEmployeeProductPermissions(employee.id);
        if (!cancelled) {
          setProductPermDraft(perms);
          setProductPermSaved(perms);
        }
      } catch (e) {
        if (!cancelled) {
          setProductPermError(e instanceof Error ? e.message : 'Failed to load permissions');
          const fallback = { ...ALL_PRODUCT_PERMISSIONS_GRANTED };
          setProductPermDraft(fallback);
          setProductPermSaved(fallback);
        }
      } finally {
        if (!cancelled) setProductPermLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [employee?.id]);

  useEffect(() => {
    if (!employee?.id) return;
    let cancelled = false;
    setMaterialPermLoading(true);
    setMaterialPermError(null);
    setMaterialPermSaveSuccess(false);
    void (async () => {
      try {
        const perms = await fetchEmployeeMaterialPermissions(employee.id);
        if (!cancelled) {
          setMaterialPermDraft(perms);
          setMaterialPermSaved(perms);
        }
      } catch (e) {
        if (!cancelled) {
          setMaterialPermError(e instanceof Error ? e.message : 'Failed to load permissions');
          const fallback = { ...ALL_MATERIAL_PERMISSIONS_GRANTED };
          setMaterialPermDraft(fallback);
          setMaterialPermSaved(fallback);
        }
      } finally {
        if (!cancelled) setMaterialPermLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [employee?.id]);

  useEffect(() => {
    if (!employee?.id) return;
    let cancelled = false;
    setWarehousePermLoading(true);
    setWarehousePermError(null);
    setWarehousePermSaveSuccess(false);
    void (async () => {
      try {
        const perms = await fetchEmployeeWarehousePermissions(employee.id);
        if (!cancelled) {
          setWarehousePermDraft(perms);
          setWarehousePermSaved(perms);
        }
      } catch (e) {
        if (!cancelled) {
          setWarehousePermError(e instanceof Error ? e.message : 'Failed to load permissions');
          const fallback = { ...ALL_WAREHOUSE_PERMISSIONS_GRANTED };
          setWarehousePermDraft(fallback);
          setWarehousePermSaved(fallback);
        }
      } finally {
        if (!cancelled) setWarehousePermLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [employee?.id]);

  useEffect(() => {
    if (!employee?.id) return;
    let cancelled = false;
    setLogisticsPermLoading(true);
    setLogisticsPermError(null);
    setLogisticsPermSaveSuccess(false);
    void (async () => {
      try {
        const perms = await fetchEmployeeLogisticsPermissions(employee.id);
        if (!cancelled) {
          setLogisticsPermDraft(perms);
          setLogisticsPermSaved(perms);
        }
      } catch (e) {
        if (!cancelled) {
          setLogisticsPermError(e instanceof Error ? e.message : 'Failed to load permissions');
          const fallback = { ...ALL_LOGISTICS_PERMISSIONS_GRANTED };
          setLogisticsPermDraft(fallback);
          setLogisticsPermSaved(fallback);
        }
      } finally {
        if (!cancelled) setLogisticsPermLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [employee?.id]);

  useEffect(() => {
    if (!employee?.id) return;
    let cancelled = false;
    setSupplierPermLoading(true);
    setSupplierPermError(null);
    setSupplierPermSaveSuccess(false);
    void (async () => {
      try {
        const perms = await fetchEmployeeSupplierPermissions(employee.id);
        if (!cancelled) {
          setSupplierPermDraft(perms);
          setSupplierPermSaved(perms);
        }
      } catch (e) {
        if (!cancelled) {
          setSupplierPermError(e instanceof Error ? e.message : 'Failed to load permissions');
          const fallback = { ...ALL_SUPPLIER_PERMISSIONS_GRANTED };
          setSupplierPermDraft(fallback);
          setSupplierPermSaved(fallback);
        }
      } finally {
        if (!cancelled) setSupplierPermLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [employee?.id]);

  useEffect(() => {
    if (!employee?.id) return;
    let cancelled = false;
    setCustomerPermLoading(true);
    setCustomerPermError(null);
    setCustomerPermSaveSuccess(false);
    void (async () => {
      try {
        const perms = await fetchEmployeeCustomerPermissions(employee.id);
        if (!cancelled) {
          setCustomerPermDraft(perms);
          setCustomerPermSaved(perms);
        }
      } catch (e) {
        if (!cancelled) {
          setCustomerPermError(e instanceof Error ? e.message : 'Failed to load permissions');
          const fallback = { ...ALL_CUSTOMER_PERMISSIONS_DENIED };
          setCustomerPermDraft(fallback);
          setCustomerPermSaved(fallback);
        }
      } finally {
        if (!cancelled) setCustomerPermLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [employee?.id]);

  useEffect(() => {
    if (!employee?.id) return;
    let cancelled = false;
    setFinancePermLoading(true);
    setFinancePermError(null);
    setFinancePermSaveSuccess(false);
    void (async () => {
      try {
        const perms = await fetchEmployeeFinancePermissions(employee.id);
        if (!cancelled) {
          setFinancePermDraft(perms);
          setFinancePermSaved(perms);
        }
      } catch (e) {
        if (!cancelled) {
          setFinancePermError(e instanceof Error ? e.message : 'Failed to load permissions');
          const fallback = { ...ALL_FINANCE_PERMISSIONS_GRANTED };
          setFinancePermDraft(fallback);
          setFinancePermSaved(fallback);
        }
      } finally {
        if (!cancelled) setFinancePermLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [employee?.id]);

  useEffect(() => {
    if (!employee?.id) return;
    let cancelled = false;
    setEmployeesPermLoading(true);
    setEmployeesPermError(null);
    setEmployeesPermSaveSuccess(false);
    void (async () => {
      try {
        const perms = await fetchEmployeeEmployeesPermissions(employee.id);
        if (!cancelled) {
          setEmployeesPermDraft(perms);
          setEmployeesPermSaved(perms);
        }
      } catch (e) {
        if (!cancelled) {
          setEmployeesPermError(e instanceof Error ? e.message : 'Failed to load permissions');
          const fallback = { ...ALL_EMPLOYEES_PERMISSIONS_GRANTED };
          setEmployeesPermDraft(fallback);
          setEmployeesPermSaved(fallback);
        }
      } finally {
        if (!cancelled) setEmployeesPermLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [employee?.id]);

  useEffect(() => {
    if (!employee?.id) return;
    let cancelled = false;
    setAgentAnalyticsPermLoading(true);
    setAgentAnalyticsPermError(null);
    setAgentAnalyticsPermSaveSuccess(false);
    void (async () => {
      try {
        const perms = await fetchEmployeeAgentAnalyticsPermissions(employee.id);
        if (!cancelled) {
          setAgentAnalyticsPermDraft(perms);
          setAgentAnalyticsPermSaved(perms);
        }
      } catch (e) {
        if (!cancelled) {
          setAgentAnalyticsPermError(e instanceof Error ? e.message : 'Failed to load permissions');
          const fallback = { ...ALL_AGENT_ANALYTICS_PERMISSIONS_GRANTED };
          setAgentAnalyticsPermDraft(fallback);
          setAgentAnalyticsPermSaved(fallback);
        }
      } finally {
        if (!cancelled) setAgentAnalyticsPermLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [employee?.id]);

  useEffect(() => {
    if (!employee?.id) return;
    let cancelled = false;
    setReportsPermLoading(true);
    setReportsPermError(null);
    setReportsPermSaveSuccess(false);
    void (async () => {
      try {
        const perms = await fetchEmployeeReportsPermissions(employee.id);
        if (!cancelled) {
          setReportsPermDraft(perms);
          setReportsPermSaved(perms);
        }
      } catch (e) {
        if (!cancelled) {
          setReportsPermError(e instanceof Error ? e.message : 'Failed to load permissions');
          const fallback = { ...ALL_REPORTS_PERMISSIONS_GRANTED };
          setReportsPermDraft(fallback);
          setReportsPermSaved(fallback);
        }
      } finally {
        if (!cancelled) setReportsPermLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [employee?.id]);

  useEffect(() => {
    if (!employee?.id) return;
    let cancelled = false;
    setSettingsPermLoading(true);
    setSettingsPermError(null);
    setSettingsPermSaveSuccess(false);
    void (async () => {
      try {
        const perms = await fetchEmployeeSettingsPermissions(employee.id);
        if (!cancelled) {
          setSettingsPermDraft(perms);
          setSettingsPermSaved(perms);
        }
      } catch (e) {
        if (!cancelled) {
          setSettingsPermError(e instanceof Error ? e.message : 'Failed to load permissions');
          const fallback = { ...ALL_SETTINGS_PERMISSIONS_GRANTED };
          setSettingsPermDraft(fallback);
          setSettingsPermSaved(fallback);
        }
      } finally {
        if (!cancelled) setSettingsPermLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [employee?.id]);

  useEffect(() => {
    if (!employee?.id) return;
    let cancelled = false;
    setProductionRequestPermLoading(true);
    setProductionRequestPermError(null);
    setProductionRequestPermSaveSuccess(false);
    void (async () => {
      try {
        const perms = await fetchEmployeeProductionRequestPermissions(employee.id);
        if (!cancelled) {
          setProductionRequestPermDraft(perms);
          setProductionRequestPermSaved(perms);
        }
      } catch (e) {
        if (!cancelled) {
          setProductionRequestPermError(e instanceof Error ? e.message : 'Failed to load permissions');
          const fallback = { ...ALL_PRODUCTION_REQUEST_PERMISSIONS_GRANTED };
          setProductionRequestPermDraft(fallback);
          setProductionRequestPermSaved(fallback);
        }
      } finally {
        if (!cancelled) setProductionRequestPermLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [employee?.id]);

  useEffect(() => {
    if (!employee?.id) return;
    let cancelled = false;
    setPurchaseOrderPermLoading(true);
    setPurchaseOrderPermError(null);
    setPurchaseOrderPermSaveSuccess(false);
    void (async () => {
      try {
        const perms = await fetchEmployeePurchaseOrderPermissions(employee.id);
        if (!cancelled) {
          setPurchaseOrderPermDraft(perms);
          setPurchaseOrderPermSaved(perms);
        }
      } catch (e) {
        if (!cancelled) {
          setPurchaseOrderPermError(e instanceof Error ? e.message : 'Failed to load permissions');
          const fallback = { ...ALL_PURCHASE_ORDER_PERMISSIONS_GRANTED };
          setPurchaseOrderPermDraft(fallback);
          setPurchaseOrderPermSaved(fallback);
        }
      } finally {
        if (!cancelled) setPurchaseOrderPermLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [employee?.id]);

  useEffect(() => {
    if (!employee?.id) return;
    let cancelled = false;
    setInterBranchRequestPermLoading(true);
    setInterBranchRequestPermError(null);
    setInterBranchRequestPermSaveSuccess(false);
    void (async () => {
      try {
        const perms = await fetchEmployeeInterBranchRequestPermissions(employee.id);
        if (!cancelled) {
          setInterBranchRequestPermDraft(perms);
          setInterBranchRequestPermSaved(perms);
        }
      } catch (e) {
        if (!cancelled) {
          setInterBranchRequestPermError(e instanceof Error ? e.message : 'Failed to load permissions');
          const fallback = { ...ALL_INTER_BRANCH_REQUEST_PERMISSIONS_GRANTED };
          setInterBranchRequestPermDraft(fallback);
          setInterBranchRequestPermSaved(fallback);
        }
      } finally {
        if (!cancelled) setInterBranchRequestPermLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [employee?.id]);

  const reloadAllPermissionDrafts = useCallback(async (employeeId: string) => {
    const [
      orders,
      products,
      materials,
      warehouse,
      productionRequest,
      purchaseOrder,
      interBranchRequest,
      logistics,
      suppliers,
      customers,
      finance,
      employeesPerms,
      agentAnalytics,
      reports,
      settings,
    ] = await Promise.all([
      fetchEmployeeOrderPermissions(employeeId),
      fetchEmployeeProductPermissions(employeeId),
      fetchEmployeeMaterialPermissions(employeeId),
      fetchEmployeeWarehousePermissions(employeeId),
      fetchEmployeeProductionRequestPermissions(employeeId),
      fetchEmployeePurchaseOrderPermissions(employeeId),
      fetchEmployeeInterBranchRequestPermissions(employeeId),
      fetchEmployeeLogisticsPermissions(employeeId),
      fetchEmployeeSupplierPermissions(employeeId),
      fetchEmployeeCustomerPermissions(employeeId),
      fetchEmployeeFinancePermissions(employeeId),
      fetchEmployeeEmployeesPermissions(employeeId),
      fetchEmployeeAgentAnalyticsPermissions(employeeId),
      fetchEmployeeReportsPermissions(employeeId),
      fetchEmployeeSettingsPermissions(employeeId),
    ]);
    setOrderPermDraft(orders);
    setOrderPermSaved(orders);
    setProductPermDraft(products);
    setProductPermSaved(products);
    setMaterialPermDraft(materials);
    setMaterialPermSaved(materials);
    setWarehousePermDraft(warehouse);
    setWarehousePermSaved(warehouse);
    setProductionRequestPermDraft(productionRequest);
    setProductionRequestPermSaved(productionRequest);
    setPurchaseOrderPermDraft(purchaseOrder);
    setPurchaseOrderPermSaved(purchaseOrder);
    setInterBranchRequestPermDraft(interBranchRequest);
    setInterBranchRequestPermSaved(interBranchRequest);
    setLogisticsPermDraft(logistics);
    setLogisticsPermSaved(logistics);
    setSupplierPermDraft(suppliers);
    setSupplierPermSaved(suppliers);
    setCustomerPermDraft(customers);
    setCustomerPermSaved(customers);
    setFinancePermDraft(finance);
    setFinancePermSaved(finance);
    setEmployeesPermDraft(employeesPerms);
    setEmployeesPermSaved(employeesPerms);
    setAgentAnalyticsPermDraft(agentAnalytics);
    setAgentAnalyticsPermSaved(agentAnalytics);
    setReportsPermDraft(reports);
    setReportsPermSaved(reports);
    setSettingsPermDraft(settings);
    setSettingsPermSaved(settings);
  }, []);

  const handleApplyRoleDefaults = async () => {
    if (!employee) return;
    setRoleDefaultsApplying(true);
    setRoleDefaultsError(null);
    setRoleDefaultsMessage(null);
    try {
      const legacyRole = (employee.loginAccount?.userRole as UserRole | null) ?? null;
      const { roles } = await resolveEmployeeDashboardRoles(employee.id, legacyRole, employee.role);
      if (roles.length === 0) {
        throw new Error('No dashboard role found for this employee. Set a dashboard role or HR role first.');
      }
      if (!rolesHaveDefaultTemplates(roles)) {
        throw new Error(`No permission template is defined for: ${roles.join(', ')}`);
      }
      await applyDefaultPermissionsForRoles(employee.id, roles);
      await reloadAllPermissionDrafts(employee.id);
      setRoleDefaultsMessage(`Applied default permissions for ${roles.join(' + ')}.`);
      addAuditLog(
        'Role default permissions applied',
        'Employee',
        `${employee.employeeName} (${employee.employeeId})`,
      );
      if (sessionEmployeeId === employee.id) {
        await Promise.all([
          refreshOrderPermissions(),
          refreshProductPermissions(),
          refreshMaterialPermissions(),
          refreshWarehousePermissions(),
          refreshProductionRequestPermissions(),
          refreshPurchaseOrderPermissions(),
          refreshInterBranchRequestPermissions(),
          refreshLogisticsPermissions(),
          refreshSupplierPermissions(),
          refreshCustomerPermissions(),
          refreshFinancePermissions(),
          refreshEmployeesPermissions(),
          refreshAgentAnalyticsPermissions(),
          refreshReportsPermissions(),
          refreshSettingsPermissions(),
        ]);
      }
    } catch (e) {
      setRoleDefaultsError(e instanceof Error ? e.message : 'Failed to apply role defaults');
    } finally {
      setRoleDefaultsApplying(false);
    }
  };

  const handleSaveOrderPermissions = async () => {
    if (!employee) return;
    setOrderPermSaving(true);
    setOrderPermError(null);
    setOrderPermSaveSuccess(false);
    try {
      await saveEmployeeOrderPermissions(employee.id, orderPermDraft);
      setOrderPermSaved({ ...orderPermDraft });
      setOrderPermSaveSuccess(true);
      addAuditLog(
        'Order permissions updated',
        'Employee',
        `${employee.employeeName} (${employee.employeeId})`,
      );
      if (sessionEmployeeId === employee.id) {
        await refreshOrderPermissions();
      }
    } catch (e) {
      setOrderPermError(e instanceof Error ? e.message : 'Failed to save permissions');
    } finally {
      setOrderPermSaving(false);
    }
  };

  const handleSaveProductPermissions = async () => {
    if (!employee) return;
    setProductPermSaving(true);
    setProductPermError(null);
    setProductPermSaveSuccess(false);
    try {
      await saveEmployeeProductPermissions(employee.id, productPermDraft);
      setProductPermSaved({ ...productPermDraft });
      setProductPermSaveSuccess(true);
      addAuditLog(
        'Product permissions updated',
        'Employee',
        `${employee.employeeName} (${employee.employeeId})`,
      );
      if (sessionEmployeeId === employee.id) {
        await refreshProductPermissions();
      }
    } catch (e) {
      setProductPermError(e instanceof Error ? e.message : 'Failed to save permissions');
    } finally {
      setProductPermSaving(false);
    }
  };

  const handleSaveMaterialPermissions = async () => {
    if (!employee) return;
    setMaterialPermSaving(true);
    setMaterialPermError(null);
    setMaterialPermSaveSuccess(false);
    try {
      await saveEmployeeMaterialPermissions(employee.id, materialPermDraft);
      setMaterialPermSaved({ ...materialPermDraft });
      setMaterialPermSaveSuccess(true);
      addAuditLog(
        'Material permissions updated',
        'Employee',
        `${employee.employeeName} (${employee.employeeId})`,
      );
      if (sessionEmployeeId === employee.id) {
        await refreshMaterialPermissions();
      }
    } catch (e) {
      setMaterialPermError(e instanceof Error ? e.message : 'Failed to save permissions');
    } finally {
      setMaterialPermSaving(false);
    }
  };

  const handleSaveWarehousePermissions = async () => {
    if (!employee) return;
    setWarehousePermSaving(true);
    setWarehousePermError(null);
    setWarehousePermSaveSuccess(false);
    try {
      await saveEmployeeWarehousePermissions(employee.id, warehousePermDraft);
      setWarehousePermSaved({ ...warehousePermDraft });
      setWarehousePermSaveSuccess(true);
      addAuditLog('Warehouse permissions updated', 'Employee', `${employee.employeeName} (${employee.employeeId})`);
      if (sessionEmployeeId === employee.id) await refreshWarehousePermissions();
    } catch (e) {
      setWarehousePermError(e instanceof Error ? e.message : 'Failed to save permissions');
    } finally {
      setWarehousePermSaving(false);
    }
  };

  const handleSaveLogisticsPermissions = async () => {
    if (!employee) return;
    setLogisticsPermSaving(true);
    setLogisticsPermError(null);
    setLogisticsPermSaveSuccess(false);
    try {
      await saveEmployeeLogisticsPermissions(employee.id, logisticsPermDraft);
      setLogisticsPermSaved({ ...logisticsPermDraft });
      setLogisticsPermSaveSuccess(true);
      addAuditLog('Logistics permissions updated', 'Employee', `${employee.employeeName} (${employee.employeeId})`);
      if (sessionEmployeeId === employee.id) await refreshLogisticsPermissions();
    } catch (e) {
      setLogisticsPermError(e instanceof Error ? e.message : 'Failed to save permissions');
    } finally {
      setLogisticsPermSaving(false);
    }
  };

  const handleSaveSupplierPermissions = async () => {
    if (!employee) return;
    setSupplierPermSaving(true);
    setSupplierPermError(null);
    setSupplierPermSaveSuccess(false);
    try {
      await saveEmployeeSupplierPermissions(employee.id, supplierPermDraft);
      setSupplierPermSaved({ ...supplierPermDraft });
      setSupplierPermSaveSuccess(true);
      addAuditLog('Supplier permissions updated', 'Employee', `${employee.employeeName} (${employee.employeeId})`);
      if (sessionEmployeeId === employee.id) await refreshSupplierPermissions();
    } catch (e) {
      setSupplierPermError(e instanceof Error ? e.message : 'Failed to save permissions');
    } finally {
      setSupplierPermSaving(false);
    }
  };

  const handleSaveCustomerPermissions = async () => {
    if (!employee) return;
    setCustomerPermSaving(true);
    setCustomerPermError(null);
    setCustomerPermSaveSuccess(false);
    try {
      await saveEmployeeCustomerPermissions(employee.id, customerPermDraft);
      setCustomerPermSaved({ ...customerPermDraft });
      setCustomerPermSaveSuccess(true);
      addAuditLog('Customer permissions updated', 'Employee', `${employee.employeeName} (${employee.employeeId})`);
      if (sessionEmployeeId === employee.id) await refreshCustomerPermissions();
    } catch (e) {
      setCustomerPermError(e instanceof Error ? e.message : 'Failed to save permissions');
    } finally {
      setCustomerPermSaving(false);
    }
  };

  const handleSaveFinancePermissions = async () => {
    if (!employee) return;
    setFinancePermSaving(true);
    setFinancePermError(null);
    setFinancePermSaveSuccess(false);
    try {
      await saveEmployeeFinancePermissions(employee.id, financePermDraft);
      setFinancePermSaved({ ...financePermDraft });
      setFinancePermSaveSuccess(true);
      addAuditLog('Finance permissions updated', 'Employee', `${employee.employeeName} (${employee.employeeId})`);
      if (sessionEmployeeId === employee.id) await refreshFinancePermissions();
    } catch (e) {
      setFinancePermError(e instanceof Error ? e.message : 'Failed to save permissions');
    } finally {
      setFinancePermSaving(false);
    }
  };

  const handleSaveEmployeesPermissions = async () => {
    if (!employee) return;
    setEmployeesPermSaving(true);
    setEmployeesPermError(null);
    setEmployeesPermSaveSuccess(false);
    try {
      await saveEmployeeEmployeesPermissions(employee.id, employeesPermDraft);
      setEmployeesPermSaved({ ...employeesPermDraft });
      setEmployeesPermSaveSuccess(true);
      addAuditLog('Employees permissions updated', 'Employee', `${employee.employeeName} (${employee.employeeId})`);
      if (sessionEmployeeId === employee.id) await refreshEmployeesPermissions();
    } catch (e) {
      setEmployeesPermError(e instanceof Error ? e.message : 'Failed to save permissions');
    } finally {
      setEmployeesPermSaving(false);
    }
  };

  const handleSaveAgentAnalyticsPermissions = async () => {
    if (!employee) return;
    setAgentAnalyticsPermSaving(true);
    setAgentAnalyticsPermError(null);
    setAgentAnalyticsPermSaveSuccess(false);
    try {
      await saveEmployeeAgentAnalyticsPermissions(employee.id, agentAnalyticsPermDraft);
      setAgentAnalyticsPermSaved({ ...agentAnalyticsPermDraft });
      setAgentAnalyticsPermSaveSuccess(true);
      addAuditLog('Agent Analytics permissions updated', 'Employee', `${employee.employeeName} (${employee.employeeId})`);
      if (sessionEmployeeId === employee.id) await refreshAgentAnalyticsPermissions();
    } catch (e) {
      setAgentAnalyticsPermError(e instanceof Error ? e.message : 'Failed to save permissions');
    } finally {
      setAgentAnalyticsPermSaving(false);
    }
  };

  const handleSaveReportsPermissions = async () => {
    if (!employee) return;
    setReportsPermSaving(true);
    setReportsPermError(null);
    setReportsPermSaveSuccess(false);
    try {
      await saveEmployeeReportsPermissions(employee.id, reportsPermDraft);
      setReportsPermSaved({ ...reportsPermDraft });
      setReportsPermSaveSuccess(true);
      addAuditLog('Reports permissions updated', 'Employee', `${employee.employeeName} (${employee.employeeId})`);
      if (sessionEmployeeId === employee.id) await refreshReportsPermissions();
    } catch (e) {
      setReportsPermError(e instanceof Error ? e.message : 'Failed to save permissions');
    } finally {
      setReportsPermSaving(false);
    }
  };

  const handleSaveSettingsPermissions = async () => {
    if (!employee) return;
    setSettingsPermSaving(true);
    setSettingsPermError(null);
    setSettingsPermSaveSuccess(false);
    try {
      await saveEmployeeSettingsPermissions(employee.id, settingsPermDraft);
      setSettingsPermSaved({ ...settingsPermDraft });
      setSettingsPermSaveSuccess(true);
      addAuditLog('Settings permissions updated', 'Employee', `${employee.employeeName} (${employee.employeeId})`);
      if (sessionEmployeeId === employee.id) await refreshSettingsPermissions();
    } catch (e) {
      setSettingsPermError(e instanceof Error ? e.message : 'Failed to save permissions');
    } finally {
      setSettingsPermSaving(false);
    }
  };

  const handleSaveProductionRequestPermissions = async () => {
    if (!employee) return;
    setProductionRequestPermSaving(true);
    setProductionRequestPermError(null);
    setProductionRequestPermSaveSuccess(false);
    try {
      await saveEmployeeProductionRequestPermissions(employee.id, productionRequestPermDraft);
      setProductionRequestPermSaved({ ...productionRequestPermDraft });
      setProductionRequestPermSaveSuccess(true);
      addAuditLog('Production request permissions updated', 'Employee', `${employee.employeeName} (${employee.employeeId})`);
      if (sessionEmployeeId === employee.id) await refreshProductionRequestPermissions();
    } catch (e) {
      setProductionRequestPermError(e instanceof Error ? e.message : 'Failed to save permissions');
    } finally {
      setProductionRequestPermSaving(false);
    }
  };

  const handleSavePurchaseOrderPermissions = async () => {
    if (!employee) return;
    setPurchaseOrderPermSaving(true);
    setPurchaseOrderPermError(null);
    setPurchaseOrderPermSaveSuccess(false);
    try {
      await saveEmployeePurchaseOrderPermissions(employee.id, purchaseOrderPermDraft);
      setPurchaseOrderPermSaved({ ...purchaseOrderPermDraft });
      setPurchaseOrderPermSaveSuccess(true);
      addAuditLog('Purchase order permissions updated', 'Employee', `${employee.employeeName} (${employee.employeeId})`);
      if (sessionEmployeeId === employee.id) await refreshPurchaseOrderPermissions();
    } catch (e) {
      setPurchaseOrderPermError(e instanceof Error ? e.message : 'Failed to save permissions');
    } finally {
      setPurchaseOrderPermSaving(false);
    }
  };

  const handleSaveInterBranchRequestPermissions = async () => {
    if (!employee) return;
    setInterBranchRequestPermSaving(true);
    setInterBranchRequestPermError(null);
    setInterBranchRequestPermSaveSuccess(false);
    try {
      await saveEmployeeInterBranchRequestPermissions(employee.id, interBranchRequestPermDraft);
      setInterBranchRequestPermSaved({ ...interBranchRequestPermDraft });
      setInterBranchRequestPermSaveSuccess(true);
      addAuditLog('Inter-branch request permissions updated', 'Employee', `${employee.employeeName} (${employee.employeeId})`);
      if (sessionEmployeeId === employee.id) await refreshInterBranchRequestPermissions();
    } catch (e) {
      setInterBranchRequestPermError(e instanceof Error ? e.message : 'Failed to save permissions');
    } finally {
      setInterBranchRequestPermSaving(false);
    }
  };

  const p = profile ?? emptyProfileState();

  if (!employeesModulePerms.pageAccess) {
    return <ModuleAccessDenied moduleName="Employees" />;
  }

  if (loading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[40vh] text-gray-500 gap-3">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="text-sm">Loading employee…</p>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <EntityNotFound
        {...NOT_FOUND_COPY.employee}
        description={error ?? NOT_FOUND_COPY.employee.description}
      />
    );
  }

  const joinLabel = employee.joinDate
    ? new Date(employee.joinDate).toLocaleDateString('en-PH', {
        dateStyle: 'medium',
      })
    : '—';

  const renderTabContent = () => {
    switch (tab) {
      case 'overview': {
        const per = p.personal;
        const ageYears = per?.age ?? ageFromDateOfBirth(per?.date_of_birth ?? null);
        const dobDisplay =
          per?.date_of_birth != null && per.date_of_birth !== ''
            ? `${new Date(per.date_of_birth + 'T12:00:00').toLocaleDateString('en-PH', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}${ageYears != null ? ` (${ageYears} years old)` : ''}`
            : null;

        return (
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" aria-hidden />
                  Personal Information
                </h2>
                {!editOverview ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      setOvDob(per?.date_of_birth?.slice(0, 10) ?? '');
                      setOvGender(per?.gender ?? '');
                      setOvNationality(per?.nationality ?? '');
                      setOvCivil(per?.civil_status ?? '');
                      setOvReligion(per?.religion ?? '');
                      setOvBlood(per?.blood_type ?? '');
                      setOvRoleAssignment({
                        roles: [...employeeDashboardRoles],
                        primaryRole: employeePrimaryDashboardRole,
                      });
                      setEditOverview(true);
                    }}
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setEditOverview(false)}>
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      disabled={savingSection === 'overview'}
                      onClick={() => {
                        void (async () => {
                          setSavingSection('overview');
                          try {
                            const dashboardRoles = ovRoleAssignment.roles;
                            const primaryRole = ovRoleAssignment.primaryRole;
                            if (dashboardRoles.length === 0 || !primaryRole) {
                              window.alert('Select at least one app dashboard role.');
                              return;
                            }
                            await upsertEmployeePersonalInfo(employee.id, {
                              date_of_birth: ovDob || null,
                              gender: ovGender || null,
                              nationality: ovNationality || null,
                              civil_status: ovCivil || null,
                              religion: ovReligion || null,
                              blood_type: ovBlood || null,
                            });
                            await saveEmployeeUserRoles(employee.id, dashboardRoles, primaryRole);
                            setEmployeeDashboardRoles(dashboardRoles);
                            setEmployeePrimaryDashboardRole(primaryRole);
                            addAuditLog(
                              'Employee profile',
                              'Employee',
                              `Updated personal info and dashboard roles for ${employee.employeeName} (${employee.employeeId})`,
                            );
                            setEditOverview(false);
                            await refreshProfileFromServer();
                            await reloadEmployeeHeader();
                          } catch (e) {
                            window.alert(e instanceof Error ? e.message : 'Save failed');
                          } finally {
                            setSavingSection(null);
                          }
                        })();
                      }}
                    >
                      {savingSection === 'overview' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-1" />
                          Saving…
                        </>
                      ) : (
                        'Save'
                      )}
                    </Button>
                  </div>
                )}
              </div>
              {!editOverview ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5 text-sm">
                  <div className="space-y-5">
                    {overviewField('Date of Birth', dobDisplay)}
                    {overviewField('Civil Status', per?.civil_status)}
                    {overviewField('Religion', per?.religion)}
                    {overviewField('Job title', p.employment?.position)}
                  </div>
                  <div className="space-y-5">
                    {overviewField('Gender', per?.gender)}
                    {overviewField('Nationality', per?.nationality)}
                    {overviewField('Blood Type', per?.blood_type)}
                  </div>
                  <div className="md:col-span-2">
                    {dashboardRolesOverviewField(employeeDashboardRoles, employeePrimaryDashboardRole)}
                  </div>
                </div>
              ) : (
                <div className="space-y-5 text-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">Date of birth</label>
                      <input
                        type="date"
                        className={EDIT_INPUT_CLASS}
                        value={ovDob}
                        onChange={(e) => setOvDob(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">Civil status</label>
                      <select
                        className={EDIT_INPUT_CLASS}
                        value={ovCivil}
                        onChange={(e) => setOvCivil(e.target.value)}
                      >
                        <option value="">—</option>
                        {CIVIL_STATUS_OPTIONS.map((x) => (
                          <option key={x} value={x}>
                            {x}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">Religion</label>
                      <input
                        className={EDIT_INPUT_CLASS}
                        value={ovReligion}
                        onChange={(e) => setOvReligion(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">Gender</label>
                      <select
                        className={EDIT_INPUT_CLASS}
                        value={ovGender}
                        onChange={(e) => setOvGender(e.target.value)}
                      >
                        <option value="">—</option>
                        {GENDER_OPTIONS.map((x) => (
                          <option key={x} value={x}>
                            {x}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">Nationality</label>
                      <input
                        className={EDIT_INPUT_CLASS}
                        value={ovNationality}
                        onChange={(e) => setOvNationality(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">Blood type</label>
                      <input
                        className={EDIT_INPUT_CLASS}
                        value={ovBlood}
                        onChange={(e) => setOvBlood(e.target.value)}
                      />
                    </div>
                  </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-2">App dashboard roles</label>
                    <DashboardRoleMultiSelect
                      value={ovRoleAssignment}
                      onChange={setOvRoleAssignment}
                      disabled={savingSection === 'overview'}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Performance summary
              </h2>
              {performanceSection(employee)}
            </div>

            {p.notes.length > 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent HR notes</h2>
                <ul className="space-y-3">
                  {p.notes.slice(0, 5).map((n) => (
                    <li key={n.id} className="text-sm border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                      <p className="text-xs text-gray-500 mb-1">
                        {n.note_type}
                        {n.created_at
                          ? ` · ${new Date(n.created_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}`
                          : ''}
                      </p>
                      <p className="text-gray-800 whitespace-pre-wrap">{n.note}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        );
      }

      case 'contact': {
        const c = p.contact;
        const primaryPhone =
          c != null ? c.primary_phone?.trim() || null : employee.phone?.trim() || null;
        const workEmail = c != null ? c.work_email?.trim() || null : employee.email?.trim() || null;
        const displayAddresses = [...p.addresses].sort((a, b) => {
          if (a.is_current && !b.is_current) return -1;
          if (!a.is_current && b.is_current) return 1;
          return 0;
        });
        const primaryAddr = displayAddresses[0] ?? null;

        const openContactEdit = () => {
          setCtPrimary(
            c != null ? c.primary_phone?.trim() || '' : employee.phone?.trim() || '',
          );
          setCtSecondary(c?.secondary_phone ?? '');
          setCtPersonalEmail(c?.personal_email ?? '');
          setCtWorkEmail(c != null ? c.work_email?.trim() || '' : employee.email?.trim() || '');
          setCtEmerName(c?.emergency_contact_name ?? '');
          setCtEmerPhone(c?.emergency_contact_phone ?? '');
          setCtEmerRel(c?.emergency_contact_relationship ?? '');
          setAddrId(primaryAddr?.id ?? null);
          setAddrLabel(primaryAddr?.address_label ?? '');
          setAddrStreet(primaryAddr?.street ?? '');
          setAddrBarangay(primaryAddr?.barangay ?? '');
          setAddrCity(primaryAddr?.city ?? '');
          setAddrProvince(primaryAddr?.province ?? '');
          setAddrPostal(primaryAddr?.postal_code ?? '');
          setAddrCurrent(primaryAddr?.is_current ?? true);
          setEditContact(true);
        };

        return (
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Phone className="w-5 h-5 text-blue-600" aria-hidden />
                  Contact Information
                </h2>
                {!editContact ? (
                  <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={openContactEdit}>
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setEditContact(false)}>
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      disabled={savingSection === 'contact'}
                      onClick={() => {
                        void (async () => {
                          setSavingSection('contact');
                          try {
                            await upsertEmployeeContactInfo(employee.id, {
                              primary_phone: ctPrimary || null,
                              secondary_phone: ctSecondary || null,
                              personal_email: ctPersonalEmail || null,
                              work_email: ctWorkEmail || null,
                              emergency_contact_name: ctEmerName || null,
                              emergency_contact_phone: ctEmerPhone || null,
                              emergency_contact_relationship: ctEmerRel || null,
                            });
                            await upsertPrimaryEmployeeAddress(employee.id, addrId, {
                              address_label: addrLabel || null,
                              street: addrStreet || null,
                              barangay: addrBarangay || null,
                              city: addrCity || null,
                              province: addrProvince || null,
                              postal_code: addrPostal || null,
                              is_current: addrCurrent,
                            });
                            addAuditLog(
                              'Employee profile',
                              'Employee',
                              `Updated contact & address for ${employee.employeeName} (${employee.employeeId})`,
                            );
                            setEditContact(false);
                            await refreshProfileFromServer();
                            await reloadEmployeeHeader();
                          } catch (e) {
                            window.alert(e instanceof Error ? e.message : 'Save failed');
                          } finally {
                            setSavingSection(null);
                          }
                        })();
                      }}
                    >
                      {savingSection === 'contact' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-1" />
                          Saving…
                        </>
                      ) : (
                        'Save'
                      )}
                    </Button>
                  </div>
                )}
              </div>
              {!editContact ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                  {contactInfoCell('Primary Phone', primaryPhone, <Phone className="w-4 h-4" />)}
                  {contactInfoCell('Secondary Phone', c?.secondary_phone, <Phone className="w-4 h-4" />)}
                  {contactInfoCell('Personal Email', c?.personal_email, <Mail className="w-4 h-4" />)}
                  {contactInfoCell('Work Email', workEmail, <Mail className="w-4 h-4" />)}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                  {(
                    [
                      ['Primary phone', ctPrimary, setCtPrimary],
                      ['Secondary phone', ctSecondary, setCtSecondary],
                      ['Personal email', ctPersonalEmail, setCtPersonalEmail],
                      ['Work email', ctWorkEmail, setCtWorkEmail],
                    ] as const
                  ).map(([label, val, setVal]) => (
                    <div key={label}>
                      <label className="block text-sm text-gray-500 mb-1">{label}</label>
                      <input className={EDIT_INPUT_CLASS} value={val} onChange={(e) => setVal(e.target.value)} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" aria-hidden />
                Address
              </h2>
              {!editContact ? (
                displayAddresses.length === 0 ? (
                  <p className="text-sm text-gray-500">No address on file.</p>
                ) : (
                  <ul className="space-y-8">
                    {displayAddresses.map((a) => {
                      const cityProvince = [a.city, a.province].filter(Boolean).join(', ');
                      return (
                        <li
                          key={a.id}
                          className="text-sm border-b border-gray-100 pb-8 last:border-0 last:pb-0"
                        >
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            {a.address_label ? (
                              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                {a.address_label}
                              </span>
                            ) : null}
                            {a.is_current ? (
                              <Badge variant="success" className="text-[10px]">
                                Current
                              </Badge>
                            ) : null}
                          </div>
                          {a.street ? (
                            <p className="font-semibold text-gray-900 text-base">{a.street}</p>
                          ) : (
                            <p className="text-gray-500">—</p>
                          )}
                          {a.barangay ? (
                            <p className="text-gray-700 mt-1.5">{a.barangay}</p>
                          ) : null}
                          {cityProvince ? (
                            <p className="text-gray-700 mt-1">{cityProvince}</p>
                          ) : null}
                          <p className="text-gray-700 mt-1.5">
                            {a.postal_code?.trim()
                              ? `Postal Code: ${a.postal_code.trim()}`
                              : 'Postal Code: —'}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                )
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="sm:col-span-2 flex items-center gap-2">
                    <input
                      id="addr-current"
                      type="checkbox"
                      checked={addrCurrent}
                      onChange={(e) => setAddrCurrent(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="addr-current" className="text-sm text-gray-700">
                      Current address
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Label</label>
                    <input className={EDIT_INPUT_CLASS} value={addrLabel} onChange={(e) => setAddrLabel(e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm text-gray-500 mb-1">Street</label>
                    <input className={EDIT_INPUT_CLASS} value={addrStreet} onChange={(e) => setAddrStreet(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Barangay</label>
                    <input className={EDIT_INPUT_CLASS} value={addrBarangay} onChange={(e) => setAddrBarangay(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">City</label>
                    <input className={EDIT_INPUT_CLASS} value={addrCity} onChange={(e) => setAddrCity(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Province</label>
                    <input className={EDIT_INPUT_CLASS} value={addrProvince} onChange={(e) => setAddrProvince(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Postal code</label>
                    <input className={EDIT_INPUT_CLASS} value={addrPostal} onChange={(e) => setAddrPostal(e.target.value)} />
                  </div>
                  <p className="sm:col-span-2 text-xs text-gray-500">
                    Editing the primary (first-listed) address. Add more rows in the database if needed.
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" aria-hidden />
                Emergency Contact
              </h2>
              {!editContact ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Name</p>
                    <p className="font-semibold text-gray-900 text-base">
                      {c?.emergency_contact_name?.trim() || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Phone</p>
                    <p className="font-semibold text-gray-900 text-base">
                      {c?.emergency_contact_phone?.trim() || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Relationship</p>
                    <p className="font-semibold text-gray-900 text-base">
                      {c?.emergency_contact_relationship?.trim() || '—'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Name</label>
                    <input className={EDIT_INPUT_CLASS} value={ctEmerName} onChange={(e) => setCtEmerName(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Phone</label>
                    <input className={EDIT_INPUT_CLASS} value={ctEmerPhone} onChange={(e) => setCtEmerPhone(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Relationship</label>
                    <input className={EDIT_INPUT_CLASS} value={ctEmerRel} onChange={(e) => setCtEmerRel(e.target.value)} />
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      }

      case 'employment': {
        const empRow = p.employment;
        const g = p.government;
        const hiredLabel = employee.joinDate
          ? new Date(employee.joinDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
          : '—';
        const hireYears = completedYearsFromJoinDate(employee.joinDate);
        const hireYearsSuffix =
          employee.joinDate && hireYears != null
            ? ` (${hireYears} ${hireYears === 1 ? 'year' : 'years'})`
            : '';
        const dept = empRow?.department?.trim() || employee.department || null;
        const statusHr = empRow?.employment_status ?? null;
        const startFmt = formatTimeAmPm(empRow?.work_start_time ?? null);
        const endFmt = formatTimeAmPm(empRow?.work_end_time ?? null);
        const hoursDisplay =
          startFmt && endFmt ? `${startFmt} – ${endFmt}` : startFmt || endFmt || null;
        const daysDisplay =
          empRow?.work_schedule_days && empRow.work_schedule_days.length > 0
            ? empRow.work_schedule_days.join(', ')
            : null;

        const timeSlice = (t: string | null | undefined) => {
          if (t == null || String(t).trim() === '') return '';
          const s = String(t);
          return s.length >= 5 ? s.slice(0, 5) : s;
        };

        const openEmploymentEdit = () => {
          setEmEmpCode(employee.employeeId?.trim() ?? '');
          setEmJoinDate(employee.joinDate?.slice(0, 10) ?? '');
          setEmStatus(empRow?.employment_status ?? 'Full-time');
          setEmPosition(empRow?.position ?? '');
          setEmDepartment(empRow?.department ?? employee.department ?? '');
          setEmReporting(empRow?.reporting_to ?? '');
          setEmBranchMgr(empRow?.branch_manager_name ?? '');
          setEmDays(empRow?.work_schedule_days?.join(', ') ?? '');
          setEmStart(timeSlice(empRow?.work_start_time ?? null));
          setEmEnd(timeSlice(empRow?.work_end_time ?? null));
          setEmShift(empRow?.shift ?? '');
          setGvTin(g?.tin ?? '');
          setGvSss(g ? (g.sss ?? '') : '');
          setGvPhil(g?.phil_health ?? '');
          setGvPag(g?.pag_ibig ?? '');
          setGvIdType(g?.gov_id_type ?? '');
          setGvIdNum(g?.gov_id_number ?? '');
          setEditEmployment(true);
        };

        return (
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-blue-600" aria-hidden />
                  Employment Details
                </h2>
                {!editEmployment ? (
                  <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={openEmploymentEdit}>
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setEditEmployment(false)}>
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      disabled={savingSection === 'employment'}
                      onClick={() => {
                        void (async () => {
                          setSavingSection('employment');
                          try {
                            const dayList = emDays
                              .split(',')
                              .map((d) => d.trim())
                              .filter(Boolean);
                            await updateEmployeeDirectoryCore(employee.id, {
                              employee_id: emEmpCode,
                              join_date: emJoinDate,
                            });
                            await upsertEmployeeEmploymentInfo(employee.id, {
                              employment_status: emStatus || null,
                              position: emPosition || null,
                              department: emDepartment || null,
                              reporting_to: emReporting || null,
                              branch_manager_name: emBranchMgr || null,
                              work_schedule_days: dayList.length ? dayList : null,
                              work_start_time: emStart ? `${emStart}:00` : null,
                              work_end_time: emEnd ? `${emEnd}:00` : null,
                              shift: emShift || null,
                            });
                            await upsertEmployeeGovernmentIds(employee.id, {
                              tin: gvTin || null,
                              sss: gvSss || null,
                              phil_health: gvPhil || null,
                              pag_ibig: gvPag || null,
                              gov_id_type: gvIdType || null,
                              gov_id_number: gvIdNum || null,
                            });
                            addAuditLog(
                              'Employee profile',
                              'Employee',
                              `Updated employment & government IDs for ${employee.employeeName} (${employee.employeeId})`,
                            );
                            setEditEmployment(false);
                            await refreshProfileFromServer();
                            await reloadEmployeeHeader();
                          } catch (e) {
                            window.alert(e instanceof Error ? e.message : 'Save failed');
                          } finally {
                            setSavingSection(null);
                          }
                        })();
                      }}
                    >
                      {savingSection === 'employment' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-1" />
                          Saving…
                        </>
                      ) : (
                        'Save'
                      )}
                    </Button>
                  </div>

                )}
              </div>
              {!editEmployment ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 text-sm">
                <div>
                  <p className="text-gray-500">Employee ID</p>
                  <p className="mt-0.5 font-semibold text-gray-900 text-base">{employee.employeeId}</p>
                </div>
                <div>
                  <p className="text-gray-500">Date Hired</p>
                  <p className="mt-0.5 font-semibold text-gray-900 text-base">
                    {hiredLabel}
                    {hireYearsSuffix}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Employment Status</p>
                  <div className="mt-1">
                    {statusHr ? (
                      <Badge variant={statusHr === 'Full-time' ? 'success' : 'neutral'}>{statusHr}</Badge>
                    ) : (
                      <span className="font-semibold text-gray-900">—</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-gray-500">Position</p>
                  <p className="mt-0.5 font-semibold text-gray-900 text-base">
                    {empRow?.position?.trim() || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Department</p>
                  <p className="mt-0.5 font-semibold text-gray-900 text-base">{dept || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Branch</p>
                  <p className="mt-0.5 font-semibold text-gray-900 text-base">
                    {employee.branchName ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Branch Manager</p>
                  <p className="mt-0.5 font-semibold text-gray-900 text-base">
                    {empRow?.branch_manager_name?.trim() || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Reporting To</p>
                  <p className="mt-0.5 font-semibold text-gray-900 text-base">
                    {empRow?.reporting_to?.trim() || '—'}
                  </p>
                </div>
                  </div>
              <p className="text-xs text-gray-500 mt-4">
                Directory status:{' '}
                <span className="capitalize font-medium text-gray-700">
                  {employee.status.replace(/-/g, ' ')}
                </span>
                {employee.tenure != null ? ` · ${employee.tenure} mo. tenure` : null}
              </p>
                </>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                  <div>
                    <label className="block text-gray-500 mb-1">Employee ID</label>
                    <input
                      className={`${EDIT_INPUT_CLASS} font-mono`}
                      value={emEmpCode}
                      onChange={(e) => setEmEmpCode(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-500 mb-1">Date hired</label>
                    <input
                      type="date"
                      className={EDIT_INPUT_CLASS}
                      value={emJoinDate}
                      onChange={(e) => setEmJoinDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-500 mb-1">Employment status</label>
                    <select className={EDIT_INPUT_CLASS} value={emStatus} onChange={(e) => setEmStatus(e.target.value)}>
                      {EMPLOYMENT_STATUS_OPTIONS.map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-500 mb-1">Position</label>
                    <input className={EDIT_INPUT_CLASS} value={emPosition} onChange={(e) => setEmPosition(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-gray-500 mb-1">Department</label>
                    <input className={EDIT_INPUT_CLASS} value={emDepartment} onChange={(e) => setEmDepartment(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-gray-500 mb-1">Branch</label>
                    <p className="mt-2 text-sm font-medium text-gray-800">{employee.branchName ?? '—'}</p>
                    <p className="text-xs text-gray-500">Change branch from HR / directory admin if needed.</p>
                  </div>
                  <div>
                    <label className="block text-gray-500 mb-1">Branch manager</label>
                    <input className={EDIT_INPUT_CLASS} value={emBranchMgr} onChange={(e) => setEmBranchMgr(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-gray-500 mb-1">Reports to</label>
                    <input className={EDIT_INPUT_CLASS} value={emReporting} onChange={(e) => setEmReporting(e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" aria-hidden />
                Work Schedule
              </h2>
              {!editEmployment ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 text-sm">
                <div className="sm:col-span-2">
                  <p className="text-gray-500">Working Days</p>
                  <p className="mt-0.5 font-semibold text-gray-900 text-base">{daysDisplay || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Working Hours</p>
                  <p className="mt-0.5 font-semibold text-gray-900 text-base">{hoursDisplay || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Shift</p>
                  <p className="mt-0.5 font-semibold text-gray-900 text-base">
                    {empRow?.shift?.trim() || '—'}
                  </p>
                </div>
              </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                  <div className="sm:col-span-2">
                    <label className="block text-gray-500 mb-1">Working days (comma-separated)</label>
                    <input className={EDIT_INPUT_CLASS} value={emDays} onChange={(e) => setEmDays(e.target.value)} placeholder="Monday, Tuesday, Wednesday…" />
                  </div>
                  <div>
                    <label className="block text-gray-500 mb-1">Start time</label>
                    <input type="time" className={EDIT_INPUT_CLASS} value={emStart} onChange={(e) => setEmStart(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-gray-500 mb-1">End time</label>
                    <input type="time" className={EDIT_INPUT_CLASS} value={emEnd} onChange={(e) => setEmEnd(e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-gray-500 mb-1">Shift</label>
                    <input className={EDIT_INPUT_CLASS} value={emShift} onChange={(e) => setEmShift(e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600" aria-hidden />
                  Government IDs
                </h2>
                {!editEmployment ? (
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setShowEmploymentGov((s) => !s)}
                >
                  {showEmploymentGov ? (
                    <>
                      <EyeOff className="w-4 h-4 mr-1.5" /> Hide
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-1.5" /> Show
                    </>
                  )}
                </Button>
                ) : null}
              </div>
              {editEmployment ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                  {(
                    [
                      ['TIN', gvTin, setGvTin],
                      ['SSS', gvSss, setGvSss],
                      ['PhilHealth', gvPhil, setGvPhil],
                      ['Pag-IBIG', gvPag, setGvPag],
                    ] as const
                  ).map(([label, val, setVal]) => (
                    <div key={label}>
                      <label className="block text-gray-500 mb-1">{label}</label>
                      <input className={`${EDIT_INPUT_CLASS} font-mono`} value={val} onChange={(e) => setVal(e.target.value)} />
                    </div>
                  ))}
                  <div className="sm:col-span-2">
                    <label className="block text-gray-500 mb-1">Other ID type</label>
                    <input className={EDIT_INPUT_CLASS} value={gvIdType} onChange={(e) => setGvIdType(e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-gray-500 mb-1">Other ID number</label>
                    <input className={`${EDIT_INPUT_CLASS} font-mono`} value={gvIdNum} onChange={(e) => setGvIdNum(e.target.value)} />
                  </div>
                </div>
              ) : !g ? (
                <p className="text-sm text-gray-500">No government ID record in the database.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 text-sm">
                  {[
                    ['TIN', g.tin],
                    ['SSS', g.sss],
                    ['PhilHealth', g.phil_health],
                    ['Pag-IBIG', g.pag_ibig],
                  ].map(([label, val]) => (
                    <div key={String(label)}>
                      <p className="text-gray-500">{label}</p>
                      <p className="mt-0.5 font-mono font-semibold text-gray-900 text-base">
                        {val?.trim()
                          ? maskSensitiveText(val, showEmploymentGov)
                          : '—'}
                      </p>
                    </div>
                  ))}
                  {(g.gov_id_type || g.gov_id_number) && (
                    <div className="sm:col-span-2">
                      <p className="text-gray-500">{g.gov_id_type || 'Other ID'}</p>
                      <p className="mt-0.5 font-mono font-semibold text-gray-900 text-base">
                        {g.gov_id_number?.trim()
                          ? maskSensitiveText(g.gov_id_number, showEmploymentGov)
                          : '—'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      }

      case 'compensation': {
        const c = p.compensation;
        const b = p.bank;
        const reveal = !hideCompAmounts;

        const transport = c?.allowance_transport != null ? Number(c.allowance_transport) : null;
        const meal = c?.allowance_meal != null ? Number(c.allowance_meal) : null;
        const commAllow = c?.allowance_communication != null ? Number(c.allowance_communication) : null;
        const otherAllow = c?.allowance_other != null ? Number(c.allowance_other) : null;
        const base = c?.base_salary != null ? Number(c.base_salary) : null;

        const allowanceSum =
          (transport ?? 0) + (meal ?? 0) + (commAllow ?? 0) + (otherAllow ?? 0);
        const computedTotal =
          base != null ? base + allowanceSum : allowanceSum > 0 ? allowanceSum : null;
        const totalMonthly: number | null =
          c?.total_monthly_compensation != null && Number.isFinite(Number(c.total_monthly_compensation))
            ? Number(c.total_monthly_compensation)
            : computedTotal;

        const openCompEdit = () => {
          setCmpBase(c?.base_salary != null ? String(Number(c.base_salary)) : '');
          setCmpCommRate(
            employee.role === 'Sales Agent'
              ? ''
              : c?.commission_rate != null
                ? String(Number(c.commission_rate))
                : '',
          );
          setCmpTier(c?.commission_tier != null ? String(c.commission_tier) : '');
          if (c?.bonus_eligibility === true) setCmpBonus('yes');
          else if (c?.bonus_eligibility === false) setCmpBonus('no');
          else setCmpBonus('unset');
          setCmpMq(c?.monthly_quota != null ? String(Number(c.monthly_quota)) : '');
          setCmpQq(c?.quarterly_quota != null ? String(Number(c.quarterly_quota)) : '');
          setCmpYq(c?.yearly_quota != null ? String(Number(c.yearly_quota)) : '');
          setCmpTr(c?.allowance_transport != null ? String(Number(c.allowance_transport)) : '');
          setCmpMeal(c?.allowance_meal != null ? String(Number(c.allowance_meal)) : '');
          setCmpCommAllow(c?.allowance_communication != null ? String(Number(c.allowance_communication)) : '');
          setCmpOther(c?.allowance_other != null ? String(Number(c.allowance_other)) : '');
          setCmpTotal(c?.total_monthly_compensation != null ? String(Number(c.total_monthly_compensation)) : '');
          setBnName(b?.bank_name ?? '');
          setBnAcctNum(b?.account_number ?? '');
          setBnAcctName(b?.account_name ?? '');
          setBnType(b?.account_type ?? '');
          setBnFreq(b?.payment_frequency ?? '');
          setEditCompensation(true);
        };

        const parseNum = (s: string): number | null => {
          const t = s.trim();
          if (!t) return null;
          const n = Number(t);
          return Number.isFinite(n) ? n : null;
        };

        return (
          <div className="space-y-6">
            <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600" aria-hidden />
              <p>
                <span className="font-semibold">Confidential information.</span>{' '}
                Visible to executives and HR. Do not share outside authorized channels.
              </p>
            </div>

            {!c && !b && !editCompensation ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-600 space-y-3">
                <p>No compensation or bank records in the database for this employee.</p>
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={openCompEdit}>
                  <Edit2 className="w-4 h-4" />
                  Add compensation and bank
                </Button>
              </div>
            ) : editCompensation ? (
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
                  <h2 className="text-lg font-bold text-gray-900">Edit compensation and bank</h2>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setEditCompensation(false)}>
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      disabled={savingSection === 'comp'}
                      onClick={() => {
                        void (async () => {
                          setSavingSection('comp');
                          try {
                            const bonusEl =
                              cmpBonus === 'yes' ? true : cmpBonus === 'no' ? false : null;
                            await upsertEmployeeCompensation(employee.id, employee.role, {
                              base_salary: parseNum(cmpBase),
                              commission_rate:
                                employee.role === 'Sales Agent' ? null : parseNum(cmpCommRate),
                              commission_tier: employee.role === 'Sales Agent' ? null : cmpTier || null,
                              bonus_eligibility: bonusEl,
                              monthly_quota: parseNum(cmpMq),
                              quarterly_quota: parseNum(cmpQq),
                              yearly_quota: parseNum(cmpYq),
                              allowance_transport: parseNum(cmpTr),
                              allowance_meal: parseNum(cmpMeal),
                              allowance_communication: parseNum(cmpCommAllow),
                              allowance_other: parseNum(cmpOther),
                              total_monthly_compensation: parseNum(cmpTotal),
                            });
                            await upsertEmployeeBankDetails(employee.id, {
                              bank_name: bnName || null,
                              account_number: bnAcctNum || null,
                              account_name: bnAcctName || null,
                              account_type: bnType || null,
                              payment_frequency: bnFreq || null,
                            });
                            addAuditLog(
                              'Employee profile',
                              'Employee',
                              `Updated compensation/bank for ${employee.employeeName} (${employee.employeeId})`,
                            );
                            setEditCompensation(false);
                            await refreshProfileFromServer();
                          } catch (e) {
                            window.alert(e instanceof Error ? e.message : 'Save failed');
                          } finally {
                            setSavingSection(null);
                          }
                        })();
                      }}
                    >
                      {savingSection === 'comp' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-1" />
                          Saving…
                        </>
                      ) : (
                        'Save'
                      )}
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="block text-gray-500 mb-1">Base salary (monthly)</label>
                    <input className={EDIT_INPUT_CLASS} value={cmpBase} onChange={(e) => setCmpBase(e.target.value)} />
                  </div>
                  {employee.role !== 'Sales Agent' ? (
                    <div>
                      <label className="block text-gray-500 mb-1">Commission rate (%)</label>
                      <input className={EDIT_INPUT_CLASS} value={cmpCommRate} onChange={(e) => setCmpCommRate(e.target.value)} />
                    </div>
                  ) : null}
                  {employee.role !== 'Sales Agent' ? (
                    <div>
                      <label className="block text-gray-500 mb-1">Commission tier</label>
                      <select className={EDIT_INPUT_CLASS} value={cmpTier} onChange={(e) => setCmpTier(e.target.value)}>
                        <option value="">—</option>
                        {COMMISSION_TIER_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <p className="sm:col-span-2 text-xs text-gray-500">
                      Sales agents do not use commission rate or tier on this record; commission is tracked from sales
                      performance.
                    </p>
                  )}
                  <div>
                    <label className="block text-gray-500 mb-1">Bonus eligible</label>
                    <select className={EDIT_INPUT_CLASS} value={cmpBonus} onChange={(e) => setCmpBonus(e.target.value as 'unset' | 'yes' | 'no')}>
                      <option value="unset">—</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-500 mb-1">Monthly quota</label>
                    <input className={EDIT_INPUT_CLASS} value={cmpMq} onChange={(e) => setCmpMq(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-gray-500 mb-1">Quarterly quota</label>
                    <input className={EDIT_INPUT_CLASS} value={cmpQq} onChange={(e) => setCmpQq(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-gray-500 mb-1">Yearly quota</label>
                    <input className={EDIT_INPUT_CLASS} value={cmpYq} onChange={(e) => setCmpYq(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-gray-500 mb-1">Allowance — transport</label>
                    <input className={EDIT_INPUT_CLASS} value={cmpTr} onChange={(e) => setCmpTr(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-gray-500 mb-1">Allowance — meal</label>
                    <input className={EDIT_INPUT_CLASS} value={cmpMeal} onChange={(e) => setCmpMeal(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-gray-500 mb-1">Allowance — communication</label>
                    <input className={EDIT_INPUT_CLASS} value={cmpCommAllow} onChange={(e) => setCmpCommAllow(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-gray-500 mb-1">Allowance — other</label>
                    <input className={EDIT_INPUT_CLASS} value={cmpOther} onChange={(e) => setCmpOther(e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-gray-500 mb-1">Total monthly compensation (stored)</label>
                    <input className={EDIT_INPUT_CLASS} value={cmpTotal} onChange={(e) => setCmpTotal(e.target.value)} />
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-5 space-y-4">
                  <h3 className="text-base font-bold text-gray-900">Bank</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <label className="block text-gray-500 mb-1">Bank name</label>
                      <input className={EDIT_INPUT_CLASS} value={bnName} onChange={(e) => setBnName(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-gray-500 mb-1">Account type</label>
                      <select className={EDIT_INPUT_CLASS} value={bnType} onChange={(e) => setBnType(e.target.value)}>
                        <option value="">—</option>
                        {BANK_TYPE_OPTIONS.map((x) => (
                          <option key={x} value={x}>
                            {x}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-500 mb-1">Account name</label>
                      <input className={EDIT_INPUT_CLASS} value={bnAcctName} onChange={(e) => setBnAcctName(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-gray-500 mb-1">Account number</label>
                      <input className={EDIT_INPUT_CLASS} value={bnAcctNum} onChange={(e) => setBnAcctNum(e.target.value)} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-gray-500 mb-1">Payment frequency</label>
                      <select className={EDIT_INPUT_CLASS} value={bnFreq} onChange={(e) => setBnFreq(e.target.value)}>
                        <option value="">—</option>
                        {PAY_FREQ_OPTIONS.map((x) => (
                          <option key={x} value={x}>
                            {x}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-blue-600" aria-hidden />
                      Compensation Structure
                    </h2>
                    <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={openCompEdit}
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => setHideCompAmounts((h) => !h)}
                    >
                      {hideCompAmounts ? (
                        <>
                          <Eye className="w-4 h-4 mr-1.5" /> Show Amounts
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-4 h-4 mr-1.5" /> Hide Amounts
                        </>
                      )}
                    </Button>
                    </div>
                  </div>
                  {!c ? (
                    <p className="text-sm text-gray-500">No compensation record.</p>
                  ) : (
                    <div
                      className={
                        employee.role === 'Sales Agent'
                          ? 'grid grid-cols-1 gap-8'
                          : 'grid grid-cols-1 sm:grid-cols-2 gap-8'
                      }
                    >
                      <div>
                        <p className="text-sm text-gray-500">Base Salary</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">
                          {formatPesoOptionalHidden(base, reveal)}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">Monthly</p>
                      </div>
                      {employee.role !== 'Sales Agent' ? (
                        <div>
                          <p className="text-sm text-gray-500">Commission Rate</p>
                          <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">
                            {c.commission_rate != null && Number.isFinite(Number(c.commission_rate))
                              ? `${Number(c.commission_rate)}%`
                              : '—'}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {c.commission_tier ? String(c.commission_tier) : '\u00a0'}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 sm:col-span-2">
                          Commission rate and tier are not used for sales agents; use performance metrics and payout
                          records for commission.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h3 className="text-base font-bold text-gray-900 mb-4">Monthly Allowances</h3>
                  {!c ? (
                    <p className="text-sm text-gray-500">—</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                        {(
                          [
                            ['Transportation', transport],
                            ['Meal', meal],
                            ['Communication', commAllow],
                            ['Other', otherAllow],
                          ] as const
                        ).map(([label, val]) => (
                          <div
                            key={label}
                            className="flex justify-between gap-4 border-b border-gray-50 pb-3 sm:border-0 sm:pb-0"
                          >
                            <span className="text-gray-600">{label}</span>
                            <span className="font-semibold text-gray-900 tabular-nums">
                              {formatPesoOptionalHidden(val, reveal)}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-gray-100 pt-5">
                        <span className="text-sm font-medium text-gray-600">
                          Total Monthly Compensation
                        </span>
                        <span className="text-2xl font-bold text-gray-900 tabular-nums">
                          {formatPesoOptionalHidden(totalMonthly, reveal)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2 max-w-xl ml-auto text-right">
                        {employee.role === 'Sales Agent'
                          ? 'Sum of base salary and allowances when no stored total is set.'
                          : 'Sum of base salary and allowances when no stored total is set. Commission affects payouts separately.'}
                      </p>
                    </>
                  )}
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" aria-hidden />
                    Sales Quotas
                  </h2>
                  {!c ? (
                    <p className="text-sm text-gray-500">—</p>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
                        <div>
                          <p className="text-gray-500">Monthly Quota</p>
                          <p className="mt-1 text-lg font-semibold text-gray-900 tabular-nums">
                            {formatPesoOptionalHidden(
                              c.monthly_quota != null ? Number(c.monthly_quota) : null,
                              reveal,
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Quarterly Quota</p>
                          <p className="mt-1 text-lg font-semibold text-gray-900 tabular-nums">
                            {formatPesoOptionalHidden(
                              c.quarterly_quota != null ? Number(c.quarterly_quota) : null,
                              reveal,
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Yearly Quota</p>
                          <p className="mt-1 text-lg font-semibold text-gray-900 tabular-nums">
                            {formatPesoOptionalHidden(
                              c.yearly_quota != null ? Number(c.yearly_quota) : null,
                              reveal,
                            )}
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-2">Bonus Eligibility</p>
                        {c.bonus_eligibility === true ? (
                          <Badge variant="success" className="text-sm font-normal px-3 py-1.5">
                            Yes — Eligible for performance bonuses
                          </Badge>
                        ) : c.bonus_eligibility === false ? (
                          <span className="text-sm font-medium text-gray-700">Not eligible</span>
                        ) : (
                          <span className="text-sm text-gray-500">—</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-600" aria-hidden />
                    Bank Details
                  </h2>
                  {!b ? (
                    <p className="text-sm text-gray-500">No bank record.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 text-sm">
                      <div>
                        <p className="text-gray-500">Bank Name</p>
                        <p className="mt-0.5 font-semibold text-gray-900">
                          {b.bank_name?.trim() || '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Account Type</p>
                        <p className="mt-0.5 font-semibold text-gray-900">
                          {b.account_type?.trim() || '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Account Name</p>
                        <p className="mt-0.5 font-semibold text-gray-900">
                          {maskSensitiveText(b.account_name, reveal)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Account Number</p>
                        <p className="mt-0.5 font-mono font-semibold text-gray-900">
                          {maskAccountNumber(b.account_number, reveal)}
                        </p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-gray-500">Payment Frequency</p>
                        <p className="mt-0.5 font-semibold text-gray-900">
                          {b.payment_frequency != null ? String(b.payment_frequency) : '—'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        );
      }

      case 'customers':
        return (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Assigned customers</h2>
            </div>
            {p.customerPortfolio.length === 0 ? (
              <p className="p-6 text-sm text-gray-500">No customers linked to this employee.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-left text-gray-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Customer</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Location</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium text-right">Orders</th>
                      <th className="px-4 py-3 font-medium text-right">Revenue</th>
                      <th className="px-4 py-3 font-medium">Last order</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {p.customerPortfolio.map((row) => (
                      <tr key={row.rowKey} className="hover:bg-gray-50/80">
                        <td className="px-4 py-3">
                          {row.customerId ? (
                            <Link
                              to={`/customers/${row.customerId}`}
                              className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {row.displayName}
                            </Link>
                          ) : (
                            <p className="font-medium text-gray-900">{row.displayName}</p>
                          )}
                          {row.company && row.company !== row.displayName ? (
                            <p className="text-xs text-gray-500">{row.company}</p>
                          ) : null}
                          <p className="text-xs text-gray-500">{row.email || row.phone || ''}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {row.clientType ? row.clientType : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {[row.city, row.province].filter(Boolean).join(', ') || '—'}
                        </td>
                        <td className="px-4 py-3">{row.status ?? '—'}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{row.orderCount}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium">{formatPeso(row.revenue)}</td>
                        <td className="px-4 py-3 text-gray-700">
                          {row.lastOrderDate
                            ? new Date(row.lastOrderDate).toLocaleDateString('en-PH', { dateStyle: 'medium' })
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );

      case 'orders':
        return (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 space-y-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Orders created</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {agentOrdersLoading
                    ? 'Loading orders…'
                    : agentOrders.length === 0
                      ? 'Sales orders where this agent is recorded as the order agent.'
                      : agentOrdersPeriodQuery.invalid
                        ? 'Invalid date range selected.'
                        : `${sortedAgentOrders.length} of ${agentOrders.length} order${agentOrders.length !== 1 ? 's' : ''} in ${agentOrdersPeriodQuery.displayLabel}`}
                </p>
              </div>
              {!agentOrdersLoading && agentOrders.length > 0 && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative flex-1 min-w-0 max-w-md">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="Search by order # or customer"
                      value={agentOrdersSearch}
                      onChange={e => setAgentOrdersSearch(e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2 h-9 border-gray-300 bg-white min-w-[9.5rem] max-w-[14rem] justify-start shrink-0"
                    aria-haspopup="dialog"
                    aria-expanded={agentOrdersPeriodModalOpen}
                    aria-label="Choose order period"
                    onClick={openAgentOrdersPeriodModal}
                  >
                    <CalendarRange className="w-4 h-4 shrink-0 text-gray-600" aria-hidden />
                    <span className="truncate text-left text-sm font-normal">
                      {periodTriggerLabel(agentOrdersPeriodKind, agentOrdersCustomStart, agentOrdersCustomEnd)}
                    </span>
                  </Button>
                </div>
              )}
            </div>
            {agentOrdersLoading ? (
              <div className="py-12 flex justify-center text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : agentOrdersError ? (
              <p className="p-6 text-sm text-red-600">{agentOrdersError}</p>
            ) : agentOrders.length === 0 ? (
              <p className="p-6 text-sm text-gray-500">No orders linked to this agent yet.</p>
            ) : sortedAgentOrders.length === 0 ? (
              <p className="p-6 text-sm text-gray-500">No orders match your search or filters.</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-left text-gray-600">
                      <tr>
                        <th
                          onClick={() => handleAgentOrdersSort('orderNumber')}
                          className="px-4 py-3 font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                        >
                          <span className="flex items-center">Order{agentOrdersSortIcon('orderNumber')}</span>
                        </th>
                        <th
                          onClick={() => handleAgentOrdersSort('trip')}
                          className="px-4 py-3 font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                        >
                          <span className="flex items-center">Trip ID{agentOrdersSortIcon('trip')}</span>
                        </th>
                        <th
                          onClick={() => handleAgentOrdersSort('customer')}
                          className="px-4 py-3 font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                        >
                          <span className="flex items-center">Customer{agentOrdersSortIcon('customer')}</span>
                        </th>
                        <th
                          onClick={() => handleAgentOrdersSort('orderDate')}
                          className="px-4 py-3 font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                        >
                          <span className="flex items-center">Order date{agentOrdersSortIcon('orderDate')}</span>
                        </th>
                        <th
                          onClick={() => handleAgentOrdersSort('requiredDate')}
                          className="px-4 py-3 font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                        >
                          <span className="flex items-center">Required{agentOrdersSortIcon('requiredDate')}</span>
                        </th>
                        <th
                          onClick={() => handleAgentOrdersSort('total')}
                          className="px-4 py-3 font-medium text-right cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                        >
                          <span className="flex items-center justify-end">Total{agentOrdersSortIcon('total')}</span>
                        </th>
                        <th
                          onClick={() => handleAgentOrdersSort('paid')}
                          className="px-4 py-3 font-medium text-right cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                        >
                          <span className="flex items-center justify-end">Paid{agentOrdersSortIcon('paid')}</span>
                        </th>
                        <th
                          onClick={() => handleAgentOrdersSort('balance')}
                          className="px-4 py-3 font-medium text-right cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                        >
                          <span className="flex items-center justify-end">Balance{agentOrdersSortIcon('balance')}</span>
                        </th>
                        <th className="px-3 py-3 font-medium align-top min-w-[10.5rem] max-w-[14rem]">
                          <div className="normal-case">
                            <select
                              aria-label="Filter by status"
                              value={agentOrdersStatusFilter}
                              onChange={e => setAgentOrdersStatusFilter(e.target.value)}
                              onClick={e => e.stopPropagation()}
                              className="w-full text-sm font-medium text-gray-800 border border-gray-200 rounded-md px-2 py-1.5 bg-white hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="">Status</option>
                              {distinctAgentOrderStatuses.map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </div>
                        </th>
                        <th className="px-3 py-3 font-medium align-top min-w-[9.5rem] max-w-[13rem]">
                          <div className="normal-case">
                            <select
                              aria-label="Filter by payment"
                              value={agentOrdersPaymentFilter}
                              onChange={e => setAgentOrdersPaymentFilter(e.target.value)}
                              onClick={e => e.stopPropagation()}
                              className="w-full text-sm font-medium text-gray-800 border border-gray-200 rounded-md px-2 py-1.5 bg-white hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="">Payment</option>
                              {distinctAgentPaymentStatuses.map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {paginatedAgentOrders.map(row => (
                        <tr key={row.id} className="hover:bg-gray-50/80">
                          <td className="px-4 py-3">
                            <Link
                              to={`/orders/${row.id}`}
                              className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {row.orderNumber}
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <OrderTripIdCell tripNumber={row.tripNumber} tripId={row.tripId} />
                          </td>
                          <td className="px-4 py-3">
                            {row.customerId ? (
                              <Link
                                to={`/customers/${row.customerId}`}
                                className="text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                {row.customerName ?? '—'}
                              </Link>
                            ) : (
                              <span className="text-gray-800">{row.customerName ?? '—'}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-700">{formatOrderDate(row.orderDate)}</td>
                          <td className="px-4 py-3 text-gray-700">{formatOrderDate(row.requiredDate)}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{formatPeso(row.totalAmount)}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-green-700">
                            {formatPeso(row.amountPaid)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">{formatPeso(row.balanceDue)}</td>
                          <td className="px-4 py-3 text-gray-700">{row.status}</td>
                          <td className="px-4 py-3">
                            <Badge variant={orderPaymentStatusVariant(row.paymentStatus)} className="text-xs">
                              {row.paymentStatus}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {sortedAgentOrders.length > AGENT_ORDERS_PAGE_SIZE && (
                  <TablePagination
                    page={safeAgentOrdersPage}
                    total={sortedAgentOrders.length}
                    pageSize={AGENT_ORDERS_PAGE_SIZE}
                    onPageChange={setAgentOrdersPage}
                  />
                )}
              </>
            )}
          </div>
        );

      case 'trips': {
        const driverTripView = employeeUsesDriverTripHistoryView(employeeDashboardRoles);
        return (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 space-y-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Trip history</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {tripHistoryLoading
                    ? 'Loading trips…'
                    : driverTripView
                      ? tripHistory.length === 0
                        ? `Completed and closed trips assigned to ${employee.employeeName}.`
                        : tripHistoryPeriodQuery.invalid
                          ? 'Invalid date range selected.'
                          : `${sortedTripHistory.length} of ${tripHistory.length} trip${tripHistory.length !== 1 ? 's' : ''} in ${tripHistoryPeriodQuery.displayLabel}`
                      : !employee.branchName
                        ? 'Assign a branch to this employee to view branch trip history.'
                        : tripHistory.length === 0
                          ? `Completed and closed trips for ${employee.branchName}.`
                          : tripHistoryPeriodQuery.invalid
                            ? 'Invalid date range selected.'
                            : `${sortedTripHistory.length} of ${tripHistory.length} trip${tripHistory.length !== 1 ? 's' : ''} in ${tripHistoryPeriodQuery.displayLabel}`}
                </p>
              </div>
              {!tripHistoryLoading && (driverTripView || employee.branchName) && tripHistory.length > 0 && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative flex-1 min-w-0 max-w-md">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder={
                        driverTripView
                          ? 'Search trip ID, trip #, vehicle, route, or customer'
                          : 'Search trip ID, trip #, vehicle, driver, or customer'
                      }
                      value={tripHistorySearch}
                      onChange={e => setTripHistorySearch(e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2 h-9 border-gray-300 bg-white min-w-[9.5rem] max-w-[14rem] justify-start shrink-0"
                    aria-haspopup="dialog"
                    aria-expanded={tripHistoryPeriodModalOpen}
                    aria-label="Choose trip period"
                    onClick={openTripHistoryPeriodModal}
                  >
                    <CalendarRange className="w-4 h-4 shrink-0 text-gray-600" aria-hidden />
                    <span className="truncate text-left text-sm font-normal">
                      {periodTriggerLabel(tripHistoryPeriodKind, tripHistoryCustomStart, tripHistoryCustomEnd)}
                    </span>
                  </Button>
                </div>
              )}
            </div>
            {tripHistoryLoading ? (
              <div className="py-12 flex justify-center text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : tripHistoryError ? (
              <p className="p-6 text-sm text-red-600">{tripHistoryError}</p>
            ) : !driverTripView && !employee.branchName ? (
              <p className="p-6 text-sm text-gray-500">No branch is assigned to this logistics manager.</p>
            ) : tripHistory.length === 0 ? (
              <p className="p-6 text-sm text-gray-500">
                {driverTripView
                  ? 'No completed trips recorded for this driver yet.'
                  : 'No completed trips recorded for this branch yet.'}
              </p>
            ) : sortedTripHistory.length === 0 ? (
              <p className="p-6 text-sm text-gray-500">No trips match your search or filters.</p>
            ) : (
              <>
                <div className="overflow-x-auto relative">
                  {tripDetailLoading && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600" aria-hidden />
                    </div>
                  )}
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-left text-gray-600">
                      <tr>
                        <th
                          onClick={() => handleTripHistorySort('tripNumber')}
                          className="px-4 py-3 font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                        >
                          <span className="flex items-center">Trip{tripHistorySortIcon('tripNumber')}</span>
                        </th>
                        <th
                          onClick={() => handleTripHistorySort('date')}
                          className="px-4 py-3 font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                        >
                          <span className="flex items-center">Date{tripHistorySortIcon('date')}</span>
                        </th>
                        <th
                          onClick={() => handleTripHistorySort('vehicle')}
                          className="px-4 py-3 font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                        >
                          <span className="flex items-center">Vehicle{tripHistorySortIcon('vehicle')}</span>
                        </th>
                        {!driverTripView && (
                          <th
                            onClick={() => handleTripHistorySort('driver')}
                            className="px-4 py-3 font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                          >
                            <span className="flex items-center">Driver{tripHistorySortIcon('driver')}</span>
                          </th>
                        )}
                        <th className="px-4 py-3 font-medium">Route</th>
                        <th
                          onClick={() => handleTripHistorySort('orders')}
                          className="px-4 py-3 font-medium text-right cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                        >
                          <span className="flex items-center justify-end">Orders{tripHistorySortIcon('orders')}</span>
                        </th>
                        <th className="px-3 py-3 font-medium align-top min-w-[9.5rem] max-w-[13rem]">
                          <div className="normal-case">
                            <select
                              aria-label="Filter by status"
                              value={tripHistoryStatusFilter}
                              onChange={e => setTripHistoryStatusFilter(e.target.value)}
                              onClick={e => e.stopPropagation()}
                              className="w-full text-sm font-medium text-gray-800 border border-gray-200 rounded-md px-2 py-1.5 bg-white hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="">Status</option>
                              {distinctTripHistoryStatuses.map(s => (
                                <option key={s} value={s}>{tripStatusDisplay(s)}</option>
                              ))}
                            </select>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {paginatedTripHistory.map(row => {
                        const cap =
                          row.deliverySuccessRate != null && Number.isFinite(row.deliverySuccessRate)
                            ? Math.round(row.deliverySuccessRate)
                            : null;
                        const routeLabel = row.route.filter(Boolean).join(', ') || '—';
                        return (
                          <tr
                            key={row.id}
                            className={`hover:bg-gray-50/80 ${row.tripId ? 'cursor-pointer' : ''}`}
                            onClick={() => {
                              if (row.tripId) void openTripDetailFromHistory(row);
                            }}
                          >
                            <td className="px-4 py-3 font-medium text-blue-600">{row.tripNumber}</td>
                            <td className="px-4 py-3 text-gray-700">{formatOrderDate(row.date)}</td>
                            <td className="px-4 py-3">
                              {row.vehicleId ? (
                                <Link
                                  to={`/logistics/${row.vehicleId}`}
                                  className="text-blue-600 hover:text-blue-800 hover:underline"
                                  onClick={e => e.stopPropagation()}
                                >
                                  {row.vehicleName || '—'}
                                </Link>
                              ) : (
                                <span className="text-gray-800">{row.vehicleName || '—'}</span>
                              )}
                            </td>
                            {!driverTripView && (
                              <td className="px-4 py-3 text-gray-700">{row.driverName || '—'}</td>
                            )}
                            <td className="px-4 py-3 text-gray-700 max-w-[14rem] truncate" title={routeLabel}>
                              {routeLabel}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-gray-800">
                              {row.ordersCount}
                              {cap != null ? (
                                <span className="block text-xs text-gray-500">{cap}% full</span>
                              ) : null}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant={dispatchTableStatusBadgeVariant(row.status)} className="text-xs">
                                {tripStatusDisplay(row.status)}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {sortedTripHistory.length > TRIP_HISTORY_PAGE_SIZE && (
                  <TablePagination
                    page={safeTripHistoryPage}
                    total={sortedTripHistory.length}
                    pageSize={TRIP_HISTORY_PAGE_SIZE}
                    onPageChange={setTripHistoryPage}
                  />
                )}
              </>
            )}
          </div>
        );
      }

      case 'requests': {
        const totalWarehouseRequests = warehouseProductionRequests.length + warehousePurchaseOrders.length;
        const filteredTotal =
          filteredWarehouseProductionRequests.length + filteredWarehousePurchaseOrders.length;
        const hasAnyRequests = totalWarehouseRequests > 0;

        return (
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 space-y-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Purchase & production requests</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {warehouseRequestsLoading
                      ? 'Loading requests…'
                      : !hasAnyRequests
                        ? 'Purchase orders and production requests created under this employee’s name.'
                        : warehouseRequestsPeriodQuery.invalid
                          ? 'Invalid date range selected.'
                          : `${filteredTotal} of ${totalWarehouseRequests} request${totalWarehouseRequests !== 1 ? 's' : ''} in ${warehouseRequestsPeriodQuery.displayLabel}`}
                  </p>
                </div>
                {!warehouseRequestsLoading && hasAnyRequests && (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative flex-1 min-w-0 max-w-md">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="Search by PR/PO #, supplier, or branch"
                        value={warehouseRequestsSearch}
                        onChange={e => setWarehouseRequestsSearch(e.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2 h-9 border-gray-300 bg-white min-w-[9.5rem] max-w-[14rem] justify-start shrink-0"
                      aria-haspopup="dialog"
                      aria-expanded={warehouseRequestsPeriodModalOpen}
                      aria-label="Choose request period"
                      onClick={openWarehouseRequestsPeriodModal}
                    >
                      <CalendarRange className="w-4 h-4 shrink-0 text-gray-600" aria-hidden />
                      <span className="truncate text-left text-sm font-normal">
                        {periodTriggerLabel(
                          warehouseRequestsPeriodKind,
                          warehouseRequestsCustomStart,
                          warehouseRequestsCustomEnd,
                        )}
                      </span>
                    </Button>
                  </div>
                )}
              </div>
              {warehouseRequestsLoading ? (
                <div className="py-12 flex justify-center text-gray-500">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : warehouseRequestsError ? (
                <p className="p-6 text-sm text-red-600">{warehouseRequestsError}</p>
              ) : !hasAnyRequests ? (
                <p className="p-6 text-sm text-gray-500">No purchase or production requests recorded for this employee yet.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-gray-900">Production requests</h3>
                      <span className="text-xs text-gray-500 tabular-nums">
                        {filteredWarehouseProductionRequests.length} of {warehouseProductionRequests.length}
                      </span>
                    </div>
                    {sortedWarehouseProductionRequests.length === 0 ? (
                      <p className="text-sm text-gray-500">No production requests match your search or filters.</p>
                    ) : (
                      <>
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead className="bg-gray-50 text-left text-gray-600">
                              <tr>
                                <th
                                  onClick={() => handleWarehousePrSort('prNumber')}
                                  className="px-4 py-3 font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                                >
                                  <span className="flex items-center">PR #{warehousePrSortIcon('prNumber')}</span>
                                </th>
                                <th
                                  onClick={() => handleWarehousePrSort('requestDate')}
                                  className="px-4 py-3 font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                                >
                                  <span className="flex items-center">Request date{warehousePrSortIcon('requestDate')}</span>
                                </th>
                                <th
                                  onClick={() => handleWarehousePrSort('expectedDate')}
                                  className="px-4 py-3 font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                                >
                                  <span className="flex items-center">Expected{warehousePrSortIcon('expectedDate')}</span>
                                </th>
                                <th
                                  onClick={() => handleWarehousePrSort('branch')}
                                  className="px-4 py-3 font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                                >
                                  <span className="flex items-center">Branch{warehousePrSortIcon('branch')}</span>
                                </th>
                                <th
                                  onClick={() => handleWarehousePrSort('items')}
                                  className="px-4 py-3 font-medium text-right cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                                >
                                  <span className="flex items-center justify-end">Lines{warehousePrSortIcon('items')}</span>
                                </th>
                                <th className="px-3 py-3 font-medium align-top min-w-[9.5rem] max-w-[13rem]">
                                  <div className="normal-case">
                                    <select
                                      aria-label="Filter production requests by status"
                                      value={warehousePrStatusFilter}
                                      onChange={e => setWarehousePrStatusFilter(e.target.value)}
                                      onClick={e => e.stopPropagation()}
                                      className="w-full text-sm font-medium text-gray-800 border border-gray-200 rounded-md px-2 py-1.5 bg-white hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                      <option value="">Status</option>
                                      {distinctWarehousePrStatuses.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                      ))}
                                    </select>
                                  </div>
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {paginatedWarehouseProductionRequests.map(row => (
                                <tr key={row.id} className="hover:bg-gray-50/80">
                                  <td className="px-4 py-3">
                                    <Link
                                      to={`/production-requests/${row.id}`}
                                      className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                    >
                                      {row.prNumber}
                                    </Link>
                                  </td>
                                  <td className="px-4 py-3 text-gray-700">{formatOrderDate(row.requestDate)}</td>
                                  <td className="px-4 py-3 text-gray-700">{formatOrderDate(row.expectedCompletionDate)}</td>
                                  <td className="px-4 py-3 text-gray-700">{row.branchName ?? '—'}</td>
                                  <td className="px-4 py-3 text-right tabular-nums">{row.itemCount}</td>
                                  <td className="px-4 py-3">
                                    <Badge variant={productionRequestStatusVariant(row.status)} className="text-xs">
                                      {row.status}
                                    </Badge>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {sortedWarehouseProductionRequests.length > WAREHOUSE_PR_PAGE_SIZE && (
                          <TablePagination
                            page={safeWarehousePrPage}
                            total={sortedWarehouseProductionRequests.length}
                            pageSize={WAREHOUSE_PR_PAGE_SIZE}
                            onPageChange={setWarehousePrPage}
                          />
                        )}
                      </>
                    )}
                  </div>

                  <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-gray-900">Purchase orders</h3>
                      <span className="text-xs text-gray-500 tabular-nums">
                        {filteredWarehousePurchaseOrders.length} of {warehousePurchaseOrders.length}
                      </span>
                    </div>
                    {sortedWarehousePurchaseOrders.length === 0 ? (
                      <p className="text-sm text-gray-500">No purchase orders match your search or filters.</p>
                    ) : (
                      <>
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead className="bg-gray-50 text-left text-gray-600">
                              <tr>
                                <th
                                  onClick={() => handleWarehousePoSort('poNumber')}
                                  className="px-4 py-3 font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                                >
                                  <span className="flex items-center">PO #{warehousePoSortIcon('poNumber')}</span>
                                </th>
                                <th
                                  onClick={() => handleWarehousePoSort('orderDate')}
                                  className="px-4 py-3 font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                                >
                                  <span className="flex items-center">Order date{warehousePoSortIcon('orderDate')}</span>
                                </th>
                                <th
                                  onClick={() => handleWarehousePoSort('expectedDate')}
                                  className="px-4 py-3 font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                                >
                                  <span className="flex items-center">Expected{warehousePoSortIcon('expectedDate')}</span>
                                </th>
                                <th
                                  onClick={() => handleWarehousePoSort('supplier')}
                                  className="px-4 py-3 font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                                >
                                  <span className="flex items-center">Supplier{warehousePoSortIcon('supplier')}</span>
                                </th>
                                <th
                                  onClick={() => handleWarehousePoSort('total')}
                                  className="px-4 py-3 font-medium text-right cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900"
                                >
                                  <span className="flex items-center justify-end">Total{warehousePoSortIcon('total')}</span>
                                </th>
                                <th className="px-3 py-3 font-medium align-top min-w-[9.5rem] max-w-[13rem]">
                                  <div className="normal-case">
                                    <select
                                      aria-label="Filter purchase orders by status"
                                      value={warehousePoStatusFilter}
                                      onChange={e => setWarehousePoStatusFilter(e.target.value)}
                                      onClick={e => e.stopPropagation()}
                                      className="w-full text-sm font-medium text-gray-800 border border-gray-200 rounded-md px-2 py-1.5 bg-white hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                      <option value="">Status</option>
                                      {distinctWarehousePoStatuses.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                      ))}
                                    </select>
                                  </div>
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {paginatedWarehousePurchaseOrders.map(row => (
                                <tr key={row.id} className="hover:bg-gray-50/80">
                                  <td className="px-4 py-3">
                                    <Link
                                      to={`/purchase-orders/${row.id}`}
                                      className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                    >
                                      {row.poNumber}
                                    </Link>
                                  </td>
                                  <td className="px-4 py-3 text-gray-700">{formatOrderDate(row.orderDate)}</td>
                                  <td className="px-4 py-3 text-gray-700">{formatOrderDate(row.expectedDeliveryDate)}</td>
                                  <td className="px-4 py-3 text-gray-700">{row.supplierName ?? '—'}</td>
                                  <td className="px-4 py-3 text-right tabular-nums">{formatPeso(row.totalAmount)}</td>
                                  <td className="px-4 py-3">
                                    <Badge variant={purchaseOrderStatusVariant(row.status)} className="text-xs">
                                      {row.status}
                                    </Badge>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {sortedWarehousePurchaseOrders.length > WAREHOUSE_PO_PAGE_SIZE && (
                          <TablePagination
                            page={safeWarehousePoPage}
                            total={sortedWarehousePurchaseOrders.length}
                            pageSize={WAREHOUSE_PO_PAGE_SIZE}
                            onPageChange={setWarehousePoPage}
                          />
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      }

      case 'catalog': {
        const productGroupOptions = catalogProductGroups;
        const materialGroupOptions = catalogMaterialGroups;
        const visibleProductAllSelected =
          visibleCatalogProducts.length > 0 &&
          visibleCatalogProducts.every(item => selectedProductIds.has(item.id));
        const visibleProductSomeSelected =
          visibleCatalogProducts.some(item => selectedProductIds.has(item.id)) && !visibleProductAllSelected;
        const visibleMaterialAllSelected =
          visibleCatalogMaterials.length > 0 &&
          visibleCatalogMaterials.every(item => selectedMaterialIds.has(item.id));
        const visibleMaterialSomeSelected =
          visibleCatalogMaterials.some(item => selectedMaterialIds.has(item.id)) && !visibleMaterialAllSelected;

        return (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Catalog access</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Pick a category, check the product families or raw materials this manager can access, then save
                    everything together.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="shrink-0"
                  disabled={catalogSaving || catalogLoading || !employee.branchName}
                  onClick={() => void handleSaveCatalogAssignments()}
                >
                  {catalogSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Saving…
                    </>
                  ) : (
                    'Save all assignments'
                  )}
                </Button>
              </div>

              {!catalogLoading && employee.branchName && (
                <>
                  <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setCatalogSection('products');
                        setCatalogSearch('');
                      }}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        catalogSection === 'products'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Product families
                      <span className="ml-1.5 text-xs text-gray-500 tabular-nums">({selectedProductIds.size})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCatalogSection('materials');
                        setCatalogSearch('');
                      }}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        catalogSection === 'materials'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Raw materials
                      <span className="ml-1.5 text-xs text-gray-500 tabular-nums">({selectedMaterialIds.size})</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] gap-3">
                    <div>
                      <label htmlFor="catalog-category" className="block text-xs font-medium text-gray-600 mb-1.5">
                        Category
                      </label>
                      <select
                        id="catalog-category"
                        value={catalogSection === 'products' ? catalogProductCategoryId : catalogMaterialCategoryId}
                        onChange={e => {
                          if (catalogSection === 'products') setCatalogProductCategoryId(e.target.value);
                          else setCatalogMaterialCategoryId(e.target.value);
                        }}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        {(catalogSection === 'products' ? productGroupOptions : materialGroupOptions).map(group => {
                          const selectedInGroup = group.items.filter(item =>
                            catalogSection === 'products'
                              ? selectedProductIds.has(item.id)
                              : selectedMaterialIds.has(item.id),
                          ).length;
                          return (
                            <option key={group.categoryId} value={group.categoryId}>
                              {group.categoryName} ({group.items.length}
                              {selectedInGroup > 0 ? ` · ${selectedInGroup} selected` : ''})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="catalog-search" className="block text-xs font-medium text-gray-600 mb-1.5">
                        Search in category
                      </label>
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          id="catalog-search"
                          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          placeholder={
                            catalogSection === 'products'
                              ? 'Search product families…'
                              : 'Search raw materials…'
                          }
                          value={catalogSearch}
                          onChange={e => setCatalogSearch(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {catalogLoading ? (
              <div className="py-12 flex justify-center text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : catalogError ? (
              <p className="p-6 text-sm text-red-600">{catalogError}</p>
            ) : !employee.branchName ? (
              <p className="p-6 text-sm text-gray-500">Assign a branch to this employee before setting catalog access.</p>
            ) : catalogSection === 'products' ? (
              productGroupOptions.length === 0 ? (
                <p className="p-6 text-sm text-gray-500">No product families found for {employee.branchName}.</p>
              ) : !activeCatalogProductGroup ? (
                <p className="p-6 text-sm text-gray-500">Choose a category to view product families.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{activeCatalogProductGroup.categoryName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {visibleCatalogProducts.length} famil{visibleCatalogProducts.length === 1 ? 'y' : 'ies'}
                        {catalogSearch.trim() ? ' matching search' : ''}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 tabular-nums">
                      {activeCatalogProductGroup.items.filter(item => selectedProductIds.has(item.id)).length} of{' '}
                      {activeCatalogProductGroup.items.length} selected in this category
                    </p>
                  </div>
                  {visibleCatalogProducts.length === 0 ? (
                    <p className="p-6 text-sm text-gray-500">No product families match your search.</p>
                  ) : (
                    <>
                      <label className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleProductAllSelected}
                          ref={el => {
                            if (el) el.indeterminate = visibleProductSomeSelected;
                          }}
                          onChange={e => toggleProductCategoryAssignment(visibleCatalogProducts, e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-900">
                          {catalogSearch.trim() ? 'Select all shown' : 'Select all in this category'}
                        </span>
                      </label>
                      <ul className="divide-y divide-gray-100 max-h-[28rem] overflow-y-auto">
                        {visibleCatalogProducts.map(item => (
                          <li key={item.id} className="px-4 py-2.5 hover:bg-gray-50">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedProductIds.has(item.id)}
                                onChange={e => toggleProductAssignment(item.id, e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-800">{item.name}</span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )
            ) : materialGroupOptions.length === 0 ? (
              <p className="p-6 text-sm text-gray-500">No raw materials found for {employee.branchName}.</p>
            ) : !activeCatalogMaterialGroup ? (
              <p className="p-6 text-sm text-gray-500">Choose a category to view raw materials.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{activeCatalogMaterialGroup.categoryName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {visibleCatalogMaterials.length} material{visibleCatalogMaterials.length === 1 ? '' : 's'}
                      {catalogSearch.trim() ? ' matching search' : ''}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 tabular-nums">
                    {activeCatalogMaterialGroup.items.filter(item => selectedMaterialIds.has(item.id)).length} of{' '}
                    {activeCatalogMaterialGroup.items.length} selected in this category
                  </p>
                </div>
                {visibleCatalogMaterials.length === 0 ? (
                  <p className="p-6 text-sm text-gray-500">No raw materials match your search.</p>
                ) : (
                  <>
                    <label className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white cursor-pointer">
                      <input
                        type="checkbox"
                        checked={visibleMaterialAllSelected}
                        ref={el => {
                          if (el) el.indeterminate = visibleMaterialSomeSelected;
                        }}
                        onChange={e => toggleMaterialCategoryAssignment(visibleCatalogMaterials, e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-900">
                        {catalogSearch.trim() ? 'Select all shown' : 'Select all in this category'}
                      </span>
                    </label>
                    <ul className="divide-y divide-gray-100 max-h-[28rem] overflow-y-auto">
                      {visibleCatalogMaterials.map(item => (
                        <li key={item.id} className="px-4 py-2.5 hover:bg-gray-50">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedMaterialIds.has(item.id)}
                              onChange={e => toggleMaterialAssignment(item.id, e.target.checked)}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-800">
                              {item.name}
                              {item.sku ? <span className="text-gray-500"> · {item.sku}</span> : null}
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}

            {!catalogLoading && employee.branchName && !catalogError && (
              <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-gray-900 tabular-nums">{selectedProductIds.size}</span> product
                  famil{selectedProductIds.size === 1 ? 'y' : 'ies'} and{' '}
                  <span className="font-medium text-gray-900 tabular-nums">{selectedMaterialIds.size}</span> raw material
                  {selectedMaterialIds.size === 1 ? '' : 's'} selected across all categories.
                </p>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="shrink-0"
                  disabled={catalogSaving || catalogLoading}
                  onClick={() => void handleSaveCatalogAssignments()}
                >
                  {catalogSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Saving…
                    </>
                  ) : (
                    'Save all assignments'
                  )}
                </Button>
              </div>
            )}
          </div>
        );
      }

      case 'skills':
        return (
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-5 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500" aria-hidden />
                Skills
              </h2>
              {p.skills.length === 0 ? (
                <p className="text-sm text-gray-500">No skills recorded.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {p.skills.map((s) => {
                    const started = formatProfileDate(s.date_started);
                    const editing = skillEditId === s.id;
                    return (
                      <div
                        key={s.id}
                        className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 flex flex-col gap-3"
                      >
                        {editing ? (
                          <>
                            <div className="space-y-2">
                              <label className="text-xs text-gray-500">Skill name</label>
                              <input className={EDIT_INPUT_CLASS} value={skName} onChange={(e) => setSkName(e.target.value)} />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500">Level</label>
                              <select className={EDIT_INPUT_CLASS} value={skLevel} onChange={(e) => setSkLevel(e.target.value)}>
                                {SKILL_LEVEL_OPTIONS.map((x) => (
                                  <option key={x} value={x}>
                                    {x}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-xs text-gray-500">Description</label>
                              <textarea className={EDIT_INPUT_CLASS} rows={2} value={skDesc} onChange={(e) => setSkDesc(e.target.value)} />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500">Date started</label>
                              <input type="date" className={EDIT_INPUT_CLASS} value={skStarted} onChange={(e) => setSkStarted(e.target.value)} />
                            </div>
                            <div className="flex flex-wrap gap-2 pt-1">
                              <Button type="button" variant="outline" size="sm" onClick={() => setSkillEditId(null)}>
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                disabled={savingSection === `sk-${s.id}`}
                                onClick={() => {
                                  void (async () => {
                                    setSavingSection(`sk-${s.id}`);
                                    try {
                                      await updateEmployeeSkillRow(s.id, employee.id, {
                                        skill_name: skName,
                                        skill_level: skLevel,
                                        skill_description: skDesc || null,
                                        date_started: skStarted || null,
                                      });
                                      addAuditLog(
                                        'Employee profile',
                                        'Employee',
                                        `Updated skill "${skName}" for ${employee.employeeName}`,
                                      );
                                      setSkillEditId(null);
                                      await refreshProfileFromServer();
                                    } catch (e) {
                                      window.alert(e instanceof Error ? e.message : 'Save failed');
                                    } finally {
                                      setSavingSection(null);
                                    }
                                  })();
                                }}
                              >
                                {savingSection === `sk-${s.id}` ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  'Save'
                                )}
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-start justify-between gap-3">
                              <p className="font-semibold text-gray-900 leading-snug">{s.skill_name}</p>
                              <SkillLevelBadge level={s.skill_level} />
                            </div>
                            {s.skill_description?.trim() ? (
                              <p className="text-sm text-gray-600 leading-relaxed">{s.skill_description.trim()}</p>
                            ) : null}
                            <p className="text-xs text-gray-500">
                              <span className="font-medium text-gray-600">Date started:</span> {started ?? '—'}
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="self-start gap-1"
                              onClick={() => {
                                setSkillEditId(s.id);
                                setSkName(s.skill_name);
                                setSkLevel(s.skill_level);
                                setSkDesc(s.skill_description ?? '');
                                setSkStarted(s.date_started?.slice(0, 10) ?? '');
                              }}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              Edit
                            </Button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-5 flex items-center gap-2">
                <Award className="w-5 h-5 text-green-600" aria-hidden />
                Certifications
              </h2>
              {p.certifications.length === 0 ? (
                <p className="text-sm text-gray-500">No certifications.</p>
              ) : (
                <ul className="space-y-4">
                  {p.certifications.map((c) => {
                    const issued = formatProfileDate(c.issue_date);
                    const expires = formatProfileDate(c.expiry_date);
                    const editing = certEditId === c.id;
                    return (
                      <li key={c.id} className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-3">
                        {editing ? (
                          <>
                            <div>
                              <label className="text-xs text-gray-500">Certification</label>
                              <input className={EDIT_INPUT_CLASS} value={certName} onChange={(e) => setCertName(e.target.value)} />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500">Issuing organization</label>
                              <input className={EDIT_INPUT_CLASS} value={certOrg} onChange={(e) => setCertOrg(e.target.value)} />
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3">
                              <div className="flex-1">
                                <label className="text-xs text-gray-500">Issue date</label>
                                <input
                                  type="date"
                                  className={EDIT_INPUT_CLASS}
                                  value={certIssued}
                                  onChange={(e) => setCertIssued(e.target.value)}
                                />
                              </div>
                              <div className="flex-1">
                                <label className="text-xs text-gray-500">Expiry date</label>
                                <input
                                  type="date"
                                  className={EDIT_INPUT_CLASS}
                                  value={certExpiry}
                                  onChange={(e) => setCertExpiry(e.target.value)}
                                />
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-1">
                              <Button type="button" variant="outline" size="sm" onClick={() => setCertEditId(null)}>
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                disabled={savingSection === `cert-${c.id}`}
                                onClick={() => {
                                  void (async () => {
                                    setSavingSection(`cert-${c.id}`);
                                    try {
                                      await updateEmployeeCertificationRow(c.id, employee.id, {
                                        certification_name: certName,
                                        issuing_organization: certOrg || null,
                                        issue_date: certIssued || null,
                                        expiry_date: certExpiry || null,
                                      });
                                      addAuditLog(
                                        'Employee profile',
                                        'Employee',
                                        `Updated certification "${certName}" for ${employee.employeeName}`,
                                      );
                                      setCertEditId(null);
                                      await refreshProfileFromServer();
                                    } catch (e) {
                                      window.alert(e instanceof Error ? e.message : 'Save failed');
                                    } finally {
                                      setSavingSection(null);
                                    }
                                  })();
                                }}
                              >
                                {savingSection === `cert-${c.id}` ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  'Save'
                                )}
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="font-semibold text-gray-900">{c.certification_name}</p>
                            <p className="text-sm text-gray-600">
                              <span className="text-gray-500">Source:</span>{' '}
                              {c.issuing_organization?.trim() || '—'}
                            </p>
                            <div className="text-xs text-gray-600 space-y-0.5">
                              {issued ? (
                                <p>
                                  <span className="text-gray-500">Issued:</span> {issued}
                                </p>
                              ) : null}
                              {expires ? (
                                <p>
                                  <span className="text-gray-500">Expires:</span> {expires}
                                </p>
                              ) : null}
                              {!issued && !expires ? (
                                <p className="text-gray-400">No dates on file</p>
                              ) : null}
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              onClick={() => {
                                setCertEditId(c.id);
                                setCertName(c.certification_name);
                                setCertOrg(c.issuing_organization ?? '');
                                setCertIssued(c.issue_date?.slice(0, 10) ?? '');
                                setCertExpiry(c.expiry_date?.slice(0, 10) ?? '');
                              }}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              Edit
                            </Button>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-5 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-blue-600" aria-hidden />
                Training history
              </h2>
              {p.trainings.length === 0 ? (
                <p className="text-sm text-gray-500">No training history.</p>
              ) : (
                <ul className="space-y-4">
                  {p.trainings.map((t) => {
                    const completed = formatProfileDate(t.completion_date);
                    const editing = trEditId === t.id;
                    return (
                      <li
                        key={t.id}
                        className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 flex flex-col gap-3"
                      >
                        {editing ? (
                          <>
                            <div>
                              <label className="text-xs text-gray-500">Training</label>
                              <input className={EDIT_INPUT_CLASS} value={trName} onChange={(e) => setTrName(e.target.value)} />
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3">
                              <div className="flex-1">
                                <label className="text-xs text-gray-500">Duration</label>
                                <input className={EDIT_INPUT_CLASS} value={trDur} onChange={(e) => setTrDur(e.target.value)} />
                              </div>
                              <div className="flex-1">
                                <label className="text-xs text-gray-500">Completion date</label>
                                <input
                                  type="date"
                                  className={EDIT_INPUT_CLASS}
                                  value={trDone}
                                  onChange={(e) => setTrDone(e.target.value)}
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-xs text-gray-500">Instructor</label>
                              <input className={EDIT_INPUT_CLASS} value={trInst} onChange={(e) => setTrInst(e.target.value)} />
                            </div>
                            <div className="flex flex-wrap gap-2 pt-1">
                              <Button type="button" variant="outline" size="sm" onClick={() => setTrEditId(null)}>
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                disabled={savingSection === `tr-${t.id}`}
                                onClick={() => {
                                  void (async () => {
                                    setSavingSection(`tr-${t.id}`);
                                    try {
                                      await updateEmployeeTrainingRow(t.id, employee.id, {
                                        training_name: trName,
                                        duration: trDur || null,
                                        completion_date: trDone || null,
                                        instructor: trInst || null,
                                      });
                                      addAuditLog(
                                        'Employee profile',
                                        'Employee',
                                        `Updated training "${trName}" for ${employee.employeeName}`,
                                      );
                                      setTrEditId(null);
                                      await refreshProfileFromServer();
                                    } catch (e) {
                                      window.alert(e instanceof Error ? e.message : 'Save failed');
                                    } finally {
                                      setSavingSection(null);
                                    }
                                  })();
                                }}
                              >
                                {savingSection === `tr-${t.id}` ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  'Save'
                                )}
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="space-y-1.5 min-w-0">
                              <p className="font-semibold text-gray-900">{t.training_name}</p>
                              <p className="text-sm text-gray-600">
                                <span className="text-gray-500">Duration:</span>{' '}
                                {t.duration?.trim() || '—'}
                              </p>
                              <p className="text-sm text-gray-600">
                                <span className="text-gray-500">Completed:</span> {completed ?? '—'}
                              </p>
                              <p className="text-sm text-gray-600">
                                <span className="text-gray-500">Instructor:</span>{' '}
                                {t.instructor?.trim() || '—'}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="self-start gap-1"
                              onClick={() => {
                                setTrEditId(t.id);
                                setTrName(t.training_name);
                                setTrDur(t.duration ?? '');
                                setTrDone(t.completion_date?.slice(0, 10) ?? '');
                                setTrInst(t.instructor ?? '');
                              }}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              Edit
                            </Button>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        );

      case 'documents':
        return (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Folder className="w-5 h-5 text-blue-600" />
                Documents
              </h2>
            </div>

            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 p-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:items-end">
                <div className="flex flex-col gap-1 min-w-[200px] flex-1 basis-[220px]">
                  <label htmlFor="emp-doc-title" className="text-xs font-medium text-gray-600">
                    Document title
                  </label>
                  <input
                    id="emp-doc-title"
                    type="text"
                    value={docEntryTitle}
                    onChange={(e) => setDocEntryTitle(e.target.value)}
                    placeholder="e.g. 2024 employment contract"
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none w-full"
                  />
                </div>
                <div className="flex flex-col gap-1 min-w-[200px]">
                  <label htmlFor="emp-doc-type" className="text-xs font-medium text-gray-600">
                    Document type (this batch)
                  </label>
                  <select
                    id="emp-doc-type"
                    value={docUploadType}
                    onChange={(e) => setDocUploadType(e.target.value)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                  >
                    {EMPLOYEE_DOCUMENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setShowDocGallery(true)}
                  >
                    <Upload className="w-4 h-4" />
                    Image gallery
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => employeeDocPdfInputRef.current?.click()}
                  >
                    <Folder className="w-4 h-4" />
                    Add PDF
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    className="gap-2"
                    disabled={
                      docSaving || (pendingGalleryDocUrls.length === 0 && pendingDocFiles.length === 0)
                    }
                    onClick={() => void handleSavePendingEmployeeDocuments()}
                  >
                    {docSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Save to profile
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <input
                ref={employeeDocPdfInputRef}
                type="file"
                accept="application/pdf,.pdf"
                multiple
                className="hidden"
                onChange={handleEmployeeDocPdfInputChange}
              />

              {(pendingGalleryDocUrls.length > 0 || pendingDocFiles.length > 0) && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Staged</p>
                  <ul className="space-y-2">
                    {pendingGalleryDocUrls.map((url) => (
                      <li
                        key={url}
                        className="flex items-center justify-between gap-2 text-sm rounded-lg bg-white border border-gray-100 px-3 py-2"
                      >
                        <span className="truncate text-gray-800">{displayNameFromPublicUrl(url)}</span>
                        <span className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant="neutral" className="text-[10px]">
                            Image
                          </Badge>
                          <button
                            type="button"
                            className="text-red-600 text-xs font-medium hover:underline"
                            onClick={() => setPendingGalleryDocUrls((prev) => prev.filter((u) => u !== url))}
                          >
                            Remove
                          </button>
                        </span>
                      </li>
                    ))}
                    {pendingDocFiles.map((file) => (
                      <li
                        key={`${file.name}-${file.size}-${file.lastModified}`}
                        className="flex items-center justify-between gap-2 text-sm rounded-lg bg-white border border-gray-100 px-3 py-2"
                      >
                        <span className="truncate text-gray-800">{file.name}</span>
                        <span className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant="info" className="text-[10px]">
                            PDF · {formatEmployeeDocFileSize(file.size)}
                          </Badge>
                          <button
                            type="button"
                            className="text-red-600 text-xs font-medium hover:underline"
                            onClick={() =>
                              setPendingDocFiles((prev) =>
                                prev.filter(
                                  (f) =>
                                    !(
                                      f.name === file.name &&
                                      f.size === file.size &&
                                      f.lastModified === file.lastModified
                                    ),
                                ),
                              )
                            }
                          >
                            Remove
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {p.documents.length === 0 ? (
              <p className="text-sm text-gray-500">No documents on file yet.</p>
            ) : (
              <ul className="space-y-3">
                {p.documents.map((d) => {
                  const lower = d.document_name.toLowerCase();
                  const isLikelyImage =
                    /\.(jpe?g|png|gif|webp|avif|bmp|jfif)$/i.test(lower) ||
                    /(\/|%2F)[^/?]+?\.(jpe?g|png|gif|webp|avif|bmp|jfif)($|\?)/i.test(
                      d.file_url ?? '',
                    );
                  const thumbLabel = isLikelyImage ? 'IMG' : 'PDF';
                  return (
                  <li
                    key={d.id}
                    className="flex flex-wrap items-center justify-between gap-3 border border-gray-100 rounded-lg p-4 text-sm bg-white hover:border-gray-200 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-100 leading-tight text-center px-0.5">
                        {thumbLabel}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{d.document_name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <Badge variant="neutral" className="text-[10px]">
                            {d.document_type}
                          </Badge>
                          {d.file_size ? (
                            <Badge variant="outline" className="text-[10px]">
                              {d.file_size}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {d.uploaded_by ? `Uploaded by ${d.uploaded_by}` : 'Uploaded'}
                          {d.upload_date
                            ? ` on ${new Date(d.upload_date + 'T12:00:00').toLocaleDateString('en-PH', { dateStyle: 'medium' })}`
                            : ''}
                        </p>
                      </div>
                    </div>
                    {d.file_url ? (
                      <a
                        href={d.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </a>
                    ) : null}
                  </li>
                );
                })}
              </ul>
            )}
          </div>
        );

      case 'assets': {
        const cancelAssetAdd = () => {
          setAssetAddOpen(false);
          setNewAssetTitle('');
          setNewAssetDescription('');
          setNewAssetCategory('');
          setNewAssetDate('');
        };
        return (
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-purple-600" />
                  Company assets
                </h2>
                <div className="flex flex-wrap gap-2">
                  {assetAddOpen ? (
                    <Button type="button" variant="outline" size="sm" onClick={cancelAssetAdd}>
                      Cancel
                    </Button>
                  ) : (
                    <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setAssetAddOpen(true)}>
                      <Plus className="w-4 h-4" />
                      Add asset
                    </Button>
                  )}
                </div>
              </div>

              {assetAddOpen ? (
                <div className="p-6 border-b border-gray-100 bg-gray-50/50 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-800">New company asset</h3>
                  <div className="grid grid-cols-1 gap-4 max-w-2xl">
                    <div className="space-y-1">
                      <label htmlFor="emp-asset-title" className="text-xs font-medium text-gray-600">
                        Title
                      </label>
                      <input
                        id="emp-asset-title"
                        type="text"
                        value={newAssetTitle}
                        onChange={(e) => setNewAssetTitle(e.target.value)}
                        placeholder="e.g. Dell Latitude 5420"
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="emp-asset-desc" className="text-xs font-medium text-gray-600">
                        What it is
                      </label>
                      <textarea
                        id="emp-asset-desc"
                        value={newAssetDescription}
                        onChange={(e) => setNewAssetDescription(e.target.value)}
                        rows={4}
                        placeholder="Brief description of the asset…"
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none resize-y min-h-[100px]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="emp-asset-category" className="text-xs font-medium text-gray-600">
                        Item type
                      </label>
                      <input
                        id="emp-asset-category"
                        type="text"
                        value={newAssetCategory}
                        onChange={(e) => setNewAssetCategory(e.target.value)}
                        placeholder="e.g. Laptop, Mobile phone, Equipment"
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="emp-asset-date" className="text-xs font-medium text-gray-600">
                        Date given
                      </label>
                      <input
                        id="emp-asset-date"
                        type="date"
                        value={newAssetDate}
                        onChange={(e) => setNewAssetDate(e.target.value)}
                        className="w-full max-w-xs rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                      />
                    </div>
                    <div>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        className="gap-2"
                        disabled={assetSaving}
                        onClick={() => void handleAddEmployeeAsset()}
                      >
                        {assetSaving ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving…
                          </>
                        ) : (
                          <>
                            <Package className="w-4 h-4" />
                            Save asset
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}

              {p.assets.length === 0 && !assetAddOpen ? (
                <div className="p-10 text-center">
                  <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" aria-hidden />
                  <p className="text-sm text-gray-600 mb-4">No assets on file yet.</p>
                  <Button type="button" variant="primary" size="sm" className="gap-2" onClick={() => setAssetAddOpen(true)}>
                    <Plus className="w-4 h-4" />
                    Add first asset
                  </Button>
                </div>
              ) : p.assets.length === 0 ? (
                <p className="p-6 text-sm text-gray-500">Save the form above to add this employee&apos;s first asset.</p>
              ) : (
                <ul className="divide-y divide-gray-100 p-4 space-y-4">
                  {p.assets.map((a) => {
                    const given = formatProfileDate(a.assigned_date);
                    const typeDisplay = a.category_label?.trim() || a.asset_type || '—';
                    const desc = a.asset_description?.trim();
                    return (
                      <li key={a.id} className="rounded-lg border border-gray-100 bg-white p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-700 border border-purple-200">
                            <Package className="w-5 h-5" aria-hidden />
                          </div>
                          <div className="min-w-0 flex-1 space-y-3">
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Title</p>
                              <p className="text-base font-semibold text-gray-900 mt-0.5">{a.asset_name}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">What it is</p>
                              <p className={`text-sm mt-1 whitespace-pre-wrap leading-relaxed ${desc ? 'text-gray-800' : 'text-gray-400'}`}>
                                {desc || '—'}
                              </p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Item type</p>
                                <p className="text-sm text-gray-800 mt-1">{typeDisplay}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date given</p>
                                <p className="text-sm text-gray-800 mt-1">{given ?? '—'}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        );
      }

      case 'access':
        return (
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 sm:px-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-gray-600">Hover over a tile for details.</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                disabled={roleDefaultsApplying}
                onClick={() => void handleApplyRoleDefaults()}
              >
                {roleDefaultsApplying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Applying…
                  </>
                ) : (
                  'Apply role defaults'
                )}
              </Button>
            </div>
            {roleDefaultsMessage && (
              <p className="text-sm text-green-700">{roleDefaultsMessage}</p>
            )}
            {roleDefaultsError && (
              <p className="text-sm text-red-600">{roleDefaultsError}</p>
            )}
            <OrderPermissionSection
              value={orderPermDraft}
              savedValue={orderPermSaved}
              onChange={(next) => {
                setOrderPermDraft(next);
                setOrderPermSaveSuccess(false);
                setOrderPermError(null);
              }}
              onSave={handleSaveOrderPermissions}
              saving={orderPermSaving}
              loading={orderPermLoading}
              dirty={!orderPermissionSetsEqual(orderPermDraft, orderPermSaved)}
              saveError={orderPermError}
              saveSuccess={orderPermSaveSuccess}
            />
            <ProductPermissionSection
              value={productPermDraft}
              savedValue={productPermSaved}
              onChange={(next) => {
                setProductPermDraft(next);
                setProductPermSaveSuccess(false);
                setProductPermError(null);
              }}
              onSave={handleSaveProductPermissions}
              saving={productPermSaving}
              loading={productPermLoading}
              dirty={!productPermissionSetsEqual(productPermDraft, productPermSaved)}
              saveError={productPermError}
              saveSuccess={productPermSaveSuccess}
            />
            <MaterialPermissionSection
              value={materialPermDraft}
              savedValue={materialPermSaved}
              onChange={(next) => {
                setMaterialPermDraft(next);
                setMaterialPermSaveSuccess(false);
                setMaterialPermError(null);
              }}
              onSave={handleSaveMaterialPermissions}
              saving={materialPermSaving}
              loading={materialPermLoading}
              dirty={!materialPermissionSetsEqual(materialPermDraft, materialPermSaved)}
              saveError={materialPermError}
              saveSuccess={materialPermSaveSuccess}
            />
            <WarehousePermissionSection
              value={warehousePermDraft}
              savedValue={warehousePermSaved}
              onChange={(next) => {
                setWarehousePermDraft(next);
                setWarehousePermSaveSuccess(false);
                setWarehousePermError(null);
              }}
              onSave={handleSaveWarehousePermissions}
              saving={warehousePermSaving}
              loading={warehousePermLoading}
              dirty={!warehousePermissionSetsEqual(warehousePermDraft, warehousePermSaved)}
              saveError={warehousePermError}
              saveSuccess={warehousePermSaveSuccess}
            />
            <ProductionRequestPermissionSection
              value={productionRequestPermDraft}
              savedValue={productionRequestPermSaved}
              onChange={(next) => {
                setProductionRequestPermDraft(next);
                setProductionRequestPermSaveSuccess(false);
                setProductionRequestPermError(null);
              }}
              onSave={handleSaveProductionRequestPermissions}
              saving={productionRequestPermSaving}
              loading={productionRequestPermLoading}
              dirty={!productionRequestPermissionSetsEqual(productionRequestPermDraft, productionRequestPermSaved)}
              saveError={productionRequestPermError}
              saveSuccess={productionRequestPermSaveSuccess}
            />
            <PurchaseOrderPermissionSection
              value={purchaseOrderPermDraft}
              savedValue={purchaseOrderPermSaved}
              onChange={(next) => {
                setPurchaseOrderPermDraft(next);
                setPurchaseOrderPermSaveSuccess(false);
                setPurchaseOrderPermError(null);
              }}
              onSave={handleSavePurchaseOrderPermissions}
              saving={purchaseOrderPermSaving}
              loading={purchaseOrderPermLoading}
              dirty={!purchaseOrderPermissionSetsEqual(purchaseOrderPermDraft, purchaseOrderPermSaved)}
              saveError={purchaseOrderPermError}
              saveSuccess={purchaseOrderPermSaveSuccess}
            />
            <InterBranchRequestPermissionSection
              value={interBranchRequestPermDraft}
              savedValue={interBranchRequestPermSaved}
              onChange={(next) => {
                setInterBranchRequestPermDraft(next);
                setInterBranchRequestPermSaveSuccess(false);
                setInterBranchRequestPermError(null);
              }}
              onSave={handleSaveInterBranchRequestPermissions}
              saving={interBranchRequestPermSaving}
              loading={interBranchRequestPermLoading}
              dirty={!interBranchRequestPermissionSetsEqual(interBranchRequestPermDraft, interBranchRequestPermSaved)}
              saveError={interBranchRequestPermError}
              saveSuccess={interBranchRequestPermSaveSuccess}
            />
            <LogisticsPermissionSection
              value={logisticsPermDraft}
              savedValue={logisticsPermSaved}
              onChange={(next) => {
                setLogisticsPermDraft(next);
                setLogisticsPermSaveSuccess(false);
                setLogisticsPermError(null);
              }}
              onSave={handleSaveLogisticsPermissions}
              saving={logisticsPermSaving}
              loading={logisticsPermLoading}
              dirty={!logisticsPermissionSetsEqual(logisticsPermDraft, logisticsPermSaved)}
              saveError={logisticsPermError}
              saveSuccess={logisticsPermSaveSuccess}
            />
            <CustomerPermissionSection
              value={customerPermDraft}
              savedValue={customerPermSaved}
              onChange={(next) => {
                setCustomerPermDraft(next);
                setCustomerPermSaveSuccess(false);
                setCustomerPermError(null);
              }}
              onSave={handleSaveCustomerPermissions}
              saving={customerPermSaving}
              loading={customerPermLoading}
              dirty={!customerPermissionSetsEqual(customerPermDraft, customerPermSaved)}
              saveError={customerPermError}
              saveSuccess={customerPermSaveSuccess}
            />
            <SupplierPermissionSection
              value={supplierPermDraft}
              savedValue={supplierPermSaved}
              onChange={(next) => {
                setSupplierPermDraft(next);
                setSupplierPermSaveSuccess(false);
                setSupplierPermError(null);
              }}
              onSave={handleSaveSupplierPermissions}
              saving={supplierPermSaving}
              loading={supplierPermLoading}
              dirty={!supplierPermissionSetsEqual(supplierPermDraft, supplierPermSaved)}
              saveError={supplierPermError}
              saveSuccess={supplierPermSaveSuccess}
            />
            <FinancePermissionSection
              value={financePermDraft}
              savedValue={financePermSaved}
              onChange={(next) => {
                setFinancePermDraft(next);
                setFinancePermSaveSuccess(false);
                setFinancePermError(null);
              }}
              onSave={handleSaveFinancePermissions}
              saving={financePermSaving}
              loading={financePermLoading}
              dirty={!financePermissionSetsEqual(financePermDraft, financePermSaved)}
              saveError={financePermError}
              saveSuccess={financePermSaveSuccess}
            />
            <EmployeesPermissionSection
              value={employeesPermDraft}
              savedValue={employeesPermSaved}
              onChange={(next) => {
                setEmployeesPermDraft(next);
                setEmployeesPermSaveSuccess(false);
                setEmployeesPermError(null);
              }}
              onSave={handleSaveEmployeesPermissions}
              saving={employeesPermSaving}
              loading={employeesPermLoading}
              dirty={!employeesPermissionSetsEqual(employeesPermDraft, employeesPermSaved)}
              saveError={employeesPermError}
              saveSuccess={employeesPermSaveSuccess}
            />
            <AgentAnalyticsPermissionSection
              value={agentAnalyticsPermDraft}
              savedValue={agentAnalyticsPermSaved}
              onChange={(next) => {
                setAgentAnalyticsPermDraft(next);
                setAgentAnalyticsPermSaveSuccess(false);
                setAgentAnalyticsPermError(null);
              }}
              onSave={handleSaveAgentAnalyticsPermissions}
              saving={agentAnalyticsPermSaving}
              loading={agentAnalyticsPermLoading}
              dirty={!agentAnalyticsPermissionSetsEqual(agentAnalyticsPermDraft, agentAnalyticsPermSaved)}
              saveError={agentAnalyticsPermError}
              saveSuccess={agentAnalyticsPermSaveSuccess}
            />
            <ReportsPermissionSection
              value={reportsPermDraft}
              savedValue={reportsPermSaved}
              onChange={(next) => {
                setReportsPermDraft(next);
                setReportsPermSaveSuccess(false);
                setReportsPermError(null);
              }}
              onSave={handleSaveReportsPermissions}
              saving={reportsPermSaving}
              loading={reportsPermLoading}
              dirty={!reportsPermissionSetsEqual(reportsPermDraft, reportsPermSaved)}
              saveError={reportsPermError}
              saveSuccess={reportsPermSaveSuccess}
            />
            <SettingsPermissionSection
              value={settingsPermDraft}
              savedValue={settingsPermSaved}
              onChange={(next) => {
                setSettingsPermDraft(next);
                setSettingsPermSaveSuccess(false);
                setSettingsPermError(null);
              }}
              onSave={handleSaveSettingsPermissions}
              saving={settingsPermSaving}
              loading={settingsPermLoading}
              dirty={!settingsPermissionSetsEqual(settingsPermDraft, settingsPermSaved)}
              saveError={settingsPermError}
              saveSuccess={settingsPermSaveSuccess}
            />
          </div>
        );

      case 'activity':
        return (
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-5 flex items-center gap-2">
                <ActivityLineIcon className="w-5 h-5 text-blue-600" aria-hidden />
                Recent activity
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Combines HR activity records with order, purchase, inter-branch, and production logs when the
                system recorded you as the person who performed the action.
              </p>
              {p.activityFeed.length === 0 ? (
                <p className="text-sm text-gray-500">No activity entries found.</p>
              ) : (
                <>
                  <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                    {paginatedActivity.map((item) => (
                      <li key={item.id} className="flex gap-4 p-4 bg-white hover:bg-gray-50/80 transition-colors">
                        <div
                          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${activityFeedVariantIconClass(item.variant)}`}
                        >
                          <ActivityLineIcon className="w-5 h-5" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900 text-sm leading-snug">{item.headline}</p>
                          <p className="text-xs text-gray-500 mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="tabular-nums">{formatActivityLogTimestamp(item.timestamp)}</span>
                            <Badge variant="outline" className="text-[10px] font-normal">
                              {item.category}
                            </Badge>
                            {item.location ? (
                              <span className="inline-flex items-center gap-1 text-gray-500">
                                <MapPin className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />
                                {item.location}
                              </span>
                            ) : null}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {p.activityFeed.length > ACTIVITY_PAGE_SIZE && (
                    <TablePagination
                      page={safeActivityPage}
                      total={p.activityFeed.length}
                      pageSize={ACTIVITY_PAGE_SIZE}
                      onPageChange={setActivityPage}
                      className="rounded-b-xl border-x border-b border-gray-100 -mt-px"
                    />
                  )}
                </>
              )}
            </div>

            {p.notes.length > 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">All HR notes</h2>
                <ul className="space-y-3">
                  {p.notes.map((n) => (
                    <li key={n.id} className="text-sm border-b border-gray-100 pb-3 last:border-0">
                      <p className="text-xs text-gray-500">
                        {n.note_type}
                        {n.created_at
                          ? ` · ${new Date(n.created_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}`
                          : ''}
                      </p>
                      <p className="text-gray-800 whitespace-pre-wrap">{n.note}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Button variant="ghost" className="self-start" onClick={() => navigate('/employees')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Employees
        </Button>
      </div>

      {/* Hero */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowPfpGallery(true)}
              disabled={pfpSaving}
              className="group relative rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
              aria-label="Change profile photo — open image gallery"
            >
              {employee.profilePhoto ? (
                <img
                  src={employee.profilePhoto}
                  alt=""
                  className="h-24 w-24 rounded-2xl border border-gray-200 object-cover transition group-hover:brightness-95"
                />
              ) : (
                <div
                  className={`flex h-24 w-24 items-center justify-center rounded-2xl border-2 transition group-hover:brightness-95 ${getRoleColorClass(employee.role)}`}
                >
                  <User className="h-12 w-12 opacity-80" />
                </div>
              )}
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-black/0 transition-colors group-hover:bg-black/30">
                <span className="flex h-9 w-9 scale-90 items-center justify-center rounded-full bg-white/90 text-gray-800 opacity-0 shadow transition-all group-hover:scale-100 group-hover:opacity-100">
                  <Camera className="h-4 w-4" aria-hidden />
                </span>
              </span>
              {pfpSaving ? (
                <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/75">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" aria-hidden />
                </span>
              ) : null}
            </button>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 gap-y-2">
              <h1 className="text-2xl font-bold text-gray-900 truncate">{employee.employeeName}</h1>
              {employee.role ? (
                <Badge variant="default" className={`text-xs border ${getRoleColorClass(employee.role)}`}>
                  <RoleIcon className="w-3.5 h-3.5 mr-1 inline" />
                  {employee.role}
                </Badge>
              ) : (
                <Badge variant="neutral">No role</Badge>
              )}
              <Badge variant={statusBadgeVariant(employee.status)}>
                {employee.status.replace(/-/g, ' ')}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1 font-mono">{employee.employeeId}</p>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-gray-400" />
                {employee.branchName ?? '—'}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-gray-400" />
                {employee.department ?? '—'}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-gray-400" />
                Joined {joinLabel} · {employee.tenure} mo.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs — grid layout to match legacy Agent Profile */}
      <div className="rounded-2xl bg-gray-100 p-3">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {visibleTabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-center text-xs sm:text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-white' : 'text-gray-600'}`} />
                <span className="leading-tight">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>{renderTabContent()}</div>

      {showDocGallery && employee?.id ? (
        <ImageGalleryModal
          isOpen={showDocGallery}
          onClose={() => setShowDocGallery(false)}
          folder={`${EMPLOYEE_DOCS_STORAGE_ROOT}/${employee.id}`}
          maxImages={25}
          currentImages={pendingGalleryDocUrls}
          onSelectImages={(urls) => {
            setPendingGalleryDocUrls(urls);
            setShowDocGallery(false);
          }}
        />
      ) : null}

      {showPfpGallery && employee?.id ? (
        <ImageGalleryModal
          isOpen={showPfpGallery}
          onClose={() => setShowPfpGallery(false)}
          folder={`${EMPLOYEE_AVATARS_STORAGE_ROOT}/${employee.id}`}
          maxImages={1}
          currentImageUrl={employee.profilePhoto ?? undefined}
          onSelectImage={(url) => {
            void handleProfilePhotoSelected(url);
          }}
        />
      ) : null}

      <PortalModalOverlay
        open={agentOrdersPeriodModalOpen}
        onClose={() => setAgentOrdersPeriodModalOpen(false)}
        mobileBottomSheet
      >
          <div
            className="bg-white w-full sm:max-w-lg sm:rounded-xl shadow-xl max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="agent-orders-period-modal-title"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h2 id="agent-orders-period-modal-title" className="text-lg font-semibold text-gray-900">
                Order period
              </h2>
              <button
                type="button"
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                aria-label="Close"
                onClick={() => setAgentOrdersPeriodModalOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-600">
                Choose a preset or custom range. The order list is filtered by order date.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {DATE_PERIOD_OPTIONS.map(({ kind, label }) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => handleAgentOrdersModalPresetPick(kind)}
                    className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                      draftAgentOrdersPeriodKind === kind
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {draftAgentOrdersPeriodKind === 'custom' && (
                <div className="space-y-2 pt-1 border-t border-gray-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-xs font-medium text-gray-600 w-full sm:w-auto">From</label>
                    <input
                      type="date"
                      value={draftAgentOrdersCustomStart}
                      max={maxAgentOrdersCustomDate}
                      onChange={e => setDraftAgentOrdersCustomStart(e.target.value)}
                      className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <label className="text-xs font-medium text-gray-600">To</label>
                    <input
                      type="date"
                      value={draftAgentOrdersCustomEnd}
                      min={draftAgentOrdersCustomStart || undefined}
                      max={maxAgentOrdersCustomDate}
                      onChange={e => setDraftAgentOrdersCustomEnd(e.target.value)}
                      className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  {draftAgentOrdersCustomInvalid && (
                    <p className="text-xs text-red-600">Start must be on or before end.</p>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 p-4 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={() => setAgentOrdersPeriodModalOpen(false)}>
                Cancel
              </Button>
              {draftAgentOrdersPeriodKind === 'custom' && (
                <Button
                  type="button"
                  variant="primary"
                  disabled={draftAgentOrdersCustomInvalid || !draftAgentOrdersCustomStart || !draftAgentOrdersCustomEnd}
                  onClick={applyAgentOrdersModalCustomRange}
                >
                  Apply range
                </Button>
              )}
            </div>
          </div>
      </PortalModalOverlay>

      <PortalModalOverlay
        open={tripHistoryPeriodModalOpen}
        onClose={() => setTripHistoryPeriodModalOpen(false)}
        mobileBottomSheet
      >
          <div
            className="bg-white w-full sm:max-w-lg sm:rounded-xl shadow-xl max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="trip-history-period-modal-title"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h2 id="trip-history-period-modal-title" className="text-lg font-semibold text-gray-900">
                Trip period
              </h2>
              <button
                type="button"
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                aria-label="Close"
                onClick={() => setTripHistoryPeriodModalOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-600">
                Choose a preset or custom range. The trip list is filtered by scheduled date.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {DATE_PERIOD_OPTIONS.map(({ kind, label }) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => handleTripHistoryModalPresetPick(kind)}
                    className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                      draftTripHistoryPeriodKind === kind
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {draftTripHistoryPeriodKind === 'custom' && (
                <div className="space-y-2 pt-1 border-t border-gray-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-xs font-medium text-gray-600 w-full sm:w-auto">From</label>
                    <input
                      type="date"
                      value={draftTripHistoryCustomStart}
                      max={maxTripHistoryCustomDate}
                      onChange={e => setDraftTripHistoryCustomStart(e.target.value)}
                      className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <label className="text-xs font-medium text-gray-600">To</label>
                    <input
                      type="date"
                      value={draftTripHistoryCustomEnd}
                      min={draftTripHistoryCustomStart || undefined}
                      max={maxTripHistoryCustomDate}
                      onChange={e => setDraftTripHistoryCustomEnd(e.target.value)}
                      className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  {draftTripHistoryCustomInvalid && (
                    <p className="text-xs text-red-600">Start must be on or before end.</p>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 p-4 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={() => setTripHistoryPeriodModalOpen(false)}>
                Cancel
              </Button>
              {draftTripHistoryPeriodKind === 'custom' && (
                <Button
                  type="button"
                  variant="primary"
                  disabled={
                    draftTripHistoryCustomInvalid || !draftTripHistoryCustomStart || !draftTripHistoryCustomEnd
                  }
                  onClick={applyTripHistoryModalCustomRange}
                >
                  Apply range
                </Button>
              )}
            </div>
          </div>
      </PortalModalOverlay>

      <PortalModalOverlay
        open={warehouseRequestsPeriodModalOpen}
        onClose={() => setWarehouseRequestsPeriodModalOpen(false)}
        mobileBottomSheet
      >
          <div
            className="bg-white w-full sm:max-w-lg sm:rounded-xl shadow-xl max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="warehouse-requests-period-modal-title"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h2 id="warehouse-requests-period-modal-title" className="text-lg font-semibold text-gray-900">
                Request period
              </h2>
              <button
                type="button"
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                aria-label="Close"
                onClick={() => setWarehouseRequestsPeriodModalOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-600">
                Choose a preset or custom range. Both lists filter by request / order date.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {DATE_PERIOD_OPTIONS.map(({ kind, label }) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => handleWarehouseRequestsModalPresetPick(kind)}
                    className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                      draftWarehouseRequestsPeriodKind === kind
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {draftWarehouseRequestsPeriodKind === 'custom' && (
                <div className="space-y-2 pt-1 border-t border-gray-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-xs font-medium text-gray-600 w-full sm:w-auto">From</label>
                    <input
                      type="date"
                      value={draftWarehouseRequestsCustomStart}
                      max={maxWarehouseRequestsCustomDate}
                      onChange={e => setDraftWarehouseRequestsCustomStart(e.target.value)}
                      className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <label className="text-xs font-medium text-gray-600">To</label>
                    <input
                      type="date"
                      value={draftWarehouseRequestsCustomEnd}
                      min={draftWarehouseRequestsCustomStart || undefined}
                      max={maxWarehouseRequestsCustomDate}
                      onChange={e => setDraftWarehouseRequestsCustomEnd(e.target.value)}
                      className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  {draftWarehouseRequestsCustomInvalid && (
                    <p className="text-xs text-red-600">Start must be on or before end.</p>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 p-4 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={() => setWarehouseRequestsPeriodModalOpen(false)}>
                Cancel
              </Button>
              {draftWarehouseRequestsPeriodKind === 'custom' && (
                <Button
                  type="button"
                  variant="primary"
                  disabled={
                    draftWarehouseRequestsCustomInvalid ||
                    !draftWarehouseRequestsCustomStart ||
                    !draftWarehouseRequestsCustomEnd
                  }
                  onClick={applyWarehouseRequestsModalCustomRange}
                >
                  Apply range
                </Button>
              )}
            </div>
          </div>
      </PortalModalOverlay>

      {tripDetailTrip && (
        <TripDetailsModal
          isOpen={tripDetailOpen}
          onClose={() => {
            setTripDetailOpen(false);
            setTripDetailTrip(null);
          }}
          trip={tripDetailTrip}
          onEdit={() => setTripDetailOpen(false)}
        />
      )}

    </div>
  );
}
