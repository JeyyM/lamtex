/** Fleet / vehicle detail types (used by TruckDetailPage and fleetTrucks). */

export interface TruckDetails {
  id: string;
  vehicleId: string;
  vehicleName: string;
  plateNumber: string;
  type: 'Truck' | 'Container Van' | 'Motorcycle';
  status: 'Available' | 'On Trip' | 'Loading' | 'Maintenance' | 'Out of Service';
  make: string;
  model: string;
  yearModel: number;
  color: string;
  engineType: string;
  maxWeight: number;
  maxVolume: number;
  dimensions: { length: number | null; width: number | null; height: number | null };
  registrationDate: string;
  registrationExpiry: string;
  orcrNumber: string;
  acquisitionDate: string;
  purchasePrice: number;
  currentBookValue: number;
  branch: string;
  lastMaintenanceDate: string;
  nextMaintenanceDue: string;
  mileageAtLastMaintenance: number;
  totalTrips: number;
  totalDistance: number;
  utilizationPercent: number;
  nextAvailableTime?: string;
  currentTrip?: string;
}

export interface TripHistoryRecord {
  id: string;
  /** `trips.id` when the row is linked to a live trip (opens trip detail modal). */
  tripId: string | null;
  tripNumber: string;
  date: string;
  driverName: string;
  driverId: string;
  route: string[];
  ordersCount: number;
  distance: number;
  duration: string;
  /** Mirrors DB / logistics labels: includes active legs when sourced from `trips`. */
  status: string;
  fuelUsed: number;
  fuelCost: number;
  revenue: number;
  deliverySuccessRate?: number;
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
  scheduledDate?: string;
  completedDate?: string;
  dbStatus?: string;
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
