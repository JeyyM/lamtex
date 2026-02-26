// Mock data for truck details page

export interface TruckDetails {
  // Basic Info
  id: string;
  vehicleId: string;
  vehicleName: string;
  plateNumber: string;
  type: 'Truck' | 'Container Van' | 'Motorcycle';
  status: 'Available' | 'On Trip' | 'Loading' | 'Maintenance';
  
  // Specifications
  make: string;
  model: string;
  yearModel: number;
  color: string;
  engineType: string;
  maxWeight: number;
  maxVolume: number;
  dimensions: { length: number; width: number; height: number };
  
  // Registration
  registrationDate: string;
  registrationExpiry: string;
  orcrNumber: string;
  
  // Acquisition
  acquisitionDate: string;
  purchasePrice: number;
  currentBookValue: number;
  financingStatus: 'Owned' | 'Financed' | 'Leased';
  branch: string;
  
  // Maintenance
  lastMaintenanceDate: string;
  nextMaintenanceDue: string;
  currentMileage: number;
  mileageAtLastMaintenance: number;
  
  // Stats
  totalTrips: number;
  totalDistance: number;
  utilizationPercent: number;
  nextAvailableTime?: string;
  currentTrip?: string;
}

export interface TripHistoryRecord {
  id: string;
  tripNumber: string;
  date: string;
  driverName: string;
  driverId: string;
  route: string[];
  ordersCount: number;
  distance: number;
  duration: string;
  status: 'Completed' | 'Delayed' | 'Failed';
  fuelUsed: number;
  fuelCost: number;
  revenue: number;
}

export interface MaintenanceRecord {
  id: string;
  date: string;
  type: string;
  category: 'Preventive' | 'Corrective' | 'Emergency';
  cost: number;
  serviceProvider: string;
  mileage: number;
  notes: string;
  nextDue?: string;
}

export interface CalendarBooking {
  date: string;
  type: 'Trip' | 'Maintenance' | 'Available';
  tripId?: string;
  tripNumber?: string;
  status?: string;
  driver?: string;
}

export interface TruckAlert {
  id: string;
  type: 'Warning' | 'Critical' | 'Info';
  category: 'Maintenance' | 'Utilization' | 'Registration' | 'Performance';
  message: string;
  date: string;
  resolved: boolean;
}

export interface DriverAssignment {
  driverId: string;
  driverName: string;
  totalTrips: number;
  onTimeRate: number;
  isPrimary: boolean;
}

// Mock truck details database
const TRUCK_DETAILS: Record<string, TruckDetails> = {
  'v1': {
    id: 'v1',
    vehicleId: 'TRK-001',
    vehicleName: 'Truck 001',
    plateNumber: 'ABC-1234',
    type: 'Truck',
    status: 'On Trip',
    make: 'Isuzu',
    model: 'Forward 6-Wheeler',
    yearModel: 2022,
    color: 'White',
    engineType: 'Diesel',
    maxWeight: 5000,
    maxVolume: 25,
    dimensions: { length: 7.2, width: 2.3, height: 2.8 },
    registrationDate: '2022-03-15',
    registrationExpiry: '2027-03-15',
    orcrNumber: 'OR-2022-123456',
    acquisitionDate: '2022-03-10',
    purchasePrice: 2800000,
    currentBookValue: 2240000,
    financingStatus: 'Owned',
    branch: 'Branch A',
    lastMaintenanceDate: '2026-01-15',
    nextMaintenanceDue: '2026-03-15',
    currentMileage: 45230,
    mileageAtLastMaintenance: 43500,
    totalTrips: 284,
    totalDistance: 45230,
    utilizationPercent: 82,
    currentTrip: 'TRIP-2026-A-001',
    nextAvailableTime: '2026-02-26 15:00',
  },
  'v2': {
    id: 'v2',
    vehicleId: 'TRK-002',
    vehicleName: 'Truck 002',
    plateNumber: 'ABC-5678',
    type: 'Truck',
    status: 'Available',
    make: 'Mitsubishi',
    model: 'Fuso Fighter 8-Wheeler',
    yearModel: 2021,
    color: 'Blue',
    engineType: 'Diesel',
    maxWeight: 5000,
    maxVolume: 25,
    dimensions: { length: 7.5, width: 2.4, height: 2.9 },
    registrationDate: '2021-06-20',
    registrationExpiry: '2026-06-20',
    orcrNumber: 'OR-2021-789012',
    acquisitionDate: '2021-06-15',
    purchasePrice: 3200000,
    currentBookValue: 2240000,
    financingStatus: 'Financed',
    branch: 'Branch A',
    lastMaintenanceDate: '2026-02-10',
    nextMaintenanceDue: '2026-04-10',
    currentMileage: 62450,
    mileageAtLastMaintenance: 61200,
    totalTrips: 412,
    totalDistance: 62450,
    utilizationPercent: 65,
  },
  'v3': {
    id: 'v3',
    vehicleId: 'TRK-003',
    vehicleName: 'Truck 003',
    plateNumber: 'DEF-9012',
    type: 'Truck',
    status: 'Loading',
    make: 'Hino',
    model: '500 Series',
    yearModel: 2023,
    color: 'Red',
    engineType: 'Diesel',
    maxWeight: 5000,
    maxVolume: 25,
    dimensions: { length: 7.0, width: 2.3, height: 2.7 },
    registrationDate: '2023-01-10',
    registrationExpiry: '2028-01-10',
    orcrNumber: 'OR-2023-345678',
    acquisitionDate: '2023-01-05',
    purchasePrice: 3500000,
    currentBookValue: 3150000,
    financingStatus: 'Owned',
    branch: 'Branch A',
    lastMaintenanceDate: '2026-02-01',
    nextMaintenanceDue: '2026-04-01',
    currentMileage: 28940,
    mileageAtLastMaintenance: 27800,
    totalTrips: 198,
    totalDistance: 28940,
    utilizationPercent: 78,
    currentTrip: 'TRIP-2026-A-002',
    nextAvailableTime: '2026-02-26 16:00',
  },
};

