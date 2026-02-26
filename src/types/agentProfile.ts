// Extended Agent Profile Types

export interface AgentContactInfo {
  primaryPhone: string;
  secondaryPhone?: string;
  personalEmail: string;
  workEmail: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
}

export interface AgentAddress {
  street: string;
  barangay: string;
  city: string;
  province: string;
  postalCode: string;
  currentAddress?: string; // If different from permanent
}

export interface AgentPersonalInfo {
  dateOfBirth: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  nationality: string;
  civilStatus: 'Single' | 'Married' | 'Widowed' | 'Separated';
  religion?: string;
  bloodType?: string;
}

export interface AgentEmploymentInfo {
  employeeId: string;
  dateHired: string;
  employmentStatus: 'Full-time' | 'Part-time' | 'Contract' | 'Probationary';
  position: string;
  department: string;
  reportingTo: string;
  branchManagerName: string;
  workSchedule: {
    daysOfWeek: string[];
    startTime: string;
    endTime: string;
    shift?: string;
  };
}

export interface AgentCompensation {
  baseSalary: number;
  commissionRate: number; // Percentage
  commissionTier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  bonusEligibility: boolean;
  monthlyQuota: number;
  quarterlyQuota: number;
  yearlyQuota: number;
  allowances: {
    transportation: number;
    meal: number;
    communication: number;
    other?: number;
  };
  totalMonthlyCompensation: number;
}

export interface AgentBankDetails {
  bankName: string;
  accountNumber: string;
  accountName: string;
  accountType: 'Savings' | 'Current';
  paymentFrequency: 'Weekly' | 'Bi-weekly' | 'Monthly';
}

export interface AgentGovernmentIds {
  tin: string;
  sss: string;
  philHealth: string;
  pagIbig: string;
  governmentId?: {
    type: string;
    number: string;
  };
}

export interface CustomerAssignment {
  customerId: string;
  customerName: string;
  company: string;
  contactNumber: string;
  email: string;
  totalOrders: number;
  lifetimeRevenue: number;
  lastOrderDate: string;
  status: 'Active' | 'Inactive' | 'At Risk' | 'VIP';
  assignedDate: string;
}

export interface AgentSkill {
  skillName: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  yearsOfExperience?: number;
}

export interface AgentCertification {
  certificationName: string;
  issuingOrganization: string;
  issueDate: string;
  expiryDate?: string;
  credentialId?: string;
}

export interface AgentTraining {
  trainingName: string;
  trainingType: 'Product Knowledge' | 'Sales Skills' | 'Technical' | 'Soft Skills' | 'Compliance';
  completionDate: string;
  duration: string;
  instructor?: string;
  score?: number;
}

export interface AgentDocument {
  documentId: string;
  documentType: 'Resume' | 'ID' | 'Certificate' | 'Contract' | 'Performance Review' | 'Other';
  documentName: string;
  uploadDate: string;
  uploadedBy: string;
  fileSize: string;
  fileUrl: string;
}

export interface AgentAsset {
  assetId: string;
  assetType: 'Laptop' | 'Mobile Phone' | 'Vehicle' | 'Tablet' | 'Equipment' | 'Other';
  assetName: string;
  serialNumber?: string;
  model?: string;
  assignedDate: string;
  condition: 'New' | 'Good' | 'Fair' | 'Needs Repair';
  value: number;
}

export interface AgentNote {
  noteId: string;
  noteType: 'General' | 'Performance' | 'Disciplinary' | 'Commendation' | 'HR';
  note: string;
  createdBy: string;
  createdDate: string;
  isPrivate: boolean;
}

export interface AgentActivity {
  activityId: string;
  activityType: 'Login' | 'Order Created' | 'Customer Visit' | 'Quote Generated' | 'Meeting' | 'Other';
  description: string;
  timestamp: string;
  location?: string;
}

export interface AgentFullProfile {
  // Basic Info (from existing AgentAnalytics)
  agentId: string;
  agentName: string;
  branchId: string;
  branchName: string;
  profileImage?: string;
  joinDate: string;
  tenure: number;
  status: 'active' | 'inactive' | 'on-leave';
  
  // Extended Info
  personalInfo: AgentPersonalInfo;
  contactInfo: AgentContactInfo;
  address: AgentAddress;
  employmentInfo: AgentEmploymentInfo;
  compensation: AgentCompensation;
  bankDetails: AgentBankDetails;
  governmentIds: AgentGovernmentIds;
  
  // Portfolio & Performance
  customerAssignments: CustomerAssignment[];
  territoryCoverage: string[];
  
  // Skills & Development
  skills: AgentSkill[];
  certifications: AgentCertification[];
  trainingHistory: AgentTraining[];
  
  // Documents & Assets
  documents: AgentDocument[];
  assets: AgentAsset[];
  
  // Activity & Notes
  notes: AgentNote[];
  recentActivity: AgentActivity[];
  
  // Permissions
  systemRole: 'Agent' | 'Senior Agent' | 'Team Lead' | 'Branch Manager';
  permissions: string[];
  lastPasswordChange: string;
  lastLogin: string;
}
