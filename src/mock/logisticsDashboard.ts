// Logistics Manager Dashboard Mock Data

import {
  LogisticsKPI,
  OrderReadyForDispatch,
  Trip,
  DeliveryTracking,
  DelayException,
  Vehicle,
  Shipment,
  LogisticsPerformance,
  WarehouseReadiness,
  LogisticsAlert,
} from '@/src/types/logistics';
import { Branch } from '@/src/types';

// ===== KPIs =====
const ALL_KPIS: LogisticsKPI[] = [
  { id: 'k1', label: 'Deliveries Scheduled', value: 12, subtitle: 'Today', status: 'good', branch: 'Branch A' },
  { id: 'k2', label: 'Trips In Progress', value: 5, status: 'good', branch: 'Branch A' },
  { id: 'k3', label: 'Delivered Today', value: 8, subtitle: '2 pending POD', status: 'good', branch: 'Branch A' },
  { id: 'k4', label: 'Delayed Deliveries', value: 2, status: 'warning', branch: 'Branch A' },
  { id: 'k5', label: 'Orders Ready', value: 15, subtitle: 'From warehouse', status: 'good', branch: 'Branch A' },
  { id: 'k6', label: 'Waiting for Stock', value: 4, status: 'warning', branch: 'Branch A' },
  { id: 'k7', label: 'Available Trucks', value: '2/6', status: 'warning', branch: 'Branch A' },
  { id: 'k8', label: 'Overbooked Routes', value: 1, status: 'danger', branch: 'Branch A' },

  { id: 'k9', label: 'Deliveries Scheduled', value: 9, subtitle: 'Today', status: 'good', branch: 'Branch B' },
  { id: 'k10', label: 'Trips In Progress', value: 3, status: 'good', branch: 'Branch B' },
  { id: 'k11', label: 'Delivered Today', value: 6, subtitle: '1 pending POD', status: 'good', branch: 'Branch B' },
  { id: 'k12', label: 'Delayed Deliveries', value: 1, status: 'good', branch: 'Branch B' },
  { id: 'k13', label: 'Orders Ready', value: 10, subtitle: 'From warehouse', status: 'good', branch: 'Branch B' },
  { id: 'k14', label: 'Waiting for Stock', value: 2, status: 'good', branch: 'Branch B' },
  { id: 'k15', label: 'Available Trucks', value: '3/6', status: 'good', branch: 'Branch B' },
  { id: 'k16', label: 'Overbooked Routes', value: 0, status: 'good', branch: 'Branch B' },

  { id: 'k17', label: 'Deliveries Scheduled', value: 7, subtitle: 'Today', status: 'good', branch: 'Branch C' },
  { id: 'k18', label: 'Trips In Progress', value: 2, status: 'good', branch: 'Branch C' },
  { id: 'k19', label: 'Delivered Today', value: 5, subtitle: 'All POD collected', status: 'good', branch: 'Branch C' },
  { id: 'k20', label: 'Delayed Deliveries', value: 0, status: 'good', branch: 'Branch C' },
  { id: 'k21', label: 'Orders Ready', value: 8, subtitle: 'From warehouse', status: 'good', branch: 'Branch C' },
  { id: 'k22', label: 'Waiting for Stock', value: 1, status: 'good', branch: 'Branch C' },
  { id: 'k23', label: 'Available Trucks', value: '4/6', status: 'good', branch: 'Branch C' },
  { id: 'k24', label: 'Overbooked Routes', value: 0, status: 'good', branch: 'Branch C' },
];

export function getLogisticsKPIsByBranch(branch: Branch): LogisticsKPI[] {
  if (branch === 'All') {
    return [
      { id: 'k-all-1', label: 'Total Deliveries Scheduled', value: 28, subtitle: 'Across all branches', status: 'good' },
      { id: 'k-all-2', label: 'Trips In Progress', value: 10, status: 'good' },
      { id: 'k-all-3', label: 'Delivered Today', value: 19, subtitle: '3 pending POD', status: 'good' },
      { id: 'k-all-4', label: 'Total Delayed', value: 3, status: 'warning' },
      { id: 'k-all-5', label: 'Orders Ready', value: 33, subtitle: 'From all warehouses', status: 'good' },
      { id: 'k-all-6', label: 'Waiting for Stock', value: 7, status: 'warning' },
      { id: 'k-all-7', label: 'Total Fleet', value: '9/18', status: 'warning' },
      { id: 'k-all-8', label: 'Overbooked Routes', value: 1, status: 'danger' },
    ];
  }
  return ALL_KPIS.filter(kpi => kpi.branch === branch);
}