// Mock trip history
const TRIP_HISTORY: Record<string, TripHistoryRecord[]> = {
  'v1': [
    { id: 'th1', tripNumber: 'TRIP-2026-A-001', date: '2026-02-26', driverName: 'Fernando Santos', driverId: 'DRV-001', route: ['Quezon City', 'Makati', 'Pasig'], ordersCount: 3, distance: 45, duration: '4h 30m', status: 'Completed', fuelUsed: 18, fuelCost: 1080, revenue: 12500 },
    { id: 'th2', tripNumber: 'TRIP-2026-A-015', date: '2026-02-25', driverName: 'Marco Reyes', driverId: 'DRV-002', route: ['Quezon City', 'Manila'], ordersCount: 2, distance: 28, duration: '3h 15m', status: 'Completed', fuelUsed: 12, fuelCost: 720, revenue: 8900 },
    { id: 'th3', tripNumber: 'TRIP-2026-A-008', date: '2026-02-24', driverName: 'Fernando Santos', driverId: 'DRV-001', route: ['Quezon City', 'Caloocan', 'Malabon'], ordersCount: 4, distance: 52, duration: '5h 10m', status: 'Delayed', fuelUsed: 22, fuelCost: 1320, revenue: 15200 },
    { id: 'th4', tripNumber: 'TRIP-2026-A-003', date: '2026-02-23', driverName: 'Gabriel Cruz', driverId: 'DRV-003', route: ['Quezon City', 'Pasig', 'Taguig'], ordersCount: 3, distance: 38, duration: '4h 00m', status: 'Completed', fuelUsed: 16, fuelCost: 960, revenue: 11300 },
    { id: 'th5', tripNumber: 'TRIP-2026-A-002', date: '2026-02-22', driverName: 'Fernando Santos', driverId: 'DRV-001', route: ['Quezon City', 'Makati'], ordersCount: 2, distance: 32, duration: '3h 45m', status: 'Completed', fuelUsed: 14, fuelCost: 840, revenue: 9500 },
  ],
  'v2': [
    { id: 'th6', tripNumber: 'TRIP-2026-A-016', date: '2026-02-25', driverName: 'Rodrigo Diaz', driverId: 'DRV-004', route: ['Quezon City', 'Marikina', 'Antipolo'], ordersCount: 3, distance: 48, duration: '4h 50m', status: 'Completed', fuelUsed: 20, fuelCost: 1200, revenue: 13800 },
    { id: 'th7', tripNumber: 'TRIP-2026-A-010', date: '2026-02-24', driverName: 'Ernesto Ramos', driverId: 'DRV-005', route: ['Quezon City', 'Paranaque'], ordersCount: 2, distance: 35, duration: '3h 30m', status: 'Completed', fuelUsed: 15, fuelCost: 900, revenue: 10200 },
  ],
  'v3': [
    { id: 'th8', tripNumber: 'TRIP-2026-A-014', date: '2026-02-25', driverName: 'Alberto Mendoza', driverId: 'DRV-006', route: ['Quezon City', 'Valenzuela', 'Malabon'], ordersCount: 4, distance: 55, duration: '5h 20m', status: 'Completed', fuelUsed: 23, fuelCost: 1380, revenue: 16500 },
  ],
};

