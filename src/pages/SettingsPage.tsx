import React, { useState } from 'react';
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
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Users,
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

type ViewMode = 'company' | 'contacts' | 'addresses' | 'payment' | 'social' | 'notifications' | 'security';

interface Contact {
  id: string;
  name: string;
  role: string;
  department: string;
  phone: string;
  email: string;
  isPrimary: boolean;
}

interface Address {
  id: string;
  type: 'Head Office' | 'Branch' | 'Warehouse' | 'Factory';
  label: string;
  street: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  isPrimary: boolean;
}

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

interface SocialMedia {
  platform: 'Facebook' | 'Twitter' | 'Instagram' | 'LinkedIn' | 'YouTube' | 'Website';
  url: string;
  followers?: number;
  isActive: boolean;
}

// Mock Data
const MOCK_CONTACTS: Contact[] = [
  {
    id: '1',
    name: 'Maria Santos',
    role: 'Chief Executive Officer',
    department: 'Executive',
    phone: '+63 917 123 4567',
    email: 'maria.santos@lamtex.ph',
    isPrimary: true,
  },
  {
    id: '2',
    name: 'Roberto Cruz',
    role: 'Chief Financial Officer',
    department: 'Finance',
    phone: '+63 917 234 5678',
    email: 'roberto.cruz@lamtex.ph',
    isPrimary: false,
  },
  {
    id: '3',
    name: 'Angela Reyes',
    role: 'Operations Manager',
    department: 'Operations',
    phone: '+63 917 345 6789',
    email: 'angela.reyes@lamtex.ph',
    isPrimary: false,
  },
  {
    id: '4',
    name: 'Carlos Mendoza',
    role: 'Sales Director',
    department: 'Sales',
    phone: '+63 917 456 7890',
    email: 'carlos.mendoza@lamtex.ph',
    isPrimary: false,
  },
  {
    id: '5',
    name: 'Jennifer Tan',
    role: 'Customer Service Manager',
    department: 'Customer Service',
    phone: '+63 917 567 8901',
    email: 'jennifer.tan@lamtex.ph',
    isPrimary: false,
  },
];

const MOCK_ADDRESSES: Address[] = [
  {
    id: '1',
    type: 'Head Office',
    label: 'Lamtex Corporate Headquarters',
    street: '1234 Ayala Avenue, Makati Business District',
    city: 'Makati',
    province: 'Metro Manila',
    postalCode: '1226',
    country: 'Philippines',
    isPrimary: true,
  },
  {
    id: '2',
    type: 'Branch',
    label: 'Branch A - Quezon City',
    street: '456 Commonwealth Avenue, Diliman',
    city: 'Quezon City',
    province: 'Metro Manila',
    postalCode: '1101',
    country: 'Philippines',
    isPrimary: false,
  },
  {
    id: '3',
    type: 'Branch',
    label: 'Branch B - Cebu',
    street: '789 Osmena Boulevard, Cebu Business Park',
    city: 'Cebu City',
    province: 'Cebu',
    postalCode: '6000',
    country: 'Philippines',
    isPrimary: false,
  },
  {
    id: '4',
    type: 'Factory',
    label: 'Manufacturing Plant - Laguna',
    street: 'Calamba Industrial Estate, PEZA Zone 1',
    city: 'Calamba',
    province: 'Laguna',
    postalCode: '4027',
    country: 'Philippines',
    isPrimary: false,
  },
  {
    id: '5',
    type: 'Warehouse',
    label: 'Distribution Center - Bulacan',
    street: 'North Luzon Expressway Business Park',
    city: 'Meycauayan',
    province: 'Bulacan',
    postalCode: '3020',
    country: 'Philippines',
    isPrimary: false,
  },
];

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

