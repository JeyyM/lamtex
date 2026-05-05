import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, MapPin, UserPlus, Eye, EyeOff } from 'lucide-react';
import type { EmployeeRole } from '@/src/types/employee';
import { fetchBranchOptions, type BranchOption } from '@/src/lib/employeesData';
import {
  insertEmployeeDirectoryRow,
  createEmployeeAuthAccount,
  upsertEmployeeEmploymentInfo,
} from '@/src/lib/employeeProfileMutations';
import { useAppContext } from '@/src/store/AppContext';
import { Button } from '@/src/components/ui/Button';

/** Directory `employees.role` (job category in the org); job title is stored in employment `position`. */
const DEFAULT_DIRECTORY_ROLE: EmployeeRole = 'Sales Agent';

function humanizeAuthAccountError(code: string | undefined): string {
  switch (code) {
    case 'forbidden':
      return 'Only an Executive with a linked login can set the initial password here. Leave password blank to skip, or sign in as an Executive.';
    case 'not_authenticated':
      return 'Your session expired. Sign in again.';
    case 'employee_not_found':
      return 'Employee record not found for login setup.';
    case 'already_linked':
      return 'A login was already linked.';
    case 'password_too_short':
      return 'Password must be at least 8 characters.';
    case 'auth_email_claimed':
      return 'This email is already used by another auth account.';
    default:
      if (code && /function .* does not exist|schema cache/i.test(code)) {
        const hint =
          '\n\nCommon causes: the SQL was run on a different Supabase project than VITE_SUPABASE_URL in .env.local; the script errored before CREATE finished; or the API schema cache is stale (try NOTIFY pgrst, \'reload schema\'; in the SQL editor).';
        return `The app could not call create_employee_auth_account.${hint}\n\nServer message:\n${code}`;
      }
      return code ?? 'Unknown error';
  }
}

export default function EmployeeNewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paramBranchId = searchParams.get('branchId')?.trim() || '';

  const { branch: navbarBranch, addAuditLog } = useAppContext();

  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);

  const [employeeId, setEmployeeId] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [joinDate, setJoinDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [branchId, setBranchId] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [dashboardRole, setDashboardRole] = useState<'Agent' | 'Logistics' | 'Warehouse' | 'Driver'>('Agent');

  const [loginPassword, setLoginPassword] = useState('');
  const [loginPasswordConfirm, setLoginPasswordConfirm] = useState('');
  const [showLoginPw, setShowLoginPw] = useState(false);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingBranches(true);
      try {
        const br = await fetchBranchOptions();
        if (cancelled) return;
        setBranches(br);
      } finally {
        if (!cancelled) setLoadingBranches(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Pre-fill branch: URL → then navbar match → leave empty */
  useEffect(() => {
    if (branches.length === 0) return;
    if (paramBranchId && branches.some((b) => b.id === paramBranchId)) {
      setBranchId(paramBranchId);
      return;
    }
    const nav = navbarBranch?.trim();
    if (nav) {
      const hit = branches.find((b) => b.name.trim().toLowerCase() === nav.toLowerCase());
      if (hit) setBranchId(hit.id);
    }
  }, [branches, paramBranchId, navbarBranch]);

  const branchLabel = useMemo(() => {
    const b = branches.find((x) => x.id === branchId);
    return b?.name ?? null;
  }, [branches, branchId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const pw = loginPassword.trim();
      const pw2 = loginPasswordConfirm.trim();
      if (pw || pw2) {
        if (pw.length < 8) {
          window.alert('Password must be at least 8 characters.');
          return;
        }
        if (pw !== pw2) {
          window.alert('Password and confirmation do not match.');
          return;
        }
      }

      const { id: employeeUuid } = await insertEmployeeDirectoryRow({
        employee_id: employeeId,
        employee_name: employeeName,
        email,
        role: DEFAULT_DIRECTORY_ROLE,
        branch_id: branchId || null,
        join_date: joinDate,
        phone: phone || null,
        user_role: dashboardRole,
      });

      await upsertEmployeeEmploymentInfo(employeeUuid, {
        employment_status: 'Full-time',
        position: jobTitle.trim() || null,
        department: null,
        reporting_to: null,
        branch_manager_name: null,
        work_schedule_days: null,
        work_start_time: null,
        work_end_time: null,
        shift: null,
      });
      addAuditLog(
        'Employee created',
        'Employee',
        `${employeeName} (${employeeId.trim()})${branchLabel ? ` · ${branchLabel}` : ''}`,
      );

      let authWarning: string | null = null;
      if (pw) {
        const authRes = await createEmployeeAuthAccount(employeeUuid, pw);
        if (!authRes.ok) {
          authWarning = humanizeAuthAccountError(authRes.error);
        } else {
          addAuditLog(
            'Employee login',
            'Employee',
            `Initial app login set for ${employeeName} (${employeeId.trim()})`,
          );
        }
      }

      navigate(`/employees/${encodeURIComponent(employeeId.trim())}`, { replace: true });
      if (authWarning) {
        window.alert(
          `Employee was created, but app login could not be set:\n\n${authWarning}\n\nRetry from an Executive session or set the account in Supabase Auth when ready.`,
        );
      }
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not create employee');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-3 sm:p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          to="/employees"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Employees
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <UserPlus className="w-7 h-7 text-blue-600" />
          Add employee
        </h1>
        <p className="text-gray-600 mt-1 text-sm sm:text-base">
          Creates a directory record for{' '}
          <span className="font-medium text-gray-800">
            {branchLabel ?? navbarBranch?.trim() ?? 'your selected branch'}
          </span>
          . Use the employee profile to add HR details. Optional password below sets initial app login.
        </p>
      </div>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-5"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              disabled={loadingBranches}
              required
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:opacity-50"
            >
              <option value="">{loadingBranches ? 'Loading branches…' : 'Select branch'}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          {paramBranchId ? (
            <p className="text-xs text-gray-500 mt-1">Pre-filled from the Employees page filter or top bar branch.</p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
            <input
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="e.g. AGT-BTG-004"
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Join date</label>
            <input
              type="date"
              value={joinDate}
              onChange={(e) => setJoinDate(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
          <input
            value={employeeName}
            onChange={(e) => setEmployeeName(e.target.value)}
            placeholder="Legal name as used in HR"
            required
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Work email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              required
              autoComplete="off"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09…"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job title</label>
            <input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Sales agent, Warehouse lead"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">App dashboard role</label>
            <select
              value={dashboardRole}
              onChange={(e) =>
                setDashboardRole(e.target.value as 'Agent' | 'Logistics' | 'Warehouse' | 'Driver')
              }
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="Agent">Agent</option>
              <option value="Logistics">Logistics</option>
              <option value="Warehouse">Warehouse</option>
              <option value="Driver">Driver</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Used after login (separate from job title).</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password (optional)</label>
          <div className="relative">
            <input
              type={showLoginPw ? 'text' : 'password'}
              autoComplete="new-password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="Min. 8 characters; leave blank to skip login"
              className="w-full px-4 py-2.5 pr-11 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-gray-800"
              onClick={() => setShowLoginPw((v) => !v)}
              aria-label={showLoginPw ? 'Hide password' : 'Show password'}
            >
              {showLoginPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
          <input
            type="password"
            autoComplete="new-password"
            value={loginPasswordConfirm}
            onChange={(e) => setLoginPasswordConfirm(e.target.value)}
            placeholder="Re-enter password"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button type="submit" variant="primary" disabled={saving || loadingBranches || !branchId} className="gap-2">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Create employee
              </>
            )}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/employees')} disabled={saving}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
