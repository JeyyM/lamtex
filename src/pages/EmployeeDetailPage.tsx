import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Activity as ActivityLineIcon,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
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
} from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import type { EmployeeRole } from '@/src/types/employee';
import { useAppContext } from '@/src/store/AppContext';
import { supabase } from '@/src/lib/supabase';
import ImageGalleryModal from '@/src/components/ImageGalleryModal';
import {
  fetchEmployeeFullProfile,
  fetchEmployeeWithPerformanceByIdentifier,
  type EmployeeActivityFeedItem,
  type EmployeeFullProfile,
  type EmployeePerfRow,
  type LogisticsManagerPerf,
  type SalesAgentPerf,
  type TruckDriverPerf,
  type WarehouseManagerPerf,
} from '@/src/lib/employeesData';
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

/** Activity log: `YYYY-MM-DD HH:mm:ss` (local). */
function formatActivityLogTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
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
      { label: 'Deliveries (completed trips)', value: emp.deliveriesManaged.toLocaleString() },
      {
        label: 'On-time rate',
        value: emp.onTimeDeliveryRate == null ? '—' : `${emp.onTimeDeliveryRate}%`,
      },
      { label: 'Trucks at branch', value: emp.trucksManaged.toLocaleString() },
      { label: 'Trips (90 days)', value: emp.routesOptimized.toLocaleString() },
    );
  } else if (isWarehouseManager(emp)) {
    cells.push(
      { label: 'Orders processed (branch)', value: emp.ordersProcessed.toLocaleString() },
      { label: 'Active staff (branch)', value: emp.staffManaged.toLocaleString() },
      {
        label: 'Inventory accuracy',
        value: emp.inventoryAccuracy == null ? '—' : `${emp.inventoryAccuracy}%`,
      },
      { label: 'Warehouse size', value: emp.warehouseSize ?? '—' },
    );
  } else if (isTruckDriver(emp)) {
    cells.push(
      { label: 'Deliveries completed', value: emp.deliveriesCompleted.toLocaleString() },
      { label: 'Assigned vehicle', value: emp.truckNumber ?? '—' },
      { label: 'Plate', value: emp.licensePlate ?? '—' },
      {
        label: 'Distance / safety',
        value:
          emp.distanceCovered == null && emp.safetyRating == null
            ? '—'
            : [
                emp.distanceCovered != null ? `${emp.distanceCovered.toLocaleString()} km` : null,
                emp.safetyRating != null ? `★ ${emp.safetyRating}` : null,
              ]
                .filter(Boolean)
                .join(' · ') || '—',
      },
    );
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
  | 'skills'
  | 'documents'
  | 'assets'
  | 'activity';

const DETAIL_TABS: { id: DetailTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: Users },
  { id: 'contact', label: 'Contact Info', icon: Phone },
  { id: 'employment', label: 'Employment', icon: Briefcase },
  { id: 'compensation', label: 'Compensation', icon: DollarSign },
  { id: 'customers', label: 'Customers', icon: UserCircle },
  { id: 'skills', label: 'Skills & Training', icon: GraduationCap },
  { id: 'documents', label: 'Documents', icon: Folder },
  { id: 'assets', label: 'Assets', icon: Package },
  { id: 'activity', label: 'Activity', icon: ActivityLineIcon },
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
  };
}

export default function EmployeeDetailPage() {
  const { employeeId: routeParam } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const { employeeName, session, addAuditLog } = useAppContext();
  const [employee, setEmployee] = useState<EmployeePerfRow | null | undefined>(undefined);
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

  useEffect(() => {
    if (!routeParam) {
      setEmployee(null);
      setProfile(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const emp = await fetchEmployeeWithPerformanceByIdentifier(routeParam);
        if (cancelled) return;
        setEmployee(emp);
        if (emp) {
          const prof = await fetchEmployeeFullProfile(emp.id);
          if (!cancelled) setProfile(prof);
        } else {
          setProfile(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load employee');
          setEmployee(null);
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

  const p = profile ?? emptyProfileState();

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
      <div className="p-6 max-w-lg mx-auto">
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Employee not found</h1>
          <p className="text-gray-600 mb-6">
            {error ?? 'This employee does not exist or is not available in the directory.'}
          </p>
          <Button variant="outline" onClick={() => navigate('/employees')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Employees
          </Button>
        </div>
      </div>
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
                            await upsertEmployeePersonalInfo(employee.id, {
                              date_of_birth: ovDob || null,
                              gender: ovGender || null,
                              nationality: ovNationality || null,
                              civil_status: ovCivil || null,
                              religion: ovReligion || null,
                              blood_type: ovBlood || null,
                            });
                            addAuditLog(
                              'Employee profile',
                              'Employee',
                              `Updated personal info for ${employee.employeeName} (${employee.employeeId})`,
                            );
                            setEditOverview(false);
                            await refreshProfileFromServer();
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
                  </div>
                  <div className="space-y-5">
                    {overviewField('Gender', per?.gender)}
                    {overviewField('Nationality', per?.nationality)}
                    {overviewField('Blood Type', per?.blood_type)}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4 text-sm">
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
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Performance summary
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Metrics use the same live rules as the Employees directory (orders, customers, trips, and
                vehicles).
              </p>
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

      case 'assets':
        return (
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-600" />
                Add company asset
              </h2>
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
                        Add asset
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Company assets assigned</h2>
              </div>
              {p.assets.length === 0 ? (
                <p className="p-6 text-sm text-gray-500">No assets on file yet.</p>
              ) : (
                <ul className="divide-y divide-gray-100 p-4 space-y-4">
                  {p.assets.map((a) => {
                    const given = formatProfileDate(a.assigned_date);
                    const typeDisplay = a.category_label?.trim() || a.asset_type || '—';
                    return (
                      <li
                        key={a.id}
                        className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 space-y-3"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-700 border border-purple-200">
                            <Package className="w-5 h-5" aria-hidden />
                          </div>
                          <div className="min-w-0 flex-1 space-y-3">
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-gray-500">Title</p>
                              <p className="font-semibold text-gray-900">{a.asset_name}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-gray-500">What it is</p>
                              <p className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 whitespace-pre-wrap min-h-[2.75rem]">
                                {a.asset_description?.trim() || '—'}
                              </p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-gray-500">Item type</p>
                                <p className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800">
                                  {typeDisplay}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-gray-500">Date given</p>
                                <p className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800">
                                  {given ?? '—'}
                                </p>
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
                <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                  {p.activityFeed.map((item) => (
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
          {DETAIL_TABS.map((t) => {
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
    </div>
  );
}
