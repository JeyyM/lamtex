import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Search, Filter, ChevronDown,
  UserCheck, Truck, Package, Briefcase,
  MapPin, Calendar, Loader2, AlertCircle,
  Plus, Download,
} from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { StatKpiCard } from '@/src/components/ui/StatKpiCard';
import { downloadEmployeesWorkbook } from '@/src/lib/employeesExport';
import type { EmployeeRole } from '@/src/types/employee';
import {
  fetchBranchOptions,
  fetchEmployeesWithPerformance,
  type BranchOption,
  type EmployeePerfRow,
} from '@/src/lib/employeesData';
import { useAppContext } from '@/src/store/AppContext';

const SUPPORTED_ROLES: EmployeeRole[] = [
  'Sales Agent',
  'Logistics Manager',
  'Warehouse Manager',
  'Truck Driver',
];

/** Format ₱ with K/M suffix for compact card display. */
function formatPesoCompact(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const n = Math.abs(value);
  if (n >= 1_000_000) return `₱${(value / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000) return `₱${Math.round(value / 1000)}K`;
  return `₱${value.toLocaleString()}`;
}

/** Strip leading "Branch - name" when branch matches (avoids repeating territory on cards). */
function directoryCardDisplayName(emp: EmployeePerfRow): string {
  const raw = emp.employeeName?.trim() ?? '';
  const br = emp.branchName?.trim();
  if (!br || !raw) return raw;
  const escaped = br.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^${escaped}\\s*[-–—]\\s*`, 'i');
  const stripped = raw.replace(re, '').trim();
  return stripped || raw;
}

