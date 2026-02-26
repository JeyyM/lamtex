import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Mail, Phone, MapPin, Calendar, Briefcase, 
  Users, Award, FileText, Settings, Edit,
  DollarSign, CreditCard, Building, Shield, GraduationCap,
  Folder, Package, Activity, Eye, EyeOff, Download, AlertCircle,
  TrendingUp, Target, Star, Clock, ExternalLink, CheckCircle
} from 'lucide-react';
import { mockAgentAnalytics } from '../mock/agentAnalytics';
import { mockAgentProfiles } from '../mock/agentProfiles';

const AgentProfilePage: React.FC = () => {
  const { agentId, employeeId } = useParams<{ agentId?: string; employeeId?: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [showSensitiveInfo, setShowSensitiveInfo] = useState(false);
  
  // Use either agentId or employeeId
  const id = agentId || employeeId;
  
  // Find the agent data
  const agent = mockAgentAnalytics.find(a => a.agentId === id);
  const agentProfile = mockAgentProfiles.find(a => a.agentId === id);
  
  // Determine the back navigation path
  const backPath = agentId ? '/agents' : '/employees';
  const backLabel = agentId ? 'Agent Analytics' : 'Employees';

  if (!agent || !agentProfile) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Employee Not Found</h2>
          <p className="text-gray-600 mb-4">The employee profile you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate(backPath)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to {backLabel}
          </button>
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return `₱${value.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Users },
    { id: 'contact', label: 'Contact Info', icon: Phone },
    { id: 'employment', label: 'Employment', icon: Briefcase },
    { id: 'compensation', label: 'Compensation', icon: DollarSign },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'territory', label: 'Territory', icon: MapPin },
    { id: 'skills', label: 'Skills & Training', icon: GraduationCap },
    { id: 'documents', label: 'Documents', icon: Folder },
    { id: 'assets', label: 'Assets', icon: Package },
    { id: 'activity', label: 'Activity', icon: Activity },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Personal Information */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600">Date of Birth</label>
                  <p className="font-semibold text-gray-900">{formatDate(agentProfile.personalInfo.dateOfBirth)} ({agentProfile.personalInfo.age} years old)</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Gender</label>
                  <p className="font-semibold text-gray-900">{agentProfile.personalInfo.gender}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Civil Status</label>
                  <p className="font-semibold text-gray-900">{agentProfile.personalInfo.civilStatus}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Nationality</label>
                  <p className="font-semibold text-gray-900">{agentProfile.personalInfo.nationality}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Religion</label>
                  <p className="font-semibold text-gray-900">{agentProfile.personalInfo.religion}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Blood Type</label>
                  <p className="font-semibold text-gray-900">{agentProfile.personalInfo.bloodType}</p>
                </div>
              </div>
            </div>

            {/* Performance Summary */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Performance Summary
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Total Revenue (Quarter)</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(agent.salesPerformance.totalRevenue)}</p>
                  <p className="text-xs text-green-600 mt-1">↑ {agent.salesPerformance.salesGrowthRate}% growth</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{agent.salesPerformance.numberOfOrders}</p>
                  <p className="text-xs text-gray-600 mt-1">Rank #{agent.ranking.rankByOrders}</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Conversion Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{agent.salesPerformance.sellRate}%</p>
                  <p className="text-xs text-gray-600 mt-1">Rank #{agent.ranking.rankByConversionRate}</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/agents')}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1"
              >
                View Full Analytics <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>
        );

      case 'contact':
        return (
          <div className="space-y-6">
            {/* Contact Information */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Phone className="w-5 h-5 text-blue-600" />
                Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm text-gray-600">Primary Phone</label>
                  <p className="font-semibold text-gray-900 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {agentProfile.contactInfo.primaryPhone}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Secondary Phone</label>
                  <p className="font-semibold text-gray-900 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {agentProfile.contactInfo.secondaryPhone || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Personal Email</label>
                  <p className="font-semibold text-gray-900 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {agentProfile.contactInfo.personalEmail}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Work Email</label>
                  <p className="font-semibold text-gray-900 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {agentProfile.contactInfo.workEmail}
                  </p>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                Address
              </h3>
              <div className="space-y-2">
                <p className="font-semibold text-gray-900">{agentProfile.address.street}</p>
                <p className="text-gray-700">{agentProfile.address.barangay}</p>
                <p className="text-gray-700">{agentProfile.address.city}, {agentProfile.address.province}</p>
                <p className="text-gray-700">Postal Code: {agentProfile.address.postalCode}</p>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                Emergency Contact
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-gray-600">Name</label>
                  <p className="font-semibold text-gray-900">{agentProfile.contactInfo.emergencyContactName}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Phone</label>
                  <p className="font-semibold text-gray-900">{agentProfile.contactInfo.emergencyContactPhone}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Relationship</label>
                  <p className="font-semibold text-gray-900">{agentProfile.contactInfo.emergencyContactRelationship}</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'employment':
        return (
          <div className="space-y-6">
            {/* Employment Details */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-600" />
                Employment Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm text-gray-600">Employee ID</label>
                  <p className="font-semibold text-gray-900">{agentProfile.employmentInfo.employeeId}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Date Hired</label>
                  <p className="font-semibold text-gray-900">{formatDate(agentProfile.employmentInfo.dateHired)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Employment Status</label>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    {agentProfile.employmentInfo.employmentStatus}
                  </span>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Position</label>
                  <p className="font-semibold text-gray-900">{agentProfile.employmentInfo.position}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Department</label>
                  <p className="font-semibold text-gray-900">{agentProfile.employmentInfo.department}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Branch Manager</label>
                  <p className="font-semibold text-gray-900">{agentProfile.employmentInfo.branchManagerName}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Reporting To</label>
                  <p className="font-semibold text-gray-900">{agentProfile.employmentInfo.reportingTo}</p>
                </div>
              </div>
            </div>

            {/* Work Schedule */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                Work Schedule
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-gray-600">Working Days</label>
                  <p className="font-semibold text-gray-900">{agentProfile.employmentInfo.workSchedule.daysOfWeek.join(', ')}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Working Hours</label>
                  <p className="font-semibold text-gray-900">
                    {agentProfile.employmentInfo.workSchedule.startTime} - {agentProfile.employmentInfo.workSchedule.endTime}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Shift</label>
                  <p className="font-semibold text-gray-900">{agentProfile.employmentInfo.workSchedule.shift}</p>
                </div>
              </div>
            </div>

            {/* Government IDs */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  Government IDs
                </h3>
                <button
                  onClick={() => setShowSensitiveInfo(!showSensitiveInfo)}
                  className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
                >
                  {showSensitiveInfo ? (
                    <><EyeOff className="w-4 h-4" /> Hide</>
                  ) : (
                    <><Eye className="w-4 h-4" /> Show</>
                  )}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm text-gray-600">TIN</label>
                  <p className="font-semibold text-gray-900">
                    {showSensitiveInfo ? agentProfile.governmentIds.tin : '•••-•••-•••-•••'}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">SSS</label>
                  <p className="font-semibold text-gray-900">
                    {showSensitiveInfo ? agentProfile.governmentIds.sss : '••-•••••••-•'}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">PhilHealth</label>
                  <p className="font-semibold text-gray-900">
                    {showSensitiveInfo ? agentProfile.governmentIds.philHealth : '••-•••••••••-•'}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Pag-IBIG</label>
                  <p className="font-semibold text-gray-900">
                    {showSensitiveInfo ? agentProfile.governmentIds.pagIbig : '••••-••••-••••'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'compensation':
        return (
          <div className="space-y-6">
            {/* Warning Banner */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-yellow-900">Confidential Information</h4>
                <p className="text-sm text-yellow-700">This information is strictly confidential and only visible to executives and HR.</p>
              </div>
            </div>

            {/* Salary Information */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  Compensation Structure
                </h3>
                <button
                  onClick={() => setShowSensitiveInfo(!showSensitiveInfo)}
                  className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
                >
                  {showSensitiveInfo ? (
                    <><EyeOff className="w-4 h-4" /> Hide Amounts</>
                  ) : (
                    <><Eye className="w-4 h-4" /> Show Amounts</>
                  )}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm text-gray-600">Base Salary</label>
                  <p className="text-2xl font-bold text-gray-900">
                    {showSensitiveInfo ? formatCurrency(agentProfile.compensation.baseSalary) : '₱•••,•••'}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Monthly</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Commission Rate</label>
                  <p className="text-2xl font-bold text-green-600">
                    {showSensitiveInfo ? `${agentProfile.compensation.commissionRate}%` : '••%'}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">{agentProfile.compensation.commissionTier} Tier</p>
                </div>
              </div>
            </div>

            {/* Allowances */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Monthly Allowances</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <label className="text-sm text-gray-600">Transportation</label>
                  <p className="text-xl font-semibold text-gray-900">
                    {showSensitiveInfo ? formatCurrency(agentProfile.compensation.allowances.transportation) : '₱•,•••'}
                  </p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <label className="text-sm text-gray-600">Meal</label>
                  <p className="text-xl font-semibold text-gray-900">
                    {showSensitiveInfo ? formatCurrency(agentProfile.compensation.allowances.meal) : '₱•,•••'}
                  </p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <label className="text-sm text-gray-600">Communication</label>
                  <p className="text-xl font-semibold text-gray-900">
                    {showSensitiveInfo ? formatCurrency(agentProfile.compensation.allowances.communication) : '₱•,•••'}
                  </p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <label className="text-sm text-gray-600">Other</label>
                  <p className="text-xl font-semibold text-gray-900">
                    {showSensitiveInfo ? formatCurrency(agentProfile.compensation.allowances.other || 0) : '₱•,•••'}
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Total Monthly Compensation (Base + Allowances)</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {showSensitiveInfo ? formatCurrency(agentProfile.compensation.totalMonthlyCompensation) : '₱••,•••'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quotas & Targets */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                Sales Quotas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <label className="text-sm text-gray-600">Monthly Quota</label>
                  <p className="text-xl font-semibold text-gray-900">
                    {formatCurrency(agentProfile.compensation.monthlyQuota)}
                  </p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <label className="text-sm text-gray-600">Quarterly Quota</label>
                  <p className="text-xl font-semibold text-gray-900">
                    {formatCurrency(agentProfile.compensation.quarterlyQuota)}
                  </p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <label className="text-sm text-gray-600">Yearly Quota</label>
                  <p className="text-xl font-semibold text-gray-900">
                    {formatCurrency(agentProfile.compensation.yearlyQuota)}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <label className="text-sm text-gray-600">Bonus Eligibility</label>
                <p className="font-semibold text-gray-900">
                  {agentProfile.compensation.bonusEligibility ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" /> Yes - Eligible for performance bonuses
                    </span>
                  ) : (
                    <span className="text-gray-600">Not eligible</span>
                  )}
                </p>
              </div>
            </div>

            {/* Bank Details */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  Bank Details
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm text-gray-600">Bank Name</label>
                  <p className="font-semibold text-gray-900">{agentProfile.bankDetails.bankName}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Account Type</label>
                  <p className="font-semibold text-gray-900">{agentProfile.bankDetails.accountType}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Account Name</label>
                  <p className="font-semibold text-gray-900">{agentProfile.bankDetails.accountName}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Account Number</label>
                  <p className="font-semibold text-gray-900">
                    {showSensitiveInfo ? agentProfile.bankDetails.accountNumber : '••••••••••'}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Payment Frequency</label>
                  <p className="font-semibold text-gray-900">{agentProfile.bankDetails.paymentFrequency}</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'customers':
        return (
          <div className="space-y-6">
            {/* Customer Portfolio Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-600 mb-1">Total Customers</p>
                <p className="text-2xl font-bold text-gray-900">{agentProfile.customerAssignments.length}</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-600 mb-1">Active</p>
                <p className="text-2xl font-bold text-green-600">
                  {agentProfile.customerAssignments.filter(c => c.status === 'Active').length}
                </p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-600 mb-1">VIP</p>
                <p className="text-2xl font-bold text-purple-600">
                  {agentProfile.customerAssignments.filter(c => c.status === 'VIP').length}
                </p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-600 mb-1">At Risk</p>
                <p className="text-2xl font-bold text-orange-600">
                  {agentProfile.customerAssignments.filter(c => c.status === 'At Risk').length}
                </p>
              </div>
            </div>

            {/* Customer List */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">Assigned Customers</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Customer</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Contact</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Orders</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Revenue</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Last Order</th>
                      <th className="text-center px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {agentProfile.customerAssignments.map((customer) => (
                      <tr key={customer.customerId} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-gray-900">{customer.customerName}</p>
                            <p className="text-sm text-gray-600">{customer.company}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <p className="text-gray-900">{customer.contactNumber}</p>
                            <p className="text-gray-600">{customer.email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-gray-900">
                          {customer.totalOrders}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-gray-900">
                          {formatCurrency(customer.lifetimeRevenue)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatDate(customer.lastOrderDate)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            customer.status === 'Active' ? 'bg-green-100 text-green-700' :
                            customer.status === 'VIP' ? 'bg-purple-100 text-purple-700' :
                            customer.status === 'At Risk' ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {customer.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'territory':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                Territory Coverage
              </h3>
              <div className="space-y-3">
                {agentProfile.territoryCoverage.map((area, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <span className="font-medium text-gray-900">{area}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Coverage Statistics</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Areas Covered</p>
                  <p className="text-2xl font-bold text-gray-900">{agentProfile.territoryCoverage.length}</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Customers in Territory</p>
                  <p className="text-2xl font-bold text-gray-900">{agentProfile.customerAssignments.length}</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Visit Frequency</p>
                  <p className="text-2xl font-bold text-gray-900">{agent.operationalMetrics.visitFrequency}x/month</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'skills':
        return (
          <div className="space-y-6">
            {/* Skills */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-600" />
                Skills
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {agentProfile.skills.map((skill, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-900">{skill.skillName}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        skill.level === 'Expert' ? 'bg-purple-100 text-purple-700' :
                        skill.level === 'Advanced' ? 'bg-blue-100 text-blue-700' :
                        skill.level === 'Intermediate' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {skill.level}
                      </span>
                    </div>
                    {skill.yearsOfExperience && (
                      <p className="text-sm text-gray-600">{skill.yearsOfExperience} years experience</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Certifications */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-green-600" />
                Certifications
              </h3>
              <div className="space-y-4">
                {agentProfile.certifications.map((cert, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900">{cert.certificationName}</h4>
                    <p className="text-sm text-gray-600 mt-1">{cert.issuingOrganization}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <span>Issued: {formatDate(cert.issueDate)}</span>
                      {cert.expiryDate && <span>Expires: {formatDate(cert.expiryDate)}</span>}
                    </div>
                    {cert.credentialId && (
                      <p className="text-xs text-gray-500 mt-2">ID: {cert.credentialId}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Training History */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-blue-600" />
                Training History
              </h3>
              <div className="space-y-3">
                {agentProfile.trainingHistory.map((training, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900">{training.trainingName}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {training.trainingType} • {training.duration}
                        </p>
                        <p className="text-sm text-gray-600">
                          Completed: {formatDate(training.completionDate)}
                        </p>
                        {training.instructor && (
                          <p className="text-sm text-gray-600">Instructor: {training.instructor}</p>
                        )}
                      </div>
                      {training.score && (
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">{training.score}%</div>
                          <div className="text-xs text-gray-600">Score</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'documents':
        return (
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Folder className="w-5 h-5 text-blue-600" />
                Documents
              </h3>
            </div>
            <div className="divide-y divide-gray-200">
              {agentProfile.documents.map((doc) => (
                <div key={doc.documentId} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{doc.documentName}</h4>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                          <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-medium">
                            {doc.documentType}
                          </span>
                          <span>{doc.fileSize}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Uploaded by {doc.uploadedBy} on {formatDate(doc.uploadDate)}
                        </p>
                      </div>
                    </div>
                    <button className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1 text-sm">
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'assets':
        return (
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                Company Assets Assigned
              </h3>
            </div>
            <div className="divide-y divide-gray-200">
              {agentProfile.assets.map((asset) => (
                <div key={asset.assetId} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Package className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{asset.assetName}</h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-medium">
                            {asset.assetType}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            asset.condition === 'New' || asset.condition === 'Good' ? 'bg-green-100 text-green-700' :
                            asset.condition === 'Fair' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {asset.condition}
                          </span>
                        </div>
                        {asset.model && (
                          <p className="text-sm text-gray-600 mt-1">Model: {asset.model}</p>
                        )}
                        {asset.serialNumber && (
                          <p className="text-sm text-gray-600">S/N: {asset.serialNumber}</p>
                        )}
                        <p className="text-sm text-gray-600">
                          Assigned: {formatDate(asset.assignedDate)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatCurrency(asset.value)}</p>
                      <p className="text-xs text-gray-600">Asset Value</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'activity':
        return (
          <div className="space-y-6">
            {/* Recent Activity */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  Recent Activity
                </h3>
              </div>
              <div className="divide-y divide-gray-200">
                {agentProfile.recentActivity.map((activity) => (
                  <div key={activity.activityId} className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        activity.activityType === 'Order Created' ? 'bg-green-100' :
                        activity.activityType === 'Customer Visit' ? 'bg-blue-100' :
                        activity.activityType === 'Quote Generated' ? 'bg-purple-100' :
                        'bg-gray-100'
                      }`}>
                        <Activity className={`w-5 h-5 ${
                          activity.activityType === 'Order Created' ? 'text-green-600' :
                          activity.activityType === 'Customer Visit' ? 'text-blue-600' :
                          activity.activityType === 'Quote Generated' ? 'text-purple-600' :
                          'text-gray-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{activity.description}</p>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                          <span>{activity.timestamp}</span>
                          {activity.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {activity.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Notes & Reviews
                </h3>
              </div>
              <div className="divide-y divide-gray-200">
                {agentProfile.notes.map((note) => (
                  <div key={note.noteId} className="p-6">
                    <div className="flex items-start gap-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        note.noteType === 'Commendation' ? 'bg-green-100 text-green-700' :
                        note.noteType === 'Performance' ? 'bg-blue-100 text-blue-700' :
                        note.noteType === 'Disciplinary' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {note.noteType}
                      </span>
                      <div className="flex-1">
                        <p className="text-gray-900">{note.note}</p>
                        <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
                          <span>By {note.createdBy}</span>
                          <span>{formatDate(note.createdDate)}</span>
                          {note.isPrivate && (
                            <span className="flex items-center gap-1 text-orange-600">
                              <EyeOff className="w-3 h-3" />
                              Private
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* System Access */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-600" />
                System Access
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm text-gray-600">System Role</label>
                  <p className="font-semibold text-gray-900">{agentProfile.systemRole}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Last Login</label>
                  <p className="font-semibold text-gray-900">{agentProfile.lastLogin}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Last Password Change</label>
                  <p className="font-semibold text-gray-900">{formatDate(agentProfile.lastPasswordChange)}</p>
                </div>
              </div>
              <div className="mt-6">
                <label className="text-sm text-gray-600 block mb-2">Permissions</label>
                <div className="flex flex-wrap gap-2">
                  {agentProfile.permissions.map((permission, idx) => (
                    <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                      {permission}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate(backPath)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to {backLabel}
      </button>

      {/* Profile Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-6">
            {/* Profile Photo */}
            <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-3xl">
              {agent.agentName.split(' ').map(n => n[0]).join('')}
            </div>
            
            {/* Basic Info */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{agent.agentName}</h1>
              <p className="text-gray-600 mt-1">{agent.agentId} • {agent.branchName} Branch</p>
              <div className="flex items-center gap-3 mt-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  agent.status === 'active' 
                    ? 'bg-green-100 text-green-700' 
                    : agent.status === 'on-leave'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                </span>
                <span className="text-sm text-gray-600">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Joined {agent.joinDate} ({agent.tenure} months)
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
              <Edit className="w-4 h-4" />
              Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Customers</p>
              <p className="text-2xl font-bold text-gray-900">{agent.customerMetrics.activeCustomers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Award className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Performance Rank</p>
              <p className="text-2xl font-bold text-gray-900">#{agent.ranking.rankByRevenue}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Commission Tier</p>
              <p className="text-lg font-bold text-gray-900">{agent.incentives.bonusTier.split(' - ')[0]}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Territory</p>
              <p className="text-sm font-semibold text-gray-900">{agent.operationalMetrics.territoryCoverage}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="border-b border-gray-200 p-4">
          <div className="grid grid-cols-5 gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 font-medium text-sm rounded-lg flex items-center justify-center gap-2 transition-all ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden lg:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default AgentProfilePage;