// ===== Orders Ready for Dispatch =====
const ORDERS_READY: OrderReadyForDispatch[] = [
  { id: 'ord1', orderNumber: 'ORD-2026-1234', customer: 'ABC Hardware', branch: 'Branch A', destination: 'Quezon City', requiredDate: '2026-02-26', volume: 12.5, weight: 2450, urgency: 'High', priority: 1, notes: 'Urgent - Construction deadline' },
  { id: 'ord2', orderNumber: 'ORD-2026-1237', customer: 'HomeDepot Makati', branch: 'Branch A', destination: 'Makati City', requiredDate: '2026-03-01', volume: 8.2, weight: 1520, urgency: 'Low', priority: 3 },
  { id: 'ord3', orderNumber: 'ORD-2026-1238', customer: 'QuickBuild Supply', branch: 'Branch A', destination: 'Pasig City', requiredDate: '2026-02-27', volume: 15.8, weight: 3200, urgency: 'Medium', priority: 2 },
  { id: 'ord4', orderNumber: 'ORD-2026-1250', customer: 'BuildPro Manila', branch: 'Branch A', destination: 'Manila', requiredDate: '2026-02-26', volume: 6.5, weight: 1100, urgency: 'High', priority: 1 },
  { id: 'ord5', orderNumber: 'ORD-2026-1251', customer: 'Construction Plus', branch: 'Branch A', destination: 'Caloocan', requiredDate: '2026-02-28', volume: 10.2, weight: 2100, urgency: 'Medium', priority: 2 },

  { id: 'ord6', orderNumber: 'ORD-2026-1240', customer: 'Visayas Builders', branch: 'Branch B', destination: 'Cebu City', requiredDate: '2026-02-26', volume: 10.5, weight: 1980, urgency: 'High', priority: 1 },
  { id: 'ord7', orderNumber: 'ORD-2026-1241', customer: 'Island Hardware', branch: 'Branch B', destination: 'Mandaue City', requiredDate: '2026-02-28', volume: 8.5, weight: 1650, urgency: 'Medium', priority: 2 },
  { id: 'ord8', orderNumber: 'ORD-2026-1252', customer: 'Central Visayas Supply', branch: 'Branch B', destination: 'Lapu-Lapu', requiredDate: '2026-02-27', volume: 12.0, weight: 2300, urgency: 'Medium', priority: 2 },

  { id: 'ord9', orderNumber: 'ORD-2026-1245', customer: 'Mindanao Supply Co', branch: 'Branch C', destination: 'Davao City', requiredDate: '2026-02-27', volume: 4.5, weight: 850, urgency: 'Low', priority: 3 },
  { id: 'ord10', orderNumber: 'ORD-2026-1253', customer: 'Southern Build Mart', branch: 'Branch C', destination: 'Toril', requiredDate: '2026-02-26', volume: 9.2, weight: 1750, urgency: 'High', priority: 1 },
];

export function getOrdersReadyByBranch(branch: Branch): OrderReadyForDispatch[] {
  if (branch === 'All') return ORDERS_READY;
  return ORDERS_READY.filter(ord => ord.branch === branch);
}

