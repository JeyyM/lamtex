import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '@/src/store/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import {
  Settings,
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  CreditCard,
  Shield,
  Bell,
  Save,
  Edit2,
  Trash2,
  Plus,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
} from 'lucide-react';
import {
  emptyCompanyInfo,
  loadCompanyInfoForBranch,
  resolveBranchIdByName,
  saveCompanyInfoForBranch,
  type CompanyInfoFields,
} from '@/src/lib/branchCompanySettings';
import { SettingsCompanyLocationsTab } from '@/src/components/settings/SettingsCompanyLocationsTab';
import { SettingsSocialMediaTab } from '@/src/components/settings/SettingsSocialMediaTab';
import { createBranchRecord, notifyBranchesChanged } from '@/src/lib/branches';

interface PaymentProfile {
  id: string;
  type: 'Bank Account' | 'Credit Card' | 'E-Wallet' | 'Check';
  name: string;
  accountNumber: string;
  bankName?: string;
  expiryDate?: string;
  isDefault: boolean;
  isActive: boolean;
}

type ViewMode = 'company' | 'addresses' | 'payment' | 'social' | 'notifications' | 'security';

/** Set to `true` to show the Security tab and panel again. */
const SHOW_SETTINGS_SECURITY_TAB = false;

type CompanyTabSnapshot = {
  company: CompanyInfoFields;
};

function displayCompanyField(value: string | null | undefined): string {
  const t = (value ?? '').trim();
  return t.length > 0 ? t : '—';
}

