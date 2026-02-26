export type EmployeeRole = 
  | 'Sales Agent'
  | 'Logistics Manager'
  | 'Warehouse Manager'
  | 'Machine Worker'
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
  commissionTier: string;
  territoryCoverage: string;
}

export interface LogisticsManager extends Employee {
  role: 'Logistics Manager';
  deliveriesManaged: number;
  onTimeDeliveryRate: number;
  trucksManaged: number;
  routesOptimized: number;
}

export interface WarehouseManager extends Employee {
  role: 'Warehouse Manager';
  inventoryAccuracy: number;
  warehouseSize: string;
  staffManaged: number;
  ordersProcessed: number;
}

export interface MachineWorker extends Employee {
  role: 'Machine Worker';
  machineType: string;
  shiftsCompleted: number;
  productionOutput: number;
  efficiencyRate: number;
}

export interface TruckDriver extends Employee {
  role: 'Truck Driver';
  truckNumber: string;
  deliveriesCompleted: number;
  distanceCovered: number; // in km
  safetyRating: number;
  licensePlate: string;
}

export type EmployeeDetails = 
  | SalesAgent 
  | LogisticsManager 
  | WarehouseManager 
  | MachineWorker 
  | TruckDriver;