// ===== Trips =====
const TRIPS: Trip[] = [
  { id: 'trip1', tripNumber: 'TRIP-2026-A-001', vehicleId: 'TRK-001', vehicleName: 'Truck 001', driverName: 'Juan Santos', status: 'In Transit', scheduledDate: '2026-02-25', departureTime: '08:00', destinations: ['Quezon City', 'Manila'], orders: ['ORD-2026-1234', 'ORD-2026-1250'], capacityUsed: 85, weightUsed: 3550, volumeUsed: 19.0, maxWeight: 5000, maxVolume: 25, eta: '2026-02-25 14:00', branch: 'Branch A' },
  { id: 'trip2', tripNumber: 'TRIP-2026-A-002', vehicleId: 'TRK-003', vehicleName: 'Truck 003', driverName: 'Pedro Cruz', status: 'Loading', scheduledDate: '2026-02-25', departureTime: '13:00', destinations: ['Pasig City'], orders: ['ORD-2026-1238'], capacityUsed: 64, weightUsed: 3200, volumeUsed: 15.8, maxWeight: 5000, maxVolume: 25, branch: 'Branch A' },
  { id: 'trip3', tripNumber: 'TRIP-2026-A-003', vehicleId: 'TRK-004', vehicleName: 'Truck 004', driverName: 'Miguel Torres', status: 'Delayed', scheduledDate: '2026-02-25', departureTime: '10:00', destinations: ['Caloocan'], orders: ['ORD-2026-1251'], capacityUsed: 42, weightUsed: 2100, volumeUsed: 10.2, maxWeight: 5000, maxVolume: 25, eta: '2026-02-25 16:00', delayReason: 'Heavy traffic on EDSA', branch: 'Branch A' },
  { id: 'trip4', tripNumber: 'TRIP-2026-A-004', vehicleId: 'TRK-002', vehicleName: 'Truck 002', driverName: 'Carlos Garcia', status: 'Completed', scheduledDate: '2026-02-25', departureTime: '06:00', destinations: ['Makati City'], orders: ['ORD-2026-1235'], capacityUsed: 30, weightUsed: 1850, volumeUsed: 9.5, maxWeight: 5000, maxVolume: 25, actualArrival: '2026-02-25 10:30', branch: 'Branch A' },

  { id: 'trip5', tripNumber: 'TRIP-2026-B-001', vehicleId: 'TRK-005', vehicleName: 'Truck 005', driverName: 'Roberto Reyes', status: 'In Transit', scheduledDate: '2026-02-25', departureTime: '09:00', destinations: ['Cebu City', 'Mandaue City'], orders: ['ORD-2026-1240', 'ORD-2026-1241'], capacityUsed: 73, weightUsed: 3630, volumeUsed: 19.0, maxWeight: 5000, maxVolume: 25, eta: '2026-02-25 15:00', branch: 'Branch B' },
  { id: 'trip6', tripNumber: 'TRIP-2026-B-002', vehicleId: 'TRK-006', vehicleName: 'Truck 006', driverName: 'Fernando Lopez', status: 'Loading', scheduledDate: '2026-02-25', departureTime: '14:00', destinations: ['Lapu-Lapu'], orders: ['ORD-2026-1252'], capacityUsed: 46, weightUsed: 2300, volumeUsed: 12.0, maxWeight: 5000, maxVolume: 25, branch: 'Branch B' },

  { id: 'trip7', tripNumber: 'TRIP-2026-C-001', vehicleId: 'TRK-009', vehicleName: 'Truck 009', driverName: 'Antonio Ramirez', status: 'In Transit', scheduledDate: '2026-02-25', departureTime: '08:30', destinations: ['Davao City', 'Toril'], orders: ['ORD-2026-1245', 'ORD-2026-1253'], capacityUsed: 52, weightUsed: 2600, volumeUsed: 13.7, maxWeight: 5000, maxVolume: 25, eta: '2026-02-25 13:30', branch: 'Branch C' },
];

export function getTripsByBranch(branch: Branch): Trip[] {
  if (branch === 'All') return TRIPS;
  return TRIPS.filter(trip => trip.branch === branch);
}