// Mock maintenance history
const MAINTENANCE_HISTORY: Record<string, MaintenanceRecord[]> = {
  'v1': [
    { id: 'm1', date: '2026-01-15', type: 'Oil Change & Filter', category: 'Preventive', cost: 3500, serviceProvider: 'Isuzu Service Center', mileage: 43500, notes: 'Regular preventive maintenance', nextDue: '2026-03-15' },
    { id: 'm2', date: '2025-11-20', type: 'Tire Replacement (4 tires)', category: 'Preventive', cost: 28000, serviceProvider: 'Goodyear Auto Service', mileage: 41200, notes: 'Front tires worn out' },
    { id: 'm3', date: '2025-09-10', type: 'Brake Pad Replacement', category: 'Preventive', cost: 8500, serviceProvider: 'Isuzu Service Center', mileage: 38900, notes: 'Brake pads at 20% thickness' },
    { id: 'm4', date: '2025-07-05', type: 'Engine Tune-up', category: 'Preventive', cost: 12000, serviceProvider: 'Isuzu Service Center', mileage: 36500, notes: 'Regular tune-up service' },
    { id: 'm5', date: '2025-05-12', type: 'Air Conditioning Repair', category: 'Corrective', cost: 15000, serviceProvider: 'Cool Air Services', mileage: 34200, notes: 'AC compressor replacement' },
  ],
  'v2': [
    { id: 'm6', date: '2026-02-10', type: 'Oil Change & Filter', category: 'Preventive', cost: 3800, serviceProvider: 'Mitsubishi Service Center', mileage: 61200, notes: 'Regular preventive maintenance', nextDue: '2026-04-10' },
    { id: 'm7', date: '2025-12-15', type: 'Battery Replacement', category: 'Corrective', cost: 6500, serviceProvider: 'Mitsubishi Service Center', mileage: 59500, notes: 'Old battery failed to hold charge' },
  ],
  'v3': [
    { id: 'm8', date: '2026-02-01', type: 'Oil Change & Filter', category: 'Preventive', cost: 4000, serviceProvider: 'Hino Service Center', mileage: 27800, notes: 'Regular preventive maintenance', nextDue: '2026-04-01' },
    { id: 'm9', date: '2025-11-25', type: 'Tire Rotation', category: 'Preventive', cost: 1200, serviceProvider: 'Hino Service Center', mileage: 25600, notes: 'Tire rotation for even wear' },
  ],
};