const MOCK_SOCIAL_MEDIA: SocialMedia[] = [
  {
    platform: 'Facebook',
    url: 'https://facebook.com/lamtexph',
    followers: 45200,
    isActive: true,
  },
  {
    platform: 'Twitter',
    url: 'https://twitter.com/lamtexph',
    followers: 12800,
    isActive: true,
  },
  {
    platform: 'Instagram',
    url: 'https://instagram.com/lamtexph',
    followers: 28500,
    isActive: true,
  },
  {
    platform: 'LinkedIn',
    url: 'https://linkedin.com/company/lamtex',
    followers: 8600,
    isActive: true,
  },
  {
    platform: 'YouTube',
    url: 'https://youtube.com/@lamtexph',
    followers: 5400,
    isActive: true,
  },
  {
    platform: 'Website',
    url: 'https://www.lamtex.ph',
    isActive: true,
  },
];

export default function SettingsPage() {
  const { selectedBranch } = useAppContext();
  const [viewMode, setViewMode] = useState<ViewMode>('company');
  const [showPassword, setShowPassword] = useState(false);
  const [contacts] = useState<Contact[]>(MOCK_CONTACTS);
  const [addresses] = useState<Address[]>(MOCK_ADDRESSES);
  const [paymentProfiles] = useState<PaymentProfile[]>(MOCK_PAYMENT_PROFILES);
  const [socialMedia] = useState<SocialMedia[]>(MOCK_SOCIAL_MEDIA);

  const getSocialIcon = (platform: string) => {
    switch (platform) {
      case 'Facebook': return <Facebook className="w-5 h-5" />;
      case 'Twitter': return <Twitter className="w-5 h-5" />;
      case 'Instagram': return <Instagram className="w-5 h-5" />;
      case 'LinkedIn': return <Linkedin className="w-5 h-5" />;
      case 'YouTube': return <Youtube className="w-5 h-5" />;
      case 'Website': return <Globe className="w-5 h-5" />;
      default: return <Globe className="w-5 h-5" />;
    }
  };

  const getSocialColor = (platform: string) => {
    switch (platform) {
      case 'Facebook': return 'text-blue-600 bg-blue-100';
      case 'Twitter': return 'text-sky-600 bg-sky-100';
      case 'Instagram': return 'text-pink-600 bg-pink-100';
      case 'LinkedIn': return 'text-blue-700 bg-blue-100';
      case 'YouTube': return 'text-red-600 bg-red-100';
      case 'Website': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPaymentIcon = (type: string) => {
    switch (type) {
      case 'Bank Account': return <Building2 className="w-5 h-5" />;
      case 'Credit Card': return <CreditCard className="w-5 h-5" />;
      case 'E-Wallet': return <Phone className="w-5 h-5" />;
      case 'Check': return <Mail className="w-5 h-5" />;
      default: return <CreditCard className="w-5 h-5" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-7 h-7 text-red-600" />
            Settings
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage company information, contacts, payment methods, and preferences
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-gray-600">
            Branch: {selectedBranch}
          </Badge>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {[
            { id: 'company', label: 'Company Info', icon: <Building2 className="w-4 h-4" /> },
            { id: 'contacts', label: 'Contacts', icon: <Users className="w-4 h-4" /> },
            { id: 'addresses', label: 'Addresses', icon: <MapPin className="w-4 h-4" /> },
            { id: 'payment', label: 'Payment Profiles', icon: <CreditCard className="w-4 h-4" /> },
            { id: 'social', label: 'Social Media', icon: <Globe className="w-4 h-4" /> },
            { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
            { id: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> },
          ].map((tab) => (
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
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-red-600" />
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                  <input
                    type="text"
                    defaultValue="Lamtex PVC Manufacturing Inc."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Business Registration Number</label>
                  <input
                    type="text"
                    defaultValue="SEC-2010-123456"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tax Identification Number (TIN)</label>
                  <input
                    type="text"
                    defaultValue="123-456-789-000"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Industry</label>
                  <input
                    type="text"
                    defaultValue="Manufacturing - PVC Pipes & Fittings"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Year Established</label>
                  <input
                    type="text"
                    defaultValue="2010"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Number of Employees</label>
                  <input
                    type="text"
                    defaultValue="250-500"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Company Description</label>
                  <textarea
                    rows={4}
                    defaultValue="Lamtex is a leading manufacturer of high-quality PVC pipes and fittings in the Philippines. We specialize in producing durable, reliable piping solutions for residential, commercial, and industrial applications."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline">
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button className="bg-red-600 hover:bg-red-700">
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* CONTACTS */}
      {viewMode === 'contacts' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Contact Directory</h2>
            <Button className="bg-red-600 hover:bg-red-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Contact
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contacts.map((contact) => (
              <Card key={contact.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                        <Users className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{contact.name}</h3>
                        <p className="text-sm text-gray-500">{contact.role}</p>
                      </div>
                    </div>
                    {contact.isPrimary && (
                      <Badge className="bg-red-100 text-red-600">Primary</Badge>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">{contact.department}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">{contact.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">{contact.email}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Edit2 className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 text-red-600 hover:bg-red-50">
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ADDRESSES */}
      {viewMode === 'addresses' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Business Locations</h2>
            <Button className="bg-red-600 hover:bg-red-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Address
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {addresses.map((address) => (
              <Card key={address.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`p-2 rounded-lg ${
                          address.type === 'Head Office' ? 'bg-red-100' :
                          address.type === 'Branch' ? 'bg-blue-100' :
                          address.type === 'Factory' ? 'bg-orange-100' :
                          'bg-green-100'
                        }`}>
                          <MapPin className={`w-5 h-5 ${
                            address.type === 'Head Office' ? 'text-red-600' :
                            address.type === 'Branch' ? 'text-blue-600' :
                            address.type === 'Factory' ? 'text-orange-600' :
                            'text-green-600'
                          }`} />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">{address.label}</h3>
                          <Badge variant="outline" className="mt-1">{address.type}</Badge>
                        </div>
                        {address.isPrimary && (
                          <Badge className="bg-red-100 text-red-600 ml-2">Primary</Badge>
                        )}
                      </div>
                      <div className="ml-14 space-y-1 text-sm text-gray-600">
                        <p>{address.street}</p>
                        <p>{address.city}, {address.province} {address.postalCode}</p>
                        <p>{address.country}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Edit2 className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50">
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* PAYMENT PROFILES */}
      {viewMode === 'payment' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Payment Methods</h2>
            <Button className="bg-red-600 hover:bg-red-700">
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

      {/* SOCIAL MEDIA */}
      {viewMode === 'social' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Social Media Profiles</h2>
            <Button className="bg-red-600 hover:bg-red-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Platform
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {socialMedia.map((social, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-lg ${getSocialColor(social.platform)}`}>
                        {getSocialIcon(social.platform)}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{social.platform}</h3>
                        {social.followers && (
                          <p className="text-sm text-gray-500">{social.followers.toLocaleString()} followers</p>
                        )}
                      </div>
                    </div>
                    {social.isActive ? (
                      <Badge className="bg-green-100 text-green-600">Active</Badge>
                    ) : (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <a
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline truncate"
                    >
                      {social.url}
                    </a>
                    <button className="ml-auto text-gray-400 hover:text-gray-600">
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex gap-2 pt-4 border-t">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Edit2 className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Copy className="w-3 h-3 mr-1" />
                      Copy URL
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
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

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline">
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button className="bg-red-600 hover:bg-red-700">
                  <Save className="w-4 h-4 mr-2" />
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SECURITY */}
      {viewMode === 'security' && (
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
                <Button className="bg-red-600 hover:bg-red-700">
                  Update Password
                </Button>
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
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
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
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 flex items-center gap-2">
                          {session.device}
                          {session.current && (
                            <Badge className="bg-green-100 text-green-600">Current</Badge>
                          )}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">{session.location}</p>
                        <p className="text-xs text-gray-400 mt-1">Last active: {session.lastActive}</p>
                      </div>
                      {!session.current && (
                        <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50">
                          Revoke
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