// ===== Delivery Tracking =====
const DELIVERIES: DeliveryTracking[] = [
  { id: 'del1', tripId: 'trip1', deliveryNumber: 'DEL-2026-A-001', vehicle: 'Truck 001', driver: 'Juan Santos', route: 'QC-Manila Route', ordersCount: 2, status: 'In Transit', eta: '2026-02-25 14:00', currentLocation: 'EDSA Cubao', podCollected: false, branch: 'Branch A' },
  { id: 'del2', tripId: 'trip3', deliveryNumber: 'DEL-2026-A-003', vehicle: 'Truck 004', driver: 'Miguel Torres', route: 'Caloocan Route', ordersCount: 1, status: 'Delayed', eta: '2026-02-25 16:00', delayReason: 'Heavy traffic on EDSA', currentLocation: 'EDSA Balintawak', podCollected: false, branch: 'Branch A' },
  { id: 'del3', tripId: 'trip4', deliveryNumber: 'DEL-2026-A-002', vehicle: 'Truck 002', driver: 'Carlos Garcia', route: 'Makati Route', ordersCount: 1, status: 'Delivered', eta: '2026-02-25 09:00', actualArrival: '2026-02-25 10:30', podCollected: true, branch: 'Branch A' },
  
  { id: 'del4', tripId: 'trip5', deliveryNumber: 'DEL-2026-B-001', vehicle: 'Truck 005', driver: 'Roberto Reyes', route: 'Cebu-Mandaue Route', ordersCount: 2, status: 'In Transit', eta: '2026-02-25 15:00', currentLocation: 'Cebu City Center', podCollected: false, branch: 'Branch B' },

  { id: 'del5', tripId: 'trip7', deliveryNumber: 'DEL-2026-C-001', vehicle: 'Truck 009', driver: 'Antonio Ramirez', route: 'Davao-Toril Route', ordersCount: 2, status: 'In Transit', eta: '2026-02-25 13:30', currentLocation: 'Davao City Proper', podCollected: false, branch: 'Branch C' },
];

export function getDeliveriesByBranch(branch: Branch): DeliveryTracking[] {
  if (branch === 'All') return DELIVERIES;
  return DELIVERIES.filter(del => del.branch === branch);
}

// ===== Delay Exceptions =====
const DELAYS: DelayException[] = [
  { id: 'delay1', type: 'Traffic', affectedTrip: 'TRIP-2026-A-003', affectedOrders: ['ORD-2026-1251'], customersAffected: ['Construction Plus'], daysLate: 0, owner: 'Miguel Torres', status: 'In Progress', reportedDate: '2026-02-25 12:00', branch: 'Branch A' },
  { id: 'delay2', type: 'Customer Unavailable', affectedTrip: 'TRIP-2026-A-005', affectedOrders: ['ORD-2026-1243'], customersAffected: ['BuildMart Cebu'], daysLate: 1, owner: 'Logistics Manager', status: 'Open', reportedDate: '2026-02-24 16:00', branch: 'Branch A' },
  { id: 'delay3', type: 'Vehicle Breakdown', affectedTrip: 'TRIP-2026-B-003', affectedOrders: ['ORD-2026-1248'], customersAffected: ['Island Builders'], daysLate: 1, owner: 'Fernando Lopez', status: 'Resolved', reportedDate: '2026-02-24 10:00', resolution: 'Transferred to Truck 007', branch: 'Branch B' },
];

export function getDelaysByBranch(branch: Branch): DelayException[] {
  if (branch === 'All') return DELAYS;
  return DELAYS.filter(delay => delay.branch === branch);
}

