import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import {
  ArrowLeft,
  Save,
  X,
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  FileText,
  AlertCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { useAppContext } from '@/src/store/AppContext';
import { CompanyMapPicker } from '@/src/components/maps/CompanyMapPicker';
import { openGoogleMapsSearch } from '@/src/lib/maps';
import { fetchBranchDepotPinByBranchId } from '@/src/lib/companyAddressesSettings';
import type { ClientType } from '@/src/types/customers';

interface Agent {
  id: string;
  employee_name: string;
  employee_id: string;
  system_role: string | null;
}

interface CustomerFormData {
  /** Business ID: CUS-{BRANCH}-{NNNNNN} */
  customerCode: string;
  name: string;
  type: 'Hardware Store' | 'Construction Company' | 'Contractor' | 'Distributor';
  /** Drives agent commission: Office 0.5%, Personal 1% */
  clientType: ClientType;
  contactPerson: string;
  phone: string;
  email: string;
  alternatePhone: string;
  alternateEmail: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  businessRegistration: string;
  taxId: string;
  creditLimit: string;
  paymentTerms: 'COD' | '15 Days' | '30 Days' | '45 Days' | '60 Days';
  assignedAgentId: string;
  assignedAgent: string;
  status: 'Active' | 'Inactive' | 'Suspended' | 'Dormant' | 'On Hold';
}

const FORM_ID = 'customer-form';

/** Supabase FK embeds may return one object or a single-element array. */
function embedOne<T extends Record<string, unknown>>(v: unknown): T | null {
  if (v == null) return null;
  if (Array.isArray(v)) return (v[0] as T | undefined) ?? null;
  if (typeof v === 'object') return v as T;
  return null;
}

/** Map DB / legacy payment_terms strings to form select values. */
function normalizePaymentTermsForForm(raw: string | null | undefined): CustomerFormData['paymentTerms'] {
  const s = (raw ?? '').trim().toUpperCase();
  if (s === 'COD' || s === 'CASH ON DELIVERY' || s === 'C.O.D.') return 'COD';
  const n = s.match(/\d+/);
  if (n) {
    const d = parseInt(n[0], 10);
    if (d === 15) return '15 Days';
    if (d === 30) return '30 Days';
    if (d === 45) return '45 Days';
    if (d === 60) return '60 Days';
  }
  if (s.includes('15')) return '15 Days';
  if (s.includes('30')) return '30 Days';
  if (s.includes('45')) return '45 Days';
  if (s.includes('60')) return '60 Days';
  return '30 Days';
}

export function CustomerFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const { branch: contextBranch } = useAppContext();

  const [formData, setFormData] = useState<CustomerFormData>({
    customerCode: '',
    name: '',
    type: 'Hardware Store',
    clientType: 'Office',
    contactPerson: '',
    phone: '',
    email: '',
    alternatePhone: '',
    alternateEmail: '',
    address: '',
    city: '',
    province: '',
    postalCode: '',
    businessRegistration: '',
    taxId: '',
    creditLimit: '',
    paymentTerms: '30 Days',
    assignedAgentId: '',
    assignedAgent: '',
    status: 'Active',
  });

  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerFormData, string>>>({});
  const [initialFetchLoading, setInitialFetchLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  /** When editing, keep the customer's existing branch_id unless creating (navbar branch applies to new rows only). */
  const [existingBranchId, setExistingBranchId] = useState<string | null>(null);
  /** Map pin (saved as map_lat / map_lng); separate from typed address fields. */
  const [customerMapPin, setCustomerMapPin] = useState<{ lat: number; lng: number } | null>(null);
  /** Current navbar branch store HQ from company_settings (red default pin on map). */
  const [branchStorePin, setBranchStorePin] = useState<{ lat: number; lng: number } | null>(null);

  const branchStoreReferencePin = useMemo(
    () =>
      branchStorePin
        ? { lat: branchStorePin.lat, lng: branchStorePin.lng, title: 'Store / HQ' as const }
        : null,
    [branchStorePin],
  );

  // Load customer data if editing
  useEffect(() => {
    if (!isEditMode || !id) return;

    const fetchCustomer = async () => {
      setInitialFetchLoading(true);
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('*, employees!assigned_agent_id(id, employee_name)')
          .eq('id', id)
          .single();

        if (error) throw error;
        if (!data) {
          alert('Customer not found');
          navigate('/customers');
          return;
        }

        const empRow = embedOne<Record<string, unknown>>(data.employees);

        setExistingBranchId(data.branch_id ? String(data.branch_id) : null);
        setFormData({
          customerCode: data.customer_code ? String(data.customer_code) : '',
          name: data.name ?? '',
          type: data.type ?? 'Hardware Store',
          clientType: data.client_type === 'Personal' ? 'Personal' : 'Office',
          contactPerson: data.contact_person ?? '',
          phone: data.phone ?? '',
          email: data.email ?? '',
          alternatePhone: data.alternate_phone ?? '',
          alternateEmail: data.alternate_email ?? '',
          address: data.address ?? '',
          city: data.city ?? '',
          province: data.province ?? '',
          postalCode: data.postal_code ?? '',
          businessRegistration: data.business_registration ?? '',
          taxId: data.tax_id ?? '',
          creditLimit: String(data.credit_limit ?? ''),
          paymentTerms: normalizePaymentTermsForForm(data.payment_terms as string | null),
          assignedAgentId: data.assigned_agent_id ?? '',
          assignedAgent: (empRow?.employee_name as string | undefined) ?? '',
          status: (data.status as CustomerFormData['status']) ?? 'Active',
        });
        const la = data.map_lat != null ? Number(data.map_lat) : null;
        const ln = data.map_lng != null ? Number(data.map_lng) : null;
        setCustomerMapPin(
          la != null && ln != null && Number.isFinite(la) && Number.isFinite(ln)
            ? { lat: la, lng: ln }
            : null
        );
      } catch (err) {
        console.error('Error loading customer:', err);
        alert('Error loading customer data');
        navigate('/customers');
      } finally {
        setInitialFetchLoading(false);
      }
    };

    fetchCustomer();
  }, [isEditMode, id, navigate]);

  // Fetch agents whenever the navbar branch changes
  useEffect(() => {
    if (!contextBranch) {
      setAgents([]);
      return;
    }

    const fetchAgents = async () => {
      setAgentsLoading(true);
      try {
        const { data, error } = await supabase
          .from('employees')
          .select('id, employee_name, employee_id, system_role, branches!branch_id(name)')
          .eq('role', 'Sales Agent')
          .eq('status', 'active');

        if (error) throw error;

        // Filter client-side by branch name (contextBranch = "Manila" / "Cebu" / "Batangas")
        const filtered = (data ?? []).filter((e: any) => {
          const br = embedOne(e.branches);
          return br?.name === contextBranch;
        });

        setAgents(
          filtered.map((e: any) => ({
            id: e.id,
            employee_name: e.employee_name,
            employee_id: e.employee_id,
            system_role: e.system_role,
          }))
        );
      } catch (err) {
        console.error('Failed to fetch agents:', err);
        setAgents([]);
      } finally {
        setAgentsLoading(false);
      }
    };

    fetchAgents();
  }, [contextBranch]);

  useEffect(() => {
    if (!contextBranch) {
      setBranchStorePin(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: branchRow, error: bErr } = await supabase
        .from('branches')
        .select('id')
        .eq('name', contextBranch)
        .maybeSingle();
      if (cancelled) return;
      if (bErr || !branchRow?.id) {
        setBranchStorePin(null);
        return;
      }
      const pin = await fetchBranchDepotPinByBranchId(branchRow.id as string);
      if (cancelled) return;
      setBranchStorePin(pin);
    })();
    return () => {
      cancelled = true;
    };
  }, [contextBranch]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    if (name === 'assignedAgentId') {
      const selected = agents.find((a) => a.id === value);
      setFormData((prev) => ({
        ...prev,
        assignedAgentId: value,
        assignedAgent: selected ? selected.employee_name : '',
      }));
      if (errors.assignedAgentId) setErrors((prev) => ({ ...prev, assignedAgentId: undefined }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (errors[name as keyof CustomerFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CustomerFormData, string>> = {};

    if (isEditMode && !formData.customerCode.trim()) {
      newErrors.customerCode = 'Customer ID is required';
    }
    if (!formData.name.trim()) newErrors.name = 'Customer name is required';
    if (!formData.contactPerson.trim()) newErrors.contactPerson = 'Contact person is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (formData.creditLimit.trim() !== '' && (isNaN(Number(formData.creditLimit)) || Number(formData.creditLimit) < 0))
      newErrors.creditLimit = 'Credit limit must be a valid non-negative number';

    setErrors(newErrors);
    const keys = Object.keys(newErrors);
    if (keys.length > 0) {
      const first = keys[0];
      window.requestAnimationFrame(() => {
        const el = document.querySelector<HTMLElement>(`[name="${first}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el?.focus?.();
      });
    }
    return keys.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSaving(true);
    try {
      let branchId: string;

      if (isEditMode && existingBranchId) {
        branchId = existingBranchId;
      } else {
        if (!contextBranch?.trim()) {
          alert('Select a branch in the header before saving.');
          setSaving(false);
          return;
        }
        const { data: branchData, error: branchError } = await supabase
          .from('branches')
          .select('id')
          .eq('name', contextBranch)
          .maybeSingle();

        if (branchError || !branchData?.id) {
          throw new Error('Could not resolve branch from the header selector.');
        }
        branchId = branchData.id as string;
      }

      const creditLimit = formData.creditLimit.trim() === '' ? 0 : parseFloat(formData.creditLimit);
      let outstandingBalance = 0;
      if (isEditMode && id) {
        const { data: existing, error: existingErr } = await supabase
          .from('customers')
          .select('outstanding_balance')
          .eq('id', id)
          .maybeSingle();
        if (existingErr) throw existingErr;
        outstandingBalance = Number(existing?.outstanding_balance ?? 0);
      }
      const availableCredit = Math.max(0, creditLimit - outstandingBalance);

      const trimmedCustomerCode = formData.customerCode.trim();
      const payload = {
        name: formData.name.trim(),
        type: formData.type,
        client_type: formData.clientType,
        contact_person: formData.contactPerson.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        alternate_phone: formData.alternatePhone.trim() || null,
        alternate_email: formData.alternateEmail.trim() || null,
        address: formData.address.trim() || null,
        city: formData.city.trim() || null,
        province: formData.province.trim() || null,
        postal_code: formData.postalCode.trim() || null,
        business_registration: formData.businessRegistration.trim() || null,
        tax_id: formData.taxId.trim() || null,
        credit_limit: creditLimit,
        available_credit: availableCredit,
        payment_terms: formData.paymentTerms,
        assigned_agent_id: formData.assignedAgentId || null,
        branch_id: branchId,
        status: formData.status,
        map_lat: customerMapPin?.lat ?? null,
        map_lng: customerMapPin?.lng ?? null,
        ...(trimmedCustomerCode ? { customer_code: trimmedCustomerCode } : {}),
      };

      if (isEditMode && id) {
        const { error } = await supabase
          .from('customers')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw error;
        navigate(`/customers/${id}`);
      } else {
        const { error } = await supabase.from('customers').insert(payload);
        if (error) throw error;
        navigate('/customers');
      }
    } catch (err: any) {
      console.error('Failed to save customer:', err);
      const msg =
        err?.code === '23505' && String(err?.message ?? '').includes('customer_code')
          ? 'That Customer ID is already in use. Choose a different code.'
          : err.message ?? 'Unknown error';
      alert(`Failed to save customer: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
      if (isEditMode && id) navigate(`/customers/${id}`);
      else navigate('/customers');
    }
  };

  if (initialFetchLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mb-4"></div>
          <p className="text-gray-500">Loading customer data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => navigate(isEditMode && id ? `/customers/${id}` : '/customers')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditMode ? 'Edit Customer' : 'Add New Customer'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {isEditMode ? 'Update customer information' : 'Create a new customer account'}
            </p>
          </div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-2 w-full md:w-auto">
          <Button variant="outline" type="button" onClick={handleCancel} className="w-full sm:w-auto">
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button variant="primary" type="submit" form={FORM_ID} disabled={saving} className="w-full sm:w-auto">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving…' : isEditMode ? 'Save Changes' : 'Create Customer'}
          </Button>
        </div>
      </div>

      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isEditMode ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="customerCode"
                    value={formData.customerCode}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono text-sm ${
                      errors.customerCode ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="CUS-BTG-000010"
                  />
                  {errors.customerCode && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.customerCode}
                    </p>
                  )}
                </div>
              ) : null}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter customer name"
                />
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="Hardware Store">Hardware Store</option>
                  <option value="Construction Company">Construction Company</option>
                  <option value="Contractor">Contractor</option>
                  <option value="Distributor">Distributor</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Commission type</label>
                <select
                  name="clientType"
                  value={formData.clientType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="Office">Office client — 0.5%</option>
                  <option value="Personal">Personal client — 1%</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Dormant">Dormant</option>
                  <option value="On Hold">On Hold</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Person <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="contactPerson"
                  value={formData.contactPerson}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                    errors.contactPerson ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter contact person name"
                />
                {errors.contactPerson && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.contactPerson}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                    errors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="+63 XXX XXX XXXX"
                />
                {errors.phone && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.phone}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alternate Phone
                </label>
                <input
                  type="tel"
                  name="alternatePhone"
                  value={formData.alternatePhone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="+63 XXX XXX XXXX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="email@example.com"
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.email}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alternate Email
                </label>
                <input
                  type="email"
                  name="alternateEmail"
                  value={formData.alternateEmail}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="alternate@example.com"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Address Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Street address, building, floor"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="City"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
                <input
                  type="text"
                  name="province"
                  value={formData.province}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Province"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Postal Code
                </label>
                <input
                  type="text"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="1234"
                />
              </div>
            </div>

            <div className="space-y-2 border-t border-gray-100 pt-4">
              <CompanyMapPicker
                lat={customerMapPin?.lat ?? null}
                lng={customerMapPin?.lng ?? null}
                onPositionChange={(la, ln) => setCustomerMapPin({ lat: la, lng: ln })}
                pinColor="blue"
                markerTitle="Customer location — drag to adjust"
                searchInputId="customer-map-search"
                searchInputName="lamtex_gmaps_place_query_customer"
                referencePin={branchStoreReferencePin}
              />
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  disabled={!customerMapPin}
                  onClick={() => setCustomerMapPin(null)}
                >
                  Clear pin
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  disabled={!customerMapPin}
                  onClick={() =>
                    openGoogleMapsSearch(`${customerMapPin!.lat},${customerMapPin!.lng}`)
                  }
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Google Maps
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Business Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Registration Number
                </label>
                <input
                  type="text"
                  name="businessRegistration"
                  value={formData.businessRegistration}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="DTI/SEC Registration Number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tax ID (TIN)
                </label>
                <input
                  type="text"
                  name="taxId"
                  value={formData.taxId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="XXX-XXX-XXX-XXX"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Credit & Payment Terms */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Credit & Payment Terms
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Credit Limit (₱)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  name="creditLimit"
                  value={formData.creditLimit}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                    errors.creditLimit ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0"
                />
                {errors.creditLimit && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.creditLimit}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Terms
                </label>
                <select
                  name="paymentTerms"
                  value={formData.paymentTerms}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="COD">Cash on Delivery (COD)</option>
                  <option value="15 Days">15 Days</option>
                  <option value="30 Days">30 Days</option>
                  <option value="45 Days">45 Days</option>
                  <option value="60 Days">60 Days</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assignment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Assignment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Assigned Agent */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assigned Agent
              </label>
              {!contextBranch ? (
                <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-400 text-sm">
                  No branch selected in the navbar
                </div>
              ) : agentsLoading ? (
                <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 flex items-center gap-2 text-gray-500 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading agents…
                </div>
              ) : agents.length === 0 ? (
                <div className="w-full px-3 py-2 border border-amber-200 rounded-lg bg-amber-50 text-amber-700 text-sm">
                  No agents found for this branch
                </div>
              ) : (
                <select
                  name="assignedAgentId"
                  value={formData.assignedAgentId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="">— Unassigned —</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.employee_name}
                      {agent.system_role ? ` · ${agent.system_role}` : ''}
                      {' '}({agent.employee_id})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons - Mobile */}
        <div className="flex gap-2 md:hidden">
          <Button variant="outline" type="button" onClick={handleCancel} className="flex-1">
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={saving} className="flex-1">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving…' : isEditMode ? 'Save' : 'Create'}
          </Button>
        </div>
      </form>
    </div>
  );
}