/** `YYYY-MM-DD` from DB / `<input type="date">` */
function displayCompanyDate(iso: string | null | undefined): string {
  const t = (iso ?? '').trim();
  if (!t) return '—';
  const parsed =
    t.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(t) ? new Date(`${t}T12:00:00`) : new Date(t);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Mock Data
const MOCK_PAYMENT_PROFILES: PaymentProfile[] = [
  {
    id: '1',
    type: 'Bank Account',
    name: 'BDO Corporate Account',
    accountNumber: '**** **** **** 1234',
    bankName: 'Banco de Oro (BDO)',
    isDefault: true,
    isActive: true,
  },
  {
    id: '2',
    type: 'Bank Account',
    name: 'BPI Business Account',
    accountNumber: '**** **** **** 5678',
    bankName: 'Bank of the Philippine Islands (BPI)',
    isDefault: false,
    isActive: true,
  },
  {
    id: '3',
    type: 'Credit Card',
    name: 'Corporate Credit Card',
    accountNumber: '**** **** **** 9012',
    bankName: 'Metrobank',
    expiryDate: '12/2027',
    isDefault: false,
    isActive: true,
  },
  {
    id: '4',
    type: 'E-Wallet',
    name: 'GCash Business',
    accountNumber: '+63 917 123 4567',
    isDefault: false,
    isActive: true,
  },
  {
    id: '5',
    type: 'Check',
    name: 'Company Check Account',
    accountNumber: 'CHK-2026-001',
    bankName: 'Security Bank',
    isDefault: false,
    isActive: false,
  },
];

export default function SettingsPage() {
  const { selectedBranch, setBranch, addAuditLog } = useAppContext();
  const [viewMode, setViewMode] = useState<ViewMode>('company');
  const [resolvedBranchId, setResolvedBranchId] = useState<string | null>(null);
  const [branchSettingsLoading, setBranchSettingsLoading] = useState(true);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfoFields>(() => emptyCompanyInfo());
  const [editingCompanyProfile, setEditingCompanyProfile] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchCode, setNewBranchCode] = useState('');
  const [newBranchSaving, setNewBranchSaving] = useState(false);
  const companyTabSnapshotRef = useRef<CompanyTabSnapshot | null>(null);
  const [paymentProfiles] = useState<PaymentProfile[]>(MOCK_PAYMENT_PROFILES);
  const allSettingsTabs: Array<{ id: ViewMode; label: string; icon: React.ReactNode }> = [
    { id: 'company', label: 'Company Info', icon: <Building2 className="w-4 h-4" /> },
    { id: 'addresses', label: 'Addresses', icon: <MapPin className="w-4 h-4" /> },
    { id: 'payment', label: 'Payment Profiles', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'social', label: 'Social Media', icon: <Globe className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    { id: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> },
  ];
  const settingsTabs = SHOW_SETTINGS_SECURITY_TAB
    ? allSettingsTabs
    : allSettingsTabs.filter((t) => t.id !== 'security');

  const getPaymentIcon = (type: string) => {
    switch (type) {
      case 'Bank Account': return <Building2 className="w-5 h-5" />;
      case 'Credit Card': return <CreditCard className="w-5 h-5" />;
      case 'E-Wallet': return <Phone className="w-5 h-5" />;
      case 'Check': return <Mail className="w-5 h-5" />;
      default: return <CreditCard className="w-5 h-5" />;
    }
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setBranchSettingsLoading(true);
      const bid = selectedBranch.trim() ? await resolveBranchIdByName(selectedBranch) : null;
      if (cancelled) return;
      setResolvedBranchId(bid);

      if (!bid) {
        setCompanyInfo(emptyCompanyInfo());
        setEditingCompanyProfile(false);
        companyTabSnapshotRef.current = null;
        setBranchSettingsLoading(false);
        return;
      }

      const co = await loadCompanyInfoForBranch(bid);
      if (cancelled) return;
      setCompanyInfo(co);
      setEditingCompanyProfile(false);

      companyTabSnapshotRef.current = {
        company: { ...co },
      };
      setBranchSettingsLoading(false);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [selectedBranch]);

  useEffect(() => {
    if (viewMode !== 'company') setEditingCompanyProfile(false);
  }, [viewMode]);

  useEffect(() => {
    if (!SHOW_SETTINGS_SECURITY_TAB && viewMode === 'security') {
      setViewMode('company');
    }
  }, [viewMode]);

  const companyTabSaving = profileSaving;

  const handleCancelCompanyProfileEdit = () => {
    const snap = companyTabSnapshotRef.current?.company;
    if (snap) setCompanyInfo({ ...snap });
    setEditingCompanyProfile(false);
  };

  const handleSaveCompanyProfile = async () => {
    if (!resolvedBranchId) {
      window.alert('Could not resolve this branch. Check the branch name in the header.');
      return;
    }
    if (!companyInfo.companyName.trim()) {
      window.alert('Company name is required.');
      return;
    }
    setProfileSaving(true);
    try {
      const remoteInfo = await saveCompanyInfoForBranch(resolvedBranchId, companyInfo);
      if (!remoteInfo.ok) {
        window.alert(remoteInfo.error ?? 'Could not save company information.');
        return;
      }
      if (companyTabSnapshotRef.current) {
        companyTabSnapshotRef.current = {
          ...companyTabSnapshotRef.current,
          company: { ...companyInfo },
        };
      }
      addAuditLog(
        'Settings',
        'Company',
        `Saved company profile for branch ${selectedBranch.trim() || resolvedBranchId}`,
      );
      setEditingCompanyProfile(false);
      window.alert('Profile saved.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleCreateBranch = async () => {
    setNewBranchSaving(true);
    try {
      const res = await createBranchRecord({ name: newBranchName, code: newBranchCode });
      if (!res.ok) {
        window.alert(res.error ?? 'Could not create branch.');
        return;
      }
      const label = newBranchName.trim();
      const codeUpper = newBranchCode.trim().toUpperCase();
      notifyBranchesChanged();
      setBranch(label);
      setNewBranchName('');
      setNewBranchCode('');
      addAuditLog('Settings', 'Branch', `Created branch "${label}" (${codeUpper})`);
      window.alert('Branch created. The header now uses this branch; add company details or addresses as needed.');
    } finally {
      setNewBranchSaving(false);
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-7 h-7 text-red-600" />
            Settings
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage company information, payment methods, and preferences. Use{' '}
            <strong>Addresses</strong> for company locations and map pins (all branches).
          </p>
          {!branchSettingsLoading && selectedBranch && !resolvedBranchId && (
            <p className="text-sm text-amber-700 mt-2">
              This branch name is not in the database. Add it under Branches or pick another branch in the header.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Badge variant="outline" className="text-gray-600">
            Branch: {selectedBranch}
          </Badge>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="border-b border-gray-200">
        <div className="sm:hidden pb-3">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as ViewMode)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            {settingsTabs.map((tab) => (
              <option key={tab.id} value={tab.id}>{tab.label}</option>
            ))}
          </select>
        </div>
        <nav className="hidden sm:flex gap-4 lg:gap-6 overflow-x-auto">
          {settingsTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id as ViewMode)}
              className={`
                flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors
                ${viewMode === tab.id
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* COMPANY INFO */}
      {viewMode === 'company' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-red-600" />
                  Company Information
                </CardTitle>
                {!branchSettingsLoading && resolvedBranchId && !editingCompanyProfile ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 shrink-0"
                    onClick={() => setEditingCompanyProfile(true)}
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </Button>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!branchSettingsLoading && !resolvedBranchId ? (
                <p className="text-sm text-gray-600">
                  Choose a branch in the header that matches your database to view or edit company details.
                </p>
              ) : null}

              {branchSettingsLoading ? (
                <p className="text-sm text-gray-500">Loading company profile…</p>
              ) : editingCompanyProfile ? (
                <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                  <input
                    type="text"
                    value={companyInfo.companyName}
                    onChange={(e) => setCompanyInfo((c) => ({ ...c, companyName: e.target.value }))}
                    disabled={branchSettingsLoading || !resolvedBranchId || companyTabSaving}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Business Registration Number</label>
                  <input
                    type="text"
                    value={companyInfo.registrationNumber}
                    onChange={(e) => setCompanyInfo((c) => ({ ...c, registrationNumber: e.target.value }))}
                    disabled={branchSettingsLoading || !resolvedBranchId || companyTabSaving}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tax Identification Number (TIN)</label>
                  <input
                    type="text"
                    value={companyInfo.taxId}
                    onChange={(e) => setCompanyInfo((c) => ({ ...c, taxId: e.target.value }))}
                    disabled={branchSettingsLoading || !resolvedBranchId || companyTabSaving}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Industry</label>
                  <input
                    type="text"
                    value={companyInfo.industry}
                    onChange={(e) => setCompanyInfo((c) => ({ ...c, industry: e.target.value }))}
                    disabled={branchSettingsLoading || !resolvedBranchId || companyTabSaving}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date established</label>
                  <input
                    type="date"
                    value={companyInfo.dateEstablished}
                    onChange={(e) => setCompanyInfo((c) => ({ ...c, dateEstablished: e.target.value }))}
                    disabled={branchSettingsLoading || !resolvedBranchId || companyTabSaving}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Number of Employees</label>
                  <input
                    type="text"
                    value={companyInfo.employeeCount}
                    onChange={(e) => setCompanyInfo((c) => ({ ...c, employeeCount: e.target.value }))}
                    disabled={branchSettingsLoading || !resolvedBranchId || companyTabSaving}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Company Description</label>
                  <textarea
                    rows={4}
                    value={companyInfo.companyDescription}
                    onChange={(e) => setCompanyInfo((c) => ({ ...c, companyDescription: e.target.value }))}
                    disabled={branchSettingsLoading || !resolvedBranchId || companyTabSaving}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  disabled={branchSettingsLoading || !resolvedBranchId || profileSaving}
                  onClick={handleCancelCompanyProfileEdit}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  className="w-full sm:w-auto gap-2"
                  disabled={branchSettingsLoading || !resolvedBranchId || companyTabSaving}
                  onClick={() => void handleSaveCompanyProfile()}
                >
                  <Save className="w-4 h-4" />
                  {profileSaving ? 'Saving…' : 'Save profile'}
                </Button>
              </div>
                </>
              ) : resolvedBranchId ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5 text-sm">
                  <div className="space-y-5">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Company name</p>
                      <p className="text-gray-900">{displayCompanyField(companyInfo.companyName)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        Business registration number
                      </p>
                      <p className="text-gray-900">{displayCompanyField(companyInfo.registrationNumber)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        Tax identification number (TIN)
                      </p>
                      <p className="text-gray-900">{displayCompanyField(companyInfo.taxId)}</p>
                    </div>
                  </div>
                  <div className="space-y-5">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Industry</p>
                      <p className="text-gray-900">{displayCompanyField(companyInfo.industry)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Date established</p>
                      <p className="text-gray-900">{displayCompanyDate(companyInfo.dateEstablished)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Number of employees</p>
                      <p className="text-gray-900">{displayCompanyField(companyInfo.employeeCount)}</p>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Company description</p>
                    <p className="text-gray-900 whitespace-pre-wrap">{displayCompanyField(companyInfo.companyDescription)}</p>
                  </div>
                </div>
              ) : null}

            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Plus className="w-5 h-5 text-red-600" />
                New branch
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Add another branch to the system. Use a short unique code (e.g. MNL, CEB) and a display
                name that will appear in the header selector.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch name</label>
                  <input
                    type="text"
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    disabled={newBranchSaving}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100"
                    placeholder="e.g. Cebu"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch code</label>
                  <input
                    type="text"
                    value={newBranchCode}
                    onChange={(e) => setNewBranchCode(e.target.value.toUpperCase())}
                    disabled={newBranchSaving}
                    maxLength={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100 uppercase"
                    placeholder="e.g. CEB"
                  />
                </div>
              </div>
              <Button
                type="button"
                className="bg-red-600 hover:bg-red-700 w-full sm:w-auto gap-2"
                disabled={newBranchSaving || !newBranchName.trim() || !newBranchCode.trim()}
                onClick={() => void handleCreateBranch()}
              >
                <Plus className="w-4 h-4" />
                {newBranchSaving ? 'Creating…' : 'Create branch'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ADDRESSES — company locations (all branches, map + mailing lines) */}
      {viewMode === 'addresses' && <SettingsCompanyLocationsTab addAuditLog={addAuditLog} />}

      {/* PAYMENT PROFILES */}
      {viewMode === 'payment' && (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-bold text-gray-900">Payment Methods</h2>
            <Button className="bg-red-600 hover:bg-red-700 w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Add Payment Method
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paymentProfiles.map((profile) => (
              <Card key={profile.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        {getPaymentIcon(profile.type)}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{profile.name}</h3>
                        <p className="text-sm text-gray-500">{profile.type}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {profile.isDefault && (
                        <Badge className="bg-red-100 text-red-600">Default</Badge>
                      )}
                      {profile.isActive ? (
                        <Badge className="bg-green-100 text-green-600">Active</Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2 mb-4">
                    {profile.bankName && (
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">{profile.bankName}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <CreditCard className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600 font-mono">{profile.accountNumber}</span>
                      <button className="ml-auto text-gray-400 hover:text-gray-600">
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                    {profile.expiryDate && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">Expires: {profile.expiryDate}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 pt-4 border-t">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Edit2 className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 text-red-600 hover:bg-red-50">
                      <Trash2 className="w-3 h-3 mr-1" />
                      Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* SOCIAL MEDIA — per selected branch */}
      {viewMode === 'social' && (
        <SettingsSocialMediaTab
          branchId={resolvedBranchId}
          branchLabel={selectedBranch}
          addAuditLog={addAuditLog}
        />
      )}

      {/* NOTIFICATIONS */}
      {viewMode === 'notifications' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-red-600" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Email Notifications</h3>
                {[
                  { label: 'Order Updates', desc: 'Receive updates on new orders and order status changes' },
                  { label: 'Inventory Alerts', desc: 'Get notified when stock levels are low or critical' },
                  { label: 'Payment Notifications', desc: 'Alerts for received payments and overdue invoices' },
                  { label: 'System Updates', desc: 'Updates about system maintenance and new features' },
                  { label: 'Weekly Reports', desc: 'Receive weekly summary of sales and operations' },
                ].map((item, index) => (
                  <div key={index} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.label}</p>
                      <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-4">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                    </label>
                  </div>
                ))}
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-semibold text-gray-900">Push Notifications</h3>
                {[
                  { label: 'Urgent Alerts', desc: 'Critical system alerts and urgent notifications' },
                  { label: 'Real-time Updates', desc: 'Live updates for orders and deliveries' },
                ].map((item, index) => (
                  <div key={index} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.label}</p>
                      <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-4">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                    </label>
                  </div>
                ))}
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
                <Button variant="outline" className="w-full sm:w-auto">
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button className="bg-red-600 hover:bg-red-700 w-full sm:w-auto">
                  <Save className="w-4 h-4 mr-2" />
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SECURITY — gated by SHOW_SETTINGS_SECURITY_TAB */}
      {SHOW_SETTINGS_SECURITY_TAB && viewMode === 'security' && <SettingsSecurityPanel />}
    </div>
  );
}

function SettingsSecurityPanel() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-600" />
            Security Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Change Password</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                <input
                  type="password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                <input
                  type="password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
            <Button className="bg-red-600 hover:bg-red-700">Update Password</Button>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-gray-900">Two-Factor Authentication</h3>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Enable 2FA</p>
                  <p className="text-sm text-gray-500 mt-1">Add an extra layer of security to your account</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-4">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600" />
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-gray-900">Active Sessions</h3>
            <div className="space-y-3">
              {[
                { device: 'Windows PC - Chrome', location: 'Makati, Philippines', lastActive: '2 minutes ago', current: true },
                { device: 'iPhone 13 - Safari', location: 'Quezon City, Philippines', lastActive: '2 hours ago', current: false },
              ].map((session, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900 flex items-center gap-2">
                      {session.device}
                      {session.current ? <Badge className="bg-green-100 text-green-600">Current</Badge> : null}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">{session.location}</p>
                    <p className="text-xs text-gray-400 mt-1">Last active: {session.lastActive}</p>
                  </div>
                  {!session.current ? (
                    <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50">
                      Revoke
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