// ===== Vehicles =====
const VEHICLES: Vehicle[] = [
  { id: 'v1', vehicleId: 'TRK-001', vehicleName: 'Truck 001', type: 'Truck', status: 'On Trip', currentTrip: 'TRIP-2026-A-001', tripsToday: 1, nextAvailableTime: '2026-02-25 15:00', utilizationPercent: 82, maxWeight: 5000, maxVolume: 25, maintenanceDue: '2026-03-10', branch: 'Branch A' },
  { id: 'v2', vehicleId: 'TRK-002', vehicleName: 'Truck 002', type: 'Truck', status: 'Available', tripsToday: 1, utilizationPercent: 65, maxWeight: 5000, maxVolume: 25, maintenanceDue: '2026-03-15', branch: 'Branch A' },
  { id: 'v3', vehicleId: 'TRK-003', vehicleName: 'Truck 003', type: 'Truck', status: 'Loading', currentTrip: 'TRIP-2026-A-002', tripsToday: 0, nextAvailableTime: '2026-02-25 16:00', utilizationPercent: 78, maxWeight: 5000, maxVolume: 25, branch: 'Branch A' },
  { id: 'v4', vehicleId: 'TRK-004', vehicleName: 'Truck 004', type: 'Truck', status: 'On Trip', currentTrip: 'TRIP-2026-A-003', tripsToday: 1, nextAvailableTime: '2026-02-25 17:00', utilizationPercent: 88, maxWeight: 5000, maxVolume: 25, alerts: ['Overutilized this week'], branch: 'Branch A' },
  { id: 'v5', vehicleId: 'VAN-001', vehicleName: 'Van 001', type: 'Container Van', status: 'Maintenance', tripsToday: 0, utilizationPercent: 45, maxWeight: 3000, maxVolume: 18, maintenanceDue: '2026-02-26', alerts: ['Scheduled maintenance'], branch: 'Branch A' },
  { id: 'v6', vehicleId: 'VAN-002', vehicleName: 'Van 002', type: 'Container Van', status: 'Available', tripsToday: 0, utilizationPercent: 52, maxWeight: 3000, maxVolume: 18, branch: 'Branch A' },

  { id: 'v7', vehicleId: 'TRK-005', vehicleName: 'Truck 005', type: 'Truck', status: 'On Trip', currentTrip: 'TRIP-2026-B-001', tripsToday: 1, nextAvailableTime: '2026-02-25 16:00', utilizationPercent: 75, maxWeight: 5000, maxVolume: 25, branch: 'Branch B' },
  { id: 'v8', vehicleId: 'TRK-006', vehicleName: 'Truck 006', type: 'Truck', status: 'Loading', currentTrip: 'TRIP-2026-B-002', tripsToday: 0, nextAvailableTime: '2026-02-25 17:00', utilizationPercent: 68, maxWeight: 5000, maxVolume: 25, branch: 'Branch B' },
  { id: 'v9', vehicleId: 'TRK-007', vehicleName: 'Truck 007', type: 'Truck', status: 'Available', tripsToday: 1, utilizationPercent: 70, maxWeight: 5000, maxVolume: 25, maintenanceDue: '2026-03-20', branch: 'Branch B' },

  { id: 'v10', vehicleId: 'TRK-009', vehicleName: 'Truck 009', type: 'Truck', status: 'On Trip', currentTrip: 'TRIP-2026-C-001', tripsToday: 1, nextAvailableTime: '2026-02-25 14:30', utilizationPercent: 72, maxWeight: 5000, maxVolume: 25, branch: 'Branch C' },
  { id: 'v11', vehicleId: 'TRK-010', vehicleName: 'Truck 010', type: 'Truck', status: 'Available', tripsToday: 0, utilizationPercent: 58, maxWeight: 5000, maxVolume: 25, branch: 'Branch C' },
];

export function getVehiclesByBranch(branch: Branch): Vehicle[] {
  if (branch === 'All') return VEHICLES;
  return VEHICLES.filter(v => v.branch === branch);
}

// ===== Shipments (Inter-island) =====
const SHIPMENTS: Shipment[] = [
  { id: 'ship1', shipmentNumber: 'SHIP-2026-001', type: 'Sea Freight', orders: ['ORD-2026-1260', 'ORD-2026-1261'], port: 'Manila Port', destination: 'Cebu Port', departureDate: '2026-02-26', eta: '2026-02-28', status: 'Preparing', carrier: 'FastShip Lines', trackingNumber: 'FS2026-001', branch: 'Branch A' },
  { id: 'ship2', shipmentNumber: 'SHIP-2026-002', type: 'Sea Freight', orders: ['ORD-2026-1262'], port: 'Cebu Port', destination: 'Davao Port', departureDate: '2026-02-25', eta: '2026-02-27', status: 'In Transit', carrier: 'FastShip Lines', trackingNumber: 'FS2026-002', branch: 'Branch B' },
];

export function getShipmentsByBranch(branch: Branch): Shipment[] {
  if (branch === 'All') return SHIPMENTS;
  return SHIPMENTS.filter(ship => ship.branch === branch);
}

// ===== Performance Metrics =====
const PERFORMANCE: LogisticsPerformance[] = [
  { id: 'p1', metric: 'On-Time Delivery', value: 94, unit: '%', target: 95, trend: 'down', period: 'weekly' },
  { id: 'p2', metric: 'Average Lead Time', value: 2.3, unit: 'days', target: 2.0, trend: 'up', period: 'monthly' },
  { id: 'p3', metric: 'Trips Per Truck', value: 18, unit: 'trips', target: 20, trend: 'stable', period: 'monthly' },
  { id: 'p4', metric: 'POD Collection Rate', value: 88, unit: '%', target: 95, trend: 'down', period: 'weekly' },
  { id: 'p5', metric: 'Average Capacity Usage', value: 72, unit: '%', target: 80, trend: 'stable', period: 'weekly' },
];