const EmployeesPage: React.FC = () => {
  const { branch: navbarBranch, addAuditLog } = useAppContext();

  const [employees, setEmployees] = useState<EmployeePerfRow[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<EmployeeRole | 'all'>('all');
  /** `''` here means "follow navbar branch"; `'all'` means show every branch. */
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [exportingEmployees, setExportingEmployees] = useState(false);

  /** Active branch id used by filtering: follow navbar branch unless the user picked one. */
  const effectiveBranchId = useMemo(() => {
    if (selectedBranchId === 'all') return 'all';
    if (selectedBranchId) return selectedBranchId;
    const nav = navbarBranch?.trim();
    if (!nav) return 'all';
    const hit = branches.find((b) => b.name.trim().toLowerCase() === nav.toLowerCase());
    return hit?.id ?? 'all';
  }, [selectedBranchId, navbarBranch, branches]);

  /** Branch UUID passed to Add employee: explicit filter, else top-bar branch, else empty (user picks on form). */
  const branchIdForNewEmployee = useMemo(() => {
    if (effectiveBranchId !== 'all') return effectiveBranchId;
    const nav = navbarBranch?.trim();
    if (!nav) return '';
    const hit = branches.find((b) => b.name.trim().toLowerCase() === nav.toLowerCase());
    return hit?.id ?? '';
  }, [effectiveBranchId, navbarBranch, branches]);

  const newEmployeeHref = branchIdForNewEmployee
    ? `/employees/new?branchId=${encodeURIComponent(branchIdForNewEmployee)}`
    : '/employees/new';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [emps, br] = await Promise.all([
          fetchEmployeesWithPerformance(),
          fetchBranchOptions(),
        ]);
        if (cancelled) return;
        setEmployees(emps);
        setBranches(br);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : 'Failed to load employees';
        setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredEmployees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return employees.filter((e) => {
      const matchesSearch =
        !q ||
        e.employeeName.toLowerCase().includes(q) ||
        e.employeeId.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q);
      const matchesRole = selectedRole === 'all' || e.role === selectedRole;
      const matchesBranch = effectiveBranchId === 'all' || e.branchId === effectiveBranchId;
      return matchesSearch && matchesRole && matchesBranch;
    });
  }, [employees, searchQuery, selectedRole, effectiveBranchId]);

  const roleStats = useMemo(() => {
    const counts: Record<EmployeeRole, number> = {
      'Sales Agent': 0,
      'Logistics Manager': 0,
      'Warehouse Manager': 0,
      'Truck Driver': 0,
    };
    const pool =
      effectiveBranchId === 'all'
        ? employees
        : employees.filter((e) => e.branchId === effectiveBranchId);
    for (const e of pool) {
      if (e.role && e.role in counts) counts[e.role as EmployeeRole] += 1;
    }
    return counts;
  }, [employees, effectiveBranchId]);

  const groupedEmployees = useMemo(() => {
    const out: Record<EmployeeRole, EmployeePerfRow[]> = {
      'Sales Agent': [],
      'Logistics Manager': [],
      'Warehouse Manager': [],
      'Truck Driver': [],
    };
    for (const e of filteredEmployees) {
      if (e.role && e.role in out) out[e.role as EmployeeRole].push(e);
    }
    return out;
  }, [filteredEmployees]);

  const exportBranchLabel = useMemo(() => {
    if (effectiveBranchId === 'all') return 'All branches';
    return branches.find(b => b.id === effectiveBranchId)?.name ?? navbarBranch ?? 'All branches';
  }, [effectiveBranchId, branches, navbarBranch]);

  const handleExportEmployees = async () => {
    if (exportingEmployees || loading || filteredEmployees.length === 0) return;
    setExportingEmployees(true);
    try {
      await downloadEmployeesWorkbook({
        branchLabel: exportBranchLabel,
        rows: filteredEmployees,
      });
      addAuditLog(
        'Exported employees workbook',
        'Employee',
        `${filteredEmployees.length} employee${filteredEmployees.length !== 1 ? 's' : ''} (${exportBranchLabel})`,
      );
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setExportingEmployees(false);
    }
  };

  const getRoleIcon = (role: EmployeeRole) => {
    switch (role) {
      case 'Sales Agent': return UserCheck;
      case 'Logistics Manager': return Truck;
      case 'Warehouse Manager': return Package;
      case 'Truck Driver': return Truck;
      default: return Users;
    }
  };

  const getRoleColor = (role: EmployeeRole) => {
    switch (role) {
      case 'Sales Agent': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Logistics Manager': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Warehouse Manager': return 'bg-green-100 text-green-700 border-green-200';
      case 'Truck Driver': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const renderEmployeeDetails = (employee: EmployeePerfRow) => {
    switch (employee.role) {
      case 'Sales Agent':
        return (
          <>
            <div>
              <span className="text-gray-600">Customers</span>
              <p className="font-semibold text-gray-900">{employee.activeCustomers.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-gray-600">Revenue</span>
              <p className="font-semibold text-gray-900">{formatPesoCompact(employee.totalRevenue)}</p>
            </div>
            <div>
              <span className="text-gray-600">Commission</span>
              <p className="font-semibold text-gray-900">{formatPesoCompact(employee.commission)}</p>
            </div>
          </>
        );
      case 'Logistics Manager':
        return (
          <>
            <div>
              <span className="text-gray-600">On-time rate</span>
              <p className="font-semibold text-gray-900">
                {employee.onTimeSchedulingRate == null ? '—' : `${employee.onTimeSchedulingRate}%`}
              </p>
            </div>
            <div>
              <span className="text-gray-600">Fleet utilization</span>
              <p className="font-semibold text-gray-900">
                {employee.fleetUtilizationPercent == null ? '—' : `${employee.fleetUtilizationPercent}%`}
              </p>
            </div>
            <div>
              <span className="text-gray-600">Trips (90d)</span>
              <p className="font-semibold text-gray-900">{employee.tripsLast90Days.toLocaleString()}</p>
            </div>
          </>
        );
      case 'Warehouse Manager':
        return (
          <>
            <div>
              <span className="text-gray-600">PO + PR (90d)</span>
              <p className="font-semibold text-gray-900">{employee.poPrCountLast90Days.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-gray-600">Stock Gaps</span>
              <p className="font-semibold text-gray-900">{employee.stockGapsCount.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-gray-600">PO/PR on-time</span>
              <p className="font-semibold text-gray-900">
                {employee.poPrOnTimeCompletionRate == null ? '—' : `${employee.poPrOnTimeCompletionRate}%`}
              </p>
            </div>
          </>
        );
      case 'Truck Driver':
        return (
          <div>
            <span className="text-gray-600">Completed trips</span>
            <p className="font-semibold text-gray-900">{employee.completedTrips.toLocaleString()}</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Employees</h1>
          <p className="text-gray-600 mt-1">Manage all company employees across departments</p>
        </div>
        <Link
          to={newEmployeeHref}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 px-4 py-2.5 text-sm font-medium transition-colors w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          Add employee
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatKpiCard label="Sales Agents" value={String(roleStats['Sales Agent'])} tone="blue" icon={<UserCheck />} />
        <StatKpiCard label="Logistics Mgrs" value={String(roleStats['Logistics Manager'])} tone="violet" icon={<Briefcase />} />
        <StatKpiCard label="Warehouse Mgrs" value={String(roleStats['Warehouse Manager'])} tone="emerald" icon={<Package />} />
        <StatKpiCard label="Truck Drivers" value={String(roleStats['Truck Driver'])} tone="amber" icon={<Truck />} />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          {/* Search */}
          <div className="flex-1 relative min-w-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search employees by name, ID, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap gap-3 lg:shrink-0">
          {/* Role Filter */}
          <div className="relative w-full sm:w-auto">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as EmployeeRole | 'all')}
              className="w-full sm:w-auto pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white sm:min-w-[200px]"
            >
              <option value="all">All Roles</option>
              <option value="Sales Agent">Sales Agents</option>
              <option value="Logistics Manager">Logistics Managers</option>
              <option value="Warehouse Manager">Warehouse Managers</option>
              <option value="Truck Driver">Truck Drivers</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
          </div>

          {/* Branch Filter */}
          <div className="relative w-full sm:w-auto">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={selectedBranchId || effectiveBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full sm:w-auto pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white sm:min-w-[180px]"
            >
              <option value="all">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 h-[42px] w-full sm:w-auto whitespace-nowrap"
            disabled={exportingEmployees || loading || filteredEmployees.length === 0}
            onClick={() => void handleExportEmployees()}
          >
            {exportingEmployees ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
            ) : (
              <Download className="w-4 h-4" aria-hidden />
            )}
            {exportingEmployees ? 'Exporting…' : 'Export'}
          </Button>
          </div>
        </div>

        {/* Results count */}
        <div className="mt-3 text-sm text-gray-600">
          Showing <span className="font-semibold text-gray-900">{filteredEmployees.length}</span> of{' '}
          <span className="font-semibold text-gray-900">{employees.length}</span> employees
        </div>
      </div>

      {/* Loading / error */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center justify-center text-gray-500 gap-3">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm">Loading employees…</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-900">Failed to load employees</p>
            <p className="text-sm text-red-800 mt-1">{error}</p>
          </div>
        </div>
      ) : (
        <>
          {/* Grouped Employee Sections */}
          <div className="space-y-8">
            {SUPPORTED_ROLES.map((role) => {
              const list = groupedEmployees[role];
              if (!list || list.length === 0) return null;

              const RoleIcon = getRoleIcon(role);
              const roleColor = getRoleColor(role);

              return (
                <div key={role}>
                  {/* Role Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${roleColor}`}>
                      <RoleIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{role}s</h2>
                      <p className="text-sm text-gray-600">
                        {list.length} employee{list.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Employee Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {list.map((employee) => (
                      <Link
                        key={employee.id}
                        to={`/employees/${encodeURIComponent(employee.employeeId)}`}
                        className="bg-white rounded-lg border-2 border-gray-200 p-5 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer group block no-underline text-inherit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${roleColor}`}>
                              <RoleIcon className="w-6 h-6" />
                            </div>
                            <div>
                              <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                {directoryCardDisplayName(employee)}
                              </h3>
                              <p className="text-xs text-gray-600">{employee.employeeId}</p>
                            </div>
                          </div>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              employee.status === 'active'
                                ? 'bg-green-100 text-green-700'
                                : employee.status === 'on-leave'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {employee.status.charAt(0).toUpperCase() +
                              employee.status.slice(1).replace('-', ' ')}
                          </span>
                        </div>

                        {/* Info */}
                        <div className="space-y-2 mb-4 text-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar className="w-4 h-4" />
                            <span>{employee.tenure} months</span>
                          </div>
                        </div>

                        {/* Role-specific details */}
                        <div className="pt-4 border-t border-gray-200">
                          <div className="grid grid-cols-2 gap-3 text-sm">{renderEmployeeDetails(employee)}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty state */}
          {filteredEmployees.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">No employees found</h3>
              <p className="text-gray-600">
                {employees.length === 0
                  ? 'Add employees to your database to see them here.'
                  : 'Try adjusting your search or filter criteria.'}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EmployeesPage;
