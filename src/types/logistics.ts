// Logistics Manager Dashboard Types

export interface LogisticsKPI {
  id: string;
  label: string;
  value: string | number;
  subtitle?: string;
  status?: 'good' | 'warning' | 'danger';
  trend?: string;
  trendUp?: boolean;
  branch?: string;
}

export interface OrderReadyForDispatch {
  id: string;
  orderNumber: string;
  customer: string;
  /** customers.id when linked (for map pins). */
  customerId?: string | null;
  /** Saved customer map pin; route map uses selected orders with both coords set. */
  mapLat?: number | null;
  mapLng?: number | null;
  branch: string;
  destination: string;
  requiredDate: string;
  volume: number; // cubic meters
  weight: number; // kg
  notes?: string;
  urgency: 'High' | 'Medium' | 'Low';
  priority?: number;
}

export interface Trip {
  id: string;
  tripNumber: string;
  /** vehicles.id (UUID) when loaded from Supabase */
  vehicleId: string;
  vehicleName: string;
  /** employees.id when assigned */
  driverId?: string | null;
  driverName: string;
  status: 'Scheduled' | 'Loading' | 'Packed' | 'Ready' | 'In Transit' | 'Delayed' | 'Delivered' | 'Complete' | 'Cancelled';
  scheduledDate: string;
  departureTime?: string;
  destinations: string[];
  orders: string[]; // Order IDs
  capacityUsed: number; // percentage
  weightUsed: number; // kg
  volumeUsed: number; // cubic meters
  maxWeight: number;
  maxVolume: number;
  /** From vehicles.plate_number when trips are loaded from Supabase (not the UUID in vehicleId). */
  plateNumber?: string | null;
  eta?: string;
  actualArrival?: string;
  delayReason?: string;
  /** Dispatch / route notes (`trips.logistics_notes`), not delay text. */
  logisticsNotes?: string;
  branch?: string;
}

export interface DeliveryTracking {
  id: string;
  tripId: string;
  deliveryNumber: string;
  vehicle: string;
  driver: string;
  route: string;
  ordersCount: number;
  status: 'Scheduled' | 'Loading' | 'In Transit' | 'Delivered' | 'Delayed' | 'Failed';
  eta: string;
  actualArrival?: string;
  delayReason?: string;
  currentLocation?: string;
  podCollected?: boolean;
  branch?: string;
}

export interface DelayException {
  id: string;
  type: 'Vehicle Breakdown' | 'Traffic' | 'Weather' | 'Customer Unavailable' | 'Wrong Address' | 'Stock Shortage' | 'Other';
  affectedTrip: string;
  affectedOrders: string[];
  customersAffected: string[];
  daysLate: number;
  owner: string;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Escalated';
  reportedDate: string;
  resolution?: string;
  branch?: string;
}

export interface Vehicle {
  id: string;
  vehicleId: string;
  vehicleName: string;
  plateNumber?: string;
  type: 'Truck' | 'Container Van' | 'Motorcycle';
  status: 'Available' | 'On Trip' | 'Loading' | 'Maintenance' | 'Out of Service';
  currentTrip?: string;
  tripsToday: number;
  nextAvailableTime?: string;
  utilizationPercent: number; // weekly
  maxWeight: number; // kg
  maxVolume: number; // cubic meters
  maxCapacityKg?: number; // alias for maxWeight (for compatibility)
  maxCapacityCbm?: number; // alias for maxVolume (for compatibility)
  maintenanceDue?: string;
  alerts?: string[];
  branch?: string;
}

export interface Shipment {
  id: string;
  shipmentNumber: string;
  type: 'Sea Freight' | 'Air Freight';
  orders: string[];
  port: string;
  destination: string;
  departureDate: string;
  eta: string;
  status: 'Preparing' | 'In Transit' | 'Arrived' | 'Delayed';
  carrier?: string;
  trackingNumber?: string;
  branch?: string;
}

export interface LogisticsPerformance {
  id: string;
  metric: string;
  value: number;
  unit: string;
  target?: number;
  trend: 'up' | 'down' | 'stable';
  period: 'daily' | 'weekly' | 'monthly';
}

export interface WarehouseReadiness {
  id: string;
  orderNumber: string;
  tripId?: string;
  loadingStatus: 'Ready' | 'Partial' | 'Blocked' | 'Not Started';
  blockers?: {
    type: 'Missing Items' | 'QC Hold' | 'Partial Stock' | 'Damaged';
    itemName: string;
    quantity: number;
  }[];
  lastUpdated: string;
}

export interface DriverOption {
  id: string;        // employees.id (UUID)
  name: string;      // employee_name
  status: string;    // 'active' | 'on-leave' | 'inactive'
}

export interface LogisticsAlert {
  id: string;
  type: 'New Order Ready' | 'Warehouse Not Ready' | 'Truck Unavailable' | 'Delivery Failed' | 'Capacity Warning' | 'Executive Request';
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  title: string;
  message: string;
  actionRequired?: boolean;
  timestamp: string;
  relatedEntity?: string;
  branch?: string;
}