export function getPerformanceMetrics(): LogisticsPerformance[] {
  return PERFORMANCE;
}

// ===== Warehouse Readiness =====
const WAREHOUSE_READINESS: WarehouseReadiness[] = [
  { id: 'wr1', orderNumber: 'ORD-2026-1234', tripId: 'trip1', loadingStatus: 'Ready', lastUpdated: '2026-02-25 07:30' },
  { id: 'wr2', orderNumber: 'ORD-2026-1238', tripId: 'trip2', loadingStatus: 'Ready', lastUpdated: '2026-02-25 12:00' },
  { id: 'wr3', orderNumber: 'ORD-2026-1236', loadingStatus: 'Blocked', blockers: [{ type: 'Missing Items', itemName: 'Plywood 4x8 Marine', quantity: 80 }], lastUpdated: '2026-02-25 10:00' },
  { id: 'wr4', orderNumber: 'ORD-2026-1239', loadingStatus: 'Partial', blockers: [{ type: 'Partial Stock', itemName: 'PVC Pipe 2"', quantity: 50 }], lastUpdated: '2026-02-25 11:30' },
  { id: 'wr5', orderNumber: 'ORD-2026-1242', loadingStatus: 'Blocked', blockers: [{ type: 'QC Hold', itemName: 'Rebar 10mm', quantity: 100 }], lastUpdated: '2026-02-25 09:00' },
];

export function getWarehouseReadiness(): WarehouseReadiness[] {
  return WAREHOUSE_READINESS;
}

// ===== Logistics Alerts =====
const LOGISTICS_ALERTS: LogisticsAlert[] = [
  { id: 'la1', type: 'New Order Ready', severity: 'Low', title: '3 new orders ready for dispatch', message: 'ORD-2026-1250, ORD-2026-1251, ORD-2026-1252 are now ready from warehouse.', actionRequired: false, timestamp: '2026-02-25 13:00', branch: 'Branch A' },
  { id: 'la2', type: 'Warehouse Not Ready', severity: 'High', title: 'Order blocked - Missing items', message: 'ORD-2026-1236 cannot be dispatched. Plywood 4x8 Marine out of stock.', actionRequired: true, timestamp: '2026-02-25 10:00', relatedEntity: 'ORD-2026-1236', branch: 'Branch A' },
  { id: 'la3', type: 'Truck Unavailable', severity: 'Medium', title: 'Truck 004 delayed on route', message: 'Heavy traffic on EDSA. ETA pushed to 16:00.', actionRequired: true, timestamp: '2026-02-25 12:00', relatedEntity: 'TRK-004', branch: 'Branch A' },
  { id: 'la4', type: 'Capacity Warning', severity: 'High', title: 'Route overbooking detected', message: 'QC-Manila route has 3 trips scheduled for tomorrow. Truck capacity may be exceeded.', actionRequired: true, timestamp: '2026-02-25 14:00', branch: 'Branch A' },
  { id: 'la5', type: 'Delivery Failed', severity: 'Critical', title: 'Customer unavailable - ORD-2026-1243', message: 'BuildMart Cebu warehouse closed. Delivery cannot be completed.', actionRequired: true, timestamp: '2026-02-24 16:00', relatedEntity: 'ORD-2026-1243', branch: 'Branch A' },

  { id: 'la6', type: 'New Order Ready', severity: 'Low', title: '2 new orders ready for dispatch', message: 'ORD-2026-1253, ORD-2026-1254 are now ready from warehouse.', actionRequired: false, timestamp: '2026-02-25 12:30', branch: 'Branch B' },
  
  { id: 'la7', type: 'Executive Request', severity: 'Medium', title: 'Executive requesting delivery update', message: 'Update needed on ORD-2026-1245 delivery status for Mindanao Supply Co.', actionRequired: true, timestamp: '2026-02-25 11:00', relatedEntity: 'ORD-2026-1245', branch: 'Branch C' },
];

export function getLogisticsAlertsByBranch(branch: Branch): LogisticsAlert[] {
  if (branch === 'All') return LOGISTICS_ALERTS;
  return LOGISTICS_ALERTS.filter(alert => alert.branch === branch);
}
