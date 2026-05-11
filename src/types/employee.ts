export type EmployeeRole =
  | 'Sales Agent'
  | 'Logistics Manager'
  | 'Warehouse Manager'
  | 'Truck Driver';

export type EmployeeStatus = 'active' | 'on-leave' | 'inactive';

export interface Employee {
  employeeId: string;
  employeeName: string;
  role: EmployeeRole;
  department: string;
  branchId: string;
  branchName: string;
  status: EmployeeStatus;
  joinDate: string;
  tenure: number; // in months
  profilePhoto?: string;
  email: string;
  phone: string;
}

export interface SalesAgent extends Employee {
  role: 'Sales Agent';
  activeCustomers: number;
  totalRevenue: number;
  commission: number;
  territoryCoverage: string;
}

export interface LogisticsManager extends Employee {
  role: 'Logistics Manager';
  onTimeSchedulingRate: number | null;
  fleetUtilizationPercent: number | null;
  tripsLast90Days: number;
}

export interface WarehouseManager extends Employee {
  role: 'Warehouse Manager';
  /** POs + PRs created in the last 90 days (branch aggregate). */
  poPrCountLast90Days: number;
  /** Orders currently Partially Fulfilled at the branch (open stock gaps). */
  stockGapsCount: number;
  /** % of completed PO/PR with a target date that finished on or before it (90d, branch). */
  poPrOnTimeCompletionRate: number | null;
}

export interface TruckDriver extends Employee {
  role: 'Truck Driver';
  completedTrips: number;
}

export type EmployeeDetails =
  | SalesAgent
  | LogisticsManager
  | WarehouseManager
  | TruckDriver;