// Mock calendar bookings for next 30 days
const CALENDAR_BOOKINGS: Record<string, CalendarBooking[]> = {
  'v1': [
    { date: '2026-02-26', type: 'Trip', tripId: 'TRIP-2026-A-001', tripNumber: 'TRIP-2026-A-001', status: 'In Transit', driver: 'Fernando Santos' },
    { date: '2026-02-27', type: 'Trip', tripId: 'TRIP-2026-A-020', tripNumber: 'TRIP-2026-A-020', status: 'Planned', driver: 'Marco Reyes' },
    { date: '2026-02-28', type: 'Available' },
    { date: '2026-03-01', type: 'Trip', tripId: 'TRIP-2026-A-025', tripNumber: 'TRIP-2026-A-025', status: 'Planned', driver: 'Fernando Santos' },
    { date: '2026-03-03', type: 'Trip', tripId: 'TRIP-2026-A-028', tripNumber: 'TRIP-2026-A-028', status: 'Planned', driver: 'Gabriel Cruz' },
    { date: '2026-03-15', type: 'Maintenance', status: 'Scheduled' },
  ],
  'v2': [
    { date: '2026-02-26', type: 'Available' },
    { date: '2026-02-27', type: 'Trip', tripId: 'TRIP-2026-A-021', tripNumber: 'TRIP-2026-A-021', status: 'Planned', driver: 'Rodrigo Diaz' },
    { date: '2026-03-01', type: 'Available' },
    { date: '2026-03-02', type: 'Trip', tripId: 'TRIP-2026-A-026', tripNumber: 'TRIP-2026-A-026', status: 'Planned', driver: 'Ernesto Ramos' },
    { date: '2026-04-10', type: 'Maintenance', status: 'Scheduled' },
  ],
  'v3': [
    { date: '2026-02-26', type: 'Trip', tripId: 'TRIP-2026-A-002', tripNumber: 'TRIP-2026-A-002', status: 'Loading', driver: 'Alberto Mendoza' },
    { date: '2026-02-28', type: 'Trip', tripId: 'TRIP-2026-A-023', tripNumber: 'TRIP-2026-A-023', status: 'Planned', driver: 'Eduardo Torres' },
    { date: '2026-03-02', type: 'Available' },
    { date: '2026-04-01', type: 'Maintenance', status: 'Scheduled' },
  ],
};

// Mock alerts
const TRUCK_ALERTS: Record<string, TruckAlert[]> = {
  'v1': [
    { id: 'a1', type: 'Warning', category: 'Maintenance', message: 'Maintenance due in 18 days', date: '2026-02-26', resolved: false },
    { id: 'a2', type: 'Warning', category: 'Utilization', message: 'High utilization this week (82%)', date: '2026-02-24', resolved: false },
  ],
  'v2': [
    { id: 'a3', type: 'Info', category: 'Registration', message: 'Registration expires in 116 days', date: '2026-02-26', resolved: false },
  ],
  'v3': [],
};

// Mock driver assignments
const DRIVER_ASSIGNMENTS: Record<string, DriverAssignment[]> = {
  'v1': [
    { driverId: 'DRV-001', driverName: 'Fernando Santos', totalTrips: 156, onTimeRate: 94, isPrimary: true },
    { driverId: 'DRV-002', driverName: 'Marco Reyes', totalTrips: 78, onTimeRate: 91, isPrimary: false },
    { driverId: 'DRV-003', driverName: 'Gabriel Cruz', totalTrips: 50, onTimeRate: 89, isPrimary: false },
  ],
  'v2': [
    { driverId: 'DRV-004', driverName: 'Rodrigo Diaz', totalTrips: 210, onTimeRate: 96, isPrimary: true },
    { driverId: 'DRV-005', driverName: 'Ernesto Ramos', totalTrips: 145, onTimeRate: 93, isPrimary: false },
    { driverId: 'DRV-006', driverName: 'Alberto Mendoza', totalTrips: 57, onTimeRate: 88, isPrimary: false },
  ],
  'v3': [
    { driverId: 'DRV-006', driverName: 'Alberto Mendoza', totalTrips: 120, onTimeRate: 92, isPrimary: true },
    { driverId: 'DRV-007', driverName: 'Eduardo Torres', totalTrips: 58, onTimeRate: 90, isPrimary: false },
    { driverId: 'DRV-008', driverName: 'Dante Villanueva', totalTrips: 20, onTimeRate: 85, isPrimary: false },
  ],
};

// Export functions
export function getTruckDetails(vehicleId: string): TruckDetails | undefined {
  return TRUCK_DETAILS[vehicleId];
}

export function getTripHistory(vehicleId: string): TripHistoryRecord[] {
  return TRIP_HISTORY[vehicleId] || [];
}

export function getMaintenanceHistory(vehicleId: string): MaintenanceRecord[] {
  return MAINTENANCE_HISTORY[vehicleId] || [];
}

export function getCalendarBookings(vehicleId: string): CalendarBooking[] {
  return CALENDAR_BOOKINGS[vehicleId] || [];
}

export function getTruckAlerts(vehicleId: string): TruckAlert[] {
  return TRUCK_ALERTS[vehicleId] || [];
}

export function getDriverAssignments(vehicleId: string): DriverAssignment[] {
  return DRIVER_ASSIGNMENTS[vehicleId] || [];
}
