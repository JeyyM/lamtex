import React, { useState } from 'react';
import { Package, FileText, Truck, Calendar, History, Search, Filter, TrendingDown, AlertTriangle, CheckCircle, Plus, X, Factory, ShoppingCart, Clock, MapPin, TrendingUp, Activity, Brain, Target, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from 'recharts';
import CreateRequestModal from '../components/logistics/CreateRequestModal';
import OrderDetailModal from '../components/logistics/OrderDetailModal';

type TabType = 'inventory' | 'requests' | 'orders' | 'movements';
type StockStatus = 'healthy' | 'warning' | 'critical';
type RequestType = 'production' | 'purchase';
type RequestStatus = 'pending' | 'approved' | 'in-progress' | 'completed' | 'cancelled';

interface FinishedGood {
  id: string;
  sku: string;
  name: string;
  category: string;
  currentStock: number;
  unit: string;
  reorderPoint: number;
  maxCapacity: number;
  location: string;
  lastRestocked: string;
  status: StockStatus;
}

interface RawMaterial {
  id: string;
  code: string;
  name: string;
  category: string;
  currentStock: number;
  unit: string;
  reorderPoint: number;
  dailyConsumption: number;
  daysRemaining: number;
  supplier: string;
  lastPurchased: string;
  status: StockStatus;
}

interface ProductionRequest {
  id: string;
  requestNumber: string;
  productSku: string;
  productName: string;
  quantity: number;
  unit: string;
  scheduledDate: string;
  estimatedCompletion: string;
  status: RequestStatus;
  requestedBy: string;
  requestDate: string;
  priority: 'low' | 'medium' | 'high';
  notes?: string;
}

interface PurchaseRequest {
  id: string;
  requestNumber: string;
  materialCode: string;
  materialName: string;
  quantity: number;
  unit: string;
  supplier: string;
  requestedDelivery: string;
  estimatedArrival: string;
  status: RequestStatus;
  requestedBy: string;
  requestDate: string;
  priority: 'low' | 'medium' | 'high';
  notes?: string;
}

const mockFinishedGoods: FinishedGood[] = [
  {
    id: 'FG001',
    sku: 'PVC-SAN-001',
    name: 'PVC Sanitary Pipe 4" x 10ft',
    category: 'Sanitary Pipes',
    currentStock: 145,
    unit: 'pcs',
    reorderPoint: 50,
    maxCapacity: 300,
    location: 'A1-R2-S3',
    lastRestocked: '2026-02-25',
    status: 'healthy'
  },
  {
    id: 'FG002',
    sku: 'PVC-SAN-002',
    name: 'PVC Sanitary Pipe 3" x 10ft',
    category: 'Sanitary Pipes',
    currentStock: 89,
    unit: 'pcs',
    reorderPoint: 40,
    maxCapacity: 250,
    location: 'A1-R2-S4',
    lastRestocked: '2026-02-24',
    status: 'healthy'
  },
  {
    id: 'FG003',
    sku: 'PVC-SAN-003',
    name: 'PVC Sanitary Pipe 2" x 10ft',
    category: 'Sanitary Pipes',
    currentStock: 38,
    unit: 'pcs',
    reorderPoint: 45,
    maxCapacity: 200,
    location: 'A1-R3-S1',
    lastRestocked: '2026-02-20',
    status: 'warning'
  },
  {
    id: 'FG004',
    sku: 'PVC-SAN-004',
    name: 'PVC Sanitary Elbow 4" - 90°',
    category: 'Sanitary Fittings',
    currentStock: 22,
    unit: 'pcs',
    reorderPoint: 30,
    maxCapacity: 180,
    location: 'A1-R3-S2',
    lastRestocked: '2026-02-18',
    status: 'critical'
  },
  {
    id: 'FG005',
    sku: 'PVC-SAN-005',
    name: 'PVC Sanitary Tee 4"',
    category: 'Sanitary Fittings',
    currentStock: 340,
    unit: 'pcs',
    reorderPoint: 150,
    maxCapacity: 500,
    location: 'B2-R1-S1',
    lastRestocked: '2026-02-26',
    status: 'healthy'
  },
  {
    id: 'FG006',
    sku: 'PVC-SAN-006',
    name: 'PVC Sanitary Tee 3"',
    category: 'Sanitary Fittings',
    currentStock: 178,
    unit: 'pcs',
    reorderPoint: 120,
    maxCapacity: 400,
    location: 'B2-R1-S2',
    lastRestocked: '2026-02-25',
    status: 'healthy'
  },
  {
    id: 'FG007',
    sku: 'PVC-PRES-001',
    name: 'PVC Pressure Pipe 1" x 20ft - Class A',
    category: 'Pressure Pipes',
    currentStock: 95,
    unit: 'pcs',
    reorderPoint: 100,
    maxCapacity: 350,
    location: 'B2-R1-S3',
    lastRestocked: '2026-02-22',
    status: 'warning'
  },
  {
    id: 'FG008',
    sku: 'PVC-PRES-002',
    name: 'PVC Pressure Pipe 1.5" x 20ft - Class A',
    category: 'Pressure Pipes',
    currentStock: 256,
    unit: 'pcs',
    reorderPoint: 100,
    maxCapacity: 400,
    location: 'B3-R2-S1',
    lastRestocked: '2026-02-27',
    status: 'healthy'
  },
  {
    id: 'FG009',
    sku: 'PVC-PRES-003',
    name: 'PVC Pressure Pipe 2" x 20ft - Class B',
    category: 'Pressure Pipes',
    currentStock: 412,
    unit: 'pcs',
    reorderPoint: 150,
    maxCapacity: 500,
    location: 'B3-R2-S2',
    lastRestocked: '2026-02-27',
    status: 'healthy'
  },
  {
    id: 'FG010',
    sku: 'PVC-ELEC-001',
    name: 'PVC Electrical Conduit 1/2" x 10ft',
    category: 'Electrical Conduits',
    currentStock: 67,
    unit: 'pcs',
    reorderPoint: 60,
    maxCapacity: 200,
    location: 'B3-R2-S3',
    lastRestocked: '2026-02-23',
    status: 'healthy'
  },
  {
    id: 'FG011',
    sku: 'PVC-ELEC-002',
    name: 'PVC Electrical Conduit 3/4" x 10ft',
    category: 'Electrical Conduits',
    currentStock: 43,
    unit: 'pcs',
    reorderPoint: 35,
    maxCapacity: 150,
    location: 'C1-R1-S1',
    lastRestocked: '2026-02-21',
    status: 'healthy'
  },
  {
    id: 'FG012',
    sku: 'PVC-ELEC-003',
    name: 'PVC Conduit Junction Box - 4"x4"',
    category: 'Electrical Fittings',
    currentStock: 18,
    unit: 'pcs',
    reorderPoint: 25,
    maxCapacity: 120,
    location: 'C1-R1-S2',
    lastRestocked: '2026-02-19',
    status: 'critical'
  },
  {
    id: 'FG013',
    sku: 'PVC-ELEC-004',
    name: 'PVC Conduit Elbow 1/2" - 90°',
    category: 'Electrical Fittings',
    currentStock: 189,
    unit: 'pcs',
    reorderPoint: 80,
    maxCapacity: 300,
    location: 'C2-R3-S1',
    lastRestocked: '2026-02-26',
    status: 'healthy'
  },
  {
    id: 'FG014',
    sku: 'PVC-DRAIN-001',
    name: 'PVC Drainage Pipe 6" x 20ft',
    category: 'Drainage Pipes',
    currentStock: 134,
    unit: 'pcs',
    reorderPoint: 70,
    maxCapacity: 250,
    location: 'C2-R3-S2',
    lastRestocked: '2026-02-25',
    status: 'healthy'
  },
  {
    id: 'FG015',
    sku: 'PVC-DRAIN-002',
    name: 'PVC Drainage Pipe 8" x 20ft',
    category: 'Drainage Pipes',
    currentStock: 87,
    unit: 'pcs',
    reorderPoint: 50,
    maxCapacity: 200,
    location: 'D1-R1-S1',
    lastRestocked: '2026-02-24',
    status: 'healthy'
  },
  {
    id: 'FG016',
    sku: 'PVC-DRAIN-003',
    name: 'PVC Drainage Elbow 6" - 90°',
    category: 'Drainage Fittings',
    currentStock: 28,
    unit: 'pcs',
    reorderPoint: 40,
    maxCapacity: 180,
    location: 'D1-R1-S2',
    lastRestocked: '2026-02-20',
    status: 'critical'
  },
  {
    id: 'FG017',
    sku: 'PVC-DRAIN-004',
    name: 'PVC Drainage Tee 6"',
    category: 'Drainage Fittings',
    currentStock: 52,
    unit: 'pcs',
    reorderPoint: 40,
    maxCapacity: 150,
    location: 'D2-R2-S1',
    lastRestocked: '2026-02-22',
    status: 'healthy'
  },
  {
    id: 'FG018',
    sku: 'PVC-VALVE-001',
    name: 'PVC Ball Valve 1"',
    category: 'Valves & Accessories',
    currentStock: 76,
    unit: 'pcs',
    reorderPoint: 50,
    maxCapacity: 200,
    location: 'D2-R2-S2',
    lastRestocked: '2026-02-23',
    status: 'healthy'
  },
  {
    id: 'FG019',
    sku: 'PVC-VALVE-002',
    name: 'PVC Ball Valve 1.5"',
    category: 'Valves & Accessories',
    currentStock: 890,
    unit: 'pcs',
    reorderPoint: 300,
    maxCapacity: 1500,
    location: 'E1-R1-S1',
    lastRestocked: '2026-02-27',
    status: 'healthy'
  },
  {
    id: 'FG020',
    sku: 'PVC-CAP-001',
    name: 'PVC End Cap - Assorted Sizes',
    category: 'Valves & Accessories',
    currentStock: 234,
    unit: 'pcs',
    reorderPoint: 200,
    maxCapacity: 800,
    location: 'E1-R1-S2',
    lastRestocked: '2026-02-26',
    status: 'healthy'
  },
  {
    id: 'FG021',
    sku: 'PVC-PRES-004',
    name: 'PVC Pressure Pipe 3" x 20ft - Class A',
    category: 'Pressure Pipes',
    currentStock: 31,
    unit: 'pcs',
    reorderPoint: 35,
    maxCapacity: 200,
    location: 'A1-R3-S3',
    lastRestocked: '2026-02-19',
    status: 'warning'
  },
  {
    id: 'FG022',
    sku: 'PVC-SAN-007',
    name: 'PVC Sanitary Wye 4" - 45°',
    category: 'Sanitary Fittings',
    currentStock: 15,
    unit: 'pcs',
    reorderPoint: 25,
    maxCapacity: 150,
    location: 'A1-R3-S4',
    lastRestocked: '2026-02-17',
    status: 'critical'
  },
  {
    id: 'FG023',
    sku: 'PVC-COUP-001',
    name: 'PVC Coupling 2" - Standard',
    category: 'Couplings & Adapters',
    currentStock: 56,
    unit: 'pcs',
    reorderPoint: 30,
    maxCapacity: 180,
    location: 'C1-R1-S3',
    lastRestocked: '2026-02-24',
    status: 'healthy'
  },
  {
    id: 'FG024',
    sku: 'PVC-COUP-002',
    name: 'PVC Coupling 3" - Standard',
    category: 'Couplings & Adapters',
    currentStock: 44,
    unit: 'pcs',
    reorderPoint: 50,
    maxCapacity: 180,
    location: 'B3-R2-S4',
    lastRestocked: '2026-02-21',
    status: 'warning'
  },
  {
    id: 'FG025',
    sku: 'PVC-ADAPT-001',
    name: 'PVC Reducer 4" to 3"',
    category: 'Couplings & Adapters',
    currentStock: 67,
    unit: 'pcs',
    reorderPoint: 50,
    maxCapacity: 200,
    location: 'C2-R3-S3',
    lastRestocked: '2026-02-23',
    status: 'healthy'
  }
];

const mockRawMaterials: RawMaterial[] = [
  {
    id: 'RM001',
    code: 'RESIN-001',
    name: 'PVC Resin Powder - K67',
    category: 'Base Materials',
    currentStock: 2450,
    unit: 'kg',
    reorderPoint: 1000,
    dailyConsumption: 125,
    daysRemaining: 19,
    supplier: 'ChemPlastics International',
    lastPurchased: '2026-02-15',
    status: 'healthy'
  },
  {
    id: 'RM002',
    code: 'RESIN-002',
    name: 'PVC Resin Powder - K70',
    category: 'Base Materials',
    currentStock: 1890,
    unit: 'kg',
    reorderPoint: 1200,
    dailyConsumption: 150,
    daysRemaining: 12,
    supplier: 'ChemPlastics International',
    lastPurchased: '2026-02-18',
    status: 'healthy'
  },
  {
    id: 'RM003',
    code: 'STAB-001',
    name: 'Heat Stabilizer - Lead-Free',
    category: 'Additives',
    currentStock: 780,
    unit: 'kg',
    reorderPoint: 800,
    dailyConsumption: 95,
    daysRemaining: 8,
    supplier: 'PolyStab Solutions',
    lastPurchased: '2026-02-20',
    status: 'warning'
  },
  {
    id: 'RM004',
    code: 'PLAST-001',
    name: 'Plasticizer DOP',
    category: 'Additives',
    currentStock: 234,
    unit: 'liters',
    reorderPoint: 300,
    dailyConsumption: 45,
    daysRemaining: 5,
    supplier: 'FlexiChem Industries',
    lastPurchased: '2026-02-22',
    status: 'critical'
  },
  {
    id: 'RM005',
    code: 'PIGM-001',
    name: 'Titanium Dioxide Pigment (White)',
    category: 'Colorants',
    currentStock: 156,
    unit: 'kg',
    reorderPoint: 200,
    dailyConsumption: 25,
    daysRemaining: 6,
    supplier: 'ColorTech Supply',
    lastPurchased: '2026-02-21',
    status: 'critical'
  },
  {
    id: 'RM006',
    code: 'PIGM-002',
    name: 'Carbon Black Pigment',
    category: 'Colorants',
    currentStock: 189,
    unit: 'kg',
    reorderPoint: 180,
    dailyConsumption: 22,
    daysRemaining: 8,
    supplier: 'ColorTech Supply',
    lastPurchased: '2026-02-21',
    status: 'healthy'
  },
  {
    id: 'RM007',
    code: 'LUBR-001',
    name: 'Calcium Stearate Lubricant',
    category: 'Processing Aids',
    currentStock: 267,
    unit: 'kg',
    reorderPoint: 150,
    dailyConsumption: 18,
    daysRemaining: 14,
    supplier: 'TechLube Materials',
    lastPurchased: '2026-02-23',
    status: 'healthy'
  },
  {
    id: 'RM008',
    code: 'FILLER-001',
    name: 'Calcium Carbonate Filler',
    category: 'Processing Aids',
    currentStock: 890,
    unit: 'kg',
    reorderPoint: 500,
    dailyConsumption: 65,
    daysRemaining: 13,
    supplier: 'MineralPro Supply',
    lastPurchased: '2026-02-19',
    status: 'healthy'
  },
  {
    id: 'RM009',
    code: 'SOLV-001',
    name: 'PVC Solvent Cement',
    category: 'Adhesives',
    currentStock: 445,
    unit: 'liters',
    reorderPoint: 400,
    dailyConsumption: 35,
    daysRemaining: 12,
    supplier: 'BondStrong Adhesives',
    lastPurchased: '2026-02-20',
    status: 'healthy'
  },
  {
    id: 'RM010',
    code: 'PACK-M01',
    name: 'Plastic Wrap Roll - Industrial',
    category: 'Packaging Materials',
    currentStock: 67,
    unit: 'rolls',
    reorderPoint: 80,
    dailyConsumption: 8,
    daysRemaining: 8,
    supplier: 'PackPro Solutions',
    lastPurchased: '2026-02-24',
    status: 'warning'
  },
  {
    id: 'RM011',
    code: 'PACK-M02',
    name: 'Cardboard Boxes - Assorted Sizes',
    category: 'Packaging Materials',
    currentStock: 340,
    unit: 'pcs',
    reorderPoint: 250,
    dailyConsumption: 28,
    daysRemaining: 12,
    supplier: 'PackPro Solutions',
    lastPurchased: '2026-02-25',
    status: 'healthy'
  },
  {
    id: 'RM012',
    code: 'LABEL-001',
    name: 'Product Labels - PVC Pipe Specs',
    category: 'Packaging Materials',
    currentStock: 2340,
    unit: 'pcs',
    reorderPoint: 1500,
    dailyConsumption: 180,
    daysRemaining: 13,
    supplier: 'PrintMark Labels',
    lastPurchased: '2026-02-26',
    status: 'healthy'
  },
  {
    id: 'RM013',
    code: 'IMPACT-001',
    name: 'Impact Modifier - MBS',
    category: 'Additives',
    currentStock: 423,
    unit: 'kg',
    reorderPoint: 500,
    dailyConsumption: 55,
    daysRemaining: 7,
    supplier: 'PolyTough Materials',
    lastPurchased: '2026-02-19',
    status: 'warning'
  },
  {
    id: 'RM014',
    code: 'UV-001',
    name: 'UV Stabilizer Additive',
    category: 'Additives',
    currentStock: 89,
    unit: 'kg',
    reorderPoint: 100,
    dailyConsumption: 12,
    daysRemaining: 7,
    supplier: 'SunGuard Chemicals',
    lastPurchased: '2026-02-22',
    status: 'warning'
  },
  {
    id: 'RM015',
    code: 'SEAL-001',
    name: 'Rubber Gasket Material Roll',
    category: 'Sealing Materials',
    currentStock: 156,
    unit: 'meters',
    reorderPoint: 120,
    dailyConsumption: 15,
    daysRemaining: 10,
    supplier: 'SealTech Supply',
    lastPurchased: '2026-02-23',
    status: 'healthy'
  }
];

const mockProductionRequests: ProductionRequest[] = [
  {
    id: 'PR001',
    requestNumber: 'PROD-2026-001',
    productSku: 'PVC-SAN-001',
    productName: 'PVC Sanitary Pipe 4" x 10ft',
    quantity: 200,
    unit: 'pcs',
    scheduledDate: 'Mar 1',
    estimatedCompletion: '2026-03-05',
    status: 'approved',
    requestedBy: 'John Smith',
    requestDate: '2026-02-25',
    priority: 'high',
    notes: 'Urgent restocking needed'
  },
  {
    id: 'PR002',
    requestNumber: 'PROD-2026-002',
    productSku: 'PVC-PRES-001',
    productName: 'PVC Pressure Pipe 1" x 20ft - Class A',
    quantity: 150,
    unit: 'pcs',
    scheduledDate: 'Mar 3',
    estimatedCompletion: '2026-03-07',
    status: 'pending',
    requestedBy: 'Sarah Johnson',
    requestDate: '2026-02-26',
    priority: 'medium',
    notes: 'Standard production batch'
  },
  {
    id: 'PR003',
    requestNumber: 'PROD-2026-003',
    productSku: 'PVC-DRAIN-001',
    productName: 'PVC Drainage Pipe 6" x 20ft',
    quantity: 100,
    unit: 'pcs',
    scheduledDate: 'Mar 5',
    estimatedCompletion: '2026-03-09',
    status: 'in-progress',
    requestedBy: 'Mike Chen',
    requestDate: '2026-02-24',
    priority: 'high',
    notes: 'Production started'
  },
  {
    id: 'PR004',
    requestNumber: 'PROD-2026-004',
    productSku: 'PVC-ELEC-001',
    productName: 'PVC Electrical Conduit 1/2" x 10ft',
    quantity: 300,
    unit: 'pcs',
    scheduledDate: 'Mar 10',
    estimatedCompletion: '2026-03-14',
    status: 'pending',
    requestedBy: 'Anna Lee',
    requestDate: '2026-02-27',
    priority: 'low',
    notes: 'Schedule after current batch'
  },
  {
    id: 'PR005',
    requestNumber: 'PROD-2026-005',
    productSku: 'PVC-SAN-005',
    productName: 'PVC Sanitary Tee 4"',
    quantity: 250,
    unit: 'pcs',
    scheduledDate: 'Feb 28',
    estimatedCompletion: '2026-03-04',
    status: 'completed',
    requestedBy: 'David Brown',
    requestDate: '2026-02-20',
    priority: 'medium',
    notes: 'Completed on schedule'
  },
  {
    id: 'PR006',
    requestNumber: 'PROD-2026-006',
    productSku: 'PVC-PRES-002',
    productName: 'PVC Pressure Pipe 2" x 20ft - Class B',
    quantity: 180,
    unit: 'pcs',
    scheduledDate: 'Mar 2',
    estimatedCompletion: '2026-03-06',
    status: 'approved',
    requestedBy: 'Emma Wilson',
    requestDate: '2026-02-26',
    priority: 'high',
    notes: 'Customer pre-order'
  },
  {
    id: 'PR007',
    requestNumber: 'PROD-2026-007',
    productSku: 'PVC-FIT-001',
    productName: 'PVC Elbow 4" - 90 degree',
    quantity: 400,
    unit: 'pcs',
    scheduledDate: 'Mar 4',
    estimatedCompletion: '2026-03-08',
    status: 'pending',
    requestedBy: 'Robert Garcia',
    requestDate: '2026-02-27',
    priority: 'medium',
    notes: 'Standard fitting batch'
  },
  {
    id: 'PR008',
    requestNumber: 'PROD-2026-008',
    productSku: 'PVC-SAN-002',
    productName: 'PVC Sanitary Pipe 3" x 10ft',
    quantity: 220,
    unit: 'pcs',
    scheduledDate: 'Mar 6',
    estimatedCompletion: '2026-03-10',
    status: 'approved',
    requestedBy: 'Lisa Martinez',
    requestDate: '2026-02-27',
    priority: 'high',
    notes: 'Branch restocking'
  },
  {
    id: 'PR009',
    requestNumber: 'PROD-2026-009',
    productSku: 'PVC-DRAIN-002',
    productName: 'PVC Drainage Pipe 8" x 20ft',
    quantity: 80,
    unit: 'pcs',
    scheduledDate: 'Mar 8',
    estimatedCompletion: '2026-03-12',
    status: 'pending',
    requestedBy: 'Tom Anderson',
    requestDate: '2026-02-27',
    priority: 'medium',
    notes: 'Large diameter pipes'
  },
  {
    id: 'PR010',
    requestNumber: 'PROD-2026-010',
    productSku: 'PVC-CAP-001',
    productName: 'PVC End Cap 4"',
    quantity: 350,
    unit: 'pcs',
    scheduledDate: 'Mar 9',
    estimatedCompletion: '2026-03-11',
    status: 'pending',
    requestedBy: 'Sarah Johnson',
    requestDate: '2026-02-27',
    priority: 'low',
    notes: 'Accessory production'
  }
];


const mockPurchaseRequests: PurchaseRequest[] = [
  {
    id: 'PU001',
    requestNumber: 'PURCH-2026-001',
    materialCode: 'RESIN-001',
    materialName: 'PVC Resin Powder - K67',
    quantity: 5000,
    unit: 'kg',
    supplier: 'ChemPlastics International',
    requestedDelivery: '2026-03-02',
    estimatedArrival: 'Mar 2',
    status: 'approved',
    requestedBy: 'John Smith',
    requestDate: '2026-02-26',
    priority: 'high',
    notes: 'Critical for production'
  },
  {
    id: 'PU002',
    requestNumber: 'PURCH-2026-002',
    materialCode: 'PLAST-001',
    materialName: 'Plasticizer DOP',
    quantity: 800,
    unit: 'liters',
    supplier: 'FlexiChem Industries',
    requestedDelivery: '2026-03-01',
    estimatedArrival: 'Mar 1',
    status: 'approved',
    requestedBy: 'Sarah Johnson',
    requestDate: '2026-02-25',
    priority: 'high',
    notes: 'Running low, urgent'
  },
  {
    id: 'PU003',
    requestNumber: 'PURCH-2026-003',
    materialCode: 'PIGM-001',
    materialName: 'Titanium Dioxide Pigment (White)',
    quantity: 500,
    unit: 'kg',
    supplier: 'ColorTech Supply',
    requestedDelivery: '2026-03-05',
    estimatedArrival: 'Mar 6',
    status: 'pending',
    requestedBy: 'Mike Chen',
    requestDate: '2026-02-27',
    priority: 'medium',
    notes: 'For white pipe production'
  },
  {
    id: 'PU004',
    requestNumber: 'PURCH-2026-004',
    materialCode: 'STAB-001',
    materialName: 'Heat Stabilizer - Lead-Free',
    quantity: 1200,
    unit: 'kg',
    supplier: 'PolyStab Solutions',
    requestedDelivery: '2026-03-08',
    estimatedArrival: 'Mar 8',
    status: 'pending',
    requestedBy: 'Anna Lee',
    requestDate: '2026-02-27',
    priority: 'medium',
    notes: 'Stock replenishment'
  },
  {
    id: 'PU005',
    requestNumber: 'PURCH-2026-005',
    materialCode: 'PACK-M02',
    materialName: 'Cardboard Boxes - Assorted Sizes',
    quantity: 1000,
    unit: 'pcs',
    supplier: 'PackPro Solutions',
    requestedDelivery: '2026-03-12',
    estimatedArrival: 'Mar 12',
    status: 'pending',
    requestedBy: 'David Brown',
    requestDate: '2026-02-26',
    priority: 'low',
    notes: 'Packaging materials'
  },
  {
    id: 'PU006',
    requestNumber: 'PURCH-2026-006',
    materialCode: 'RESIN-002',
    materialName: 'PVC Resin Powder - K70',
    quantity: 3000,
    unit: 'kg',
    supplier: 'ChemPlastics International',
    requestedDelivery: '2026-03-04',
    estimatedArrival: 'Mar 4',
    status: 'approved',
    requestedBy: 'Emma Wilson',
    requestDate: '2026-02-27',
    priority: 'high',
    notes: 'High-grade resin for premium pipes'
  },
  {
    id: 'PU007',
    requestNumber: 'PURCH-2026-007',
    materialCode: 'UV-001',
    materialName: 'UV Stabilizer Additive',
    quantity: 150,
    unit: 'kg',
    supplier: 'SunGuard Chemicals',
    requestedDelivery: '2026-02-29',
    estimatedArrival: 'Feb 29',
    status: 'approved',
    requestedBy: 'Robert Garcia',
    requestDate: '2026-02-26',
    priority: 'high',
    notes: 'Low stock - urgent delivery'
  },
  {
    id: 'PU008',
    requestNumber: 'PURCH-2026-008',
    materialCode: 'LABEL-001',
    materialName: 'Product Labels - PVC Pipe Specs',
    quantity: 5000,
    unit: 'pcs',
    supplier: 'PrintMark Labels',
    requestedDelivery: '2026-03-07',
    estimatedArrival: 'Mar 7',
    status: 'pending',
    requestedBy: 'Lisa Martinez',
    requestDate: '2026-02-27',
    priority: 'medium',
    notes: 'New label design batch'
  },
  {
    id: 'PU009',
    requestNumber: 'PURCH-2026-009',
    materialCode: 'IMPACT-001',
    materialName: 'Impact Modifier - MBS',
    quantity: 800,
    unit: 'kg',
    supplier: 'PolyTough Materials',
    requestedDelivery: '2026-03-10',
    estimatedArrival: 'Mar 10',
    status: 'pending',
    requestedBy: 'Tom Anderson',
    requestDate: '2026-02-27',
    priority: 'medium',
    notes: 'For impact-resistant pipes'
  },
  {
    id: 'PU010',
    requestNumber: 'PURCH-2026-010',
    materialCode: 'PIGM-002',
    materialName: 'Carbon Black Pigment',
    quantity: 200,
    unit: 'kg',
    supplier: 'ColorTech Supply',
    requestedDelivery: '2026-03-09',
    estimatedArrival: 'Mar 9',
    status: 'pending',
    requestedBy: 'Sarah Johnson',
    requestDate: '2026-02-27',
    priority: 'low',
    notes: 'For gray/black pipe variants'
  }
];

// Movements & Demand Forecast Types and Data
interface DemandDataPoint {
  date: string;
  actual?: number;
  forecast?: number;
  confidenceLow?: number;
  confidenceHigh?: number;
  isForecast: boolean;
}

interface ForecastItem {
  id: string;
  name: string;
  type: 'product' | 'material';
  category: string;
  currentStock: number;
  unit: string;
  avgDailyDemand: number;
  forecastedDailyDemand: number;
  daysOfCover: number;
  predictedStockoutDate: string;
  recommendedReorderDate: string;
  recommendedQuantity: number;
}

// Mock forecast items for selector
const mockForecastItems: ForecastItem[] = [
  {
    id: 'FG001',
    name: 'PVC Pressure Pipe 4" x 10ft',
    type: 'product',
    category: 'PVC Pipes',
    currentStock: 450,
    unit: 'pcs',
    avgDailyDemand: 38,
    forecastedDailyDemand: 40,
    daysOfCover: 11,
    predictedStockoutDate: 'Mar 11',
    recommendedReorderDate: 'Mar 4',
    recommendedQuantity: 300
  },
  {
    id: 'FG002',
    name: 'PVC Sanitary Pipe 4" x 10ft',
    type: 'product',
    category: 'PVC Pipes',
    currentStock: 380,
    unit: 'pcs',
    avgDailyDemand: 32,
    forecastedDailyDemand: 35,
    daysOfCover: 10,
    predictedStockoutDate: 'Mar 9',
    recommendedReorderDate: 'Mar 3',
    recommendedQuantity: 250
  },
  {
    id: 'RM001',
    name: 'PVC Resin Powder - K67',
    type: 'material',
    category: 'Raw Materials',
    currentStock: 3200,
    unit: 'kg',
    avgDailyDemand: 285,
    forecastedDailyDemand: 305,
    daysOfCover: 10,
    predictedStockoutDate: 'Mar 16',
    recommendedReorderDate: 'Feb 28',
    recommendedQuantity: 5000
  },
  {
    id: 'RM002',
    name: 'Plasticizer DOP',
    type: 'material',
    category: 'Raw Materials',
    currentStock: 850,
    unit: 'liters',
    avgDailyDemand: 48,
    forecastedDailyDemand: 52,
    daysOfCover: 16,
    predictedStockoutDate: 'Mar 18',
    recommendedReorderDate: 'Mar 8',
    recommendedQuantity: 800
  },
  {
    id: 'FG003',
    name: 'PVC Elbow 4" - 90 degree',
    type: 'product',
    category: 'PVC Fittings',
    currentStock: 620,
    unit: 'pcs',
    avgDailyDemand: 45,
    forecastedDailyDemand: 48,
    daysOfCover: 12,
    predictedStockoutDate: 'Mar 13',
    recommendedReorderDate: 'Mar 5',
    recommendedQuantity: 400
  }
];

// Generate demand data for selected item
const generateDemandData = (itemId: string): DemandDataPoint[] => {
  const data: DemandDataPoint[] = [];
  const today = new Date('2026-02-27');
  
  // Generate 14 days historical data (Feb 13-27)
  for (let i = -14; i < 0; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    // Simulate realistic patterns
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isMonday = dayOfWeek === 1;
    
    let baseQuantity = 38;
    if (itemId === 'RM001') baseQuantity = 285;
    
    let actual = baseQuantity;
    if (isWeekend) actual *= 0.75; // Lower on weekends
    if (isMonday) actual *= 1.2; // Monday surge
    actual += (Math.random() - 0.5) * 10; // Random variation
    actual = Math.round(actual);
    
    // For materials, make it batch-based (0 on non-production days)
    if (itemId === 'RM001' && Math.random() > 0.4) {
      actual = 0;
    } else if (itemId === 'RM001') {
      actual = Math.round(actual * 2.2); // Higher quantity when used
    }
    
    data.push({
      date: dateStr,
      actual,
      isForecast: false
    });
  }
  
  // Generate 14 days forecast data (Feb 28-Mar 13)
  for (let i = 1; i <= 14; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isMonday = dayOfWeek === 1;
    
    let baseQuantity = 40;
    if (itemId === 'RM001') baseQuantity = 305;
    
    let forecast = baseQuantity;
    if (isWeekend) forecast *= 0.75;
    if (isMonday) forecast *= 1.25;
    if (i === 8) forecast *= 1.3; // Peak on Mar 8
    forecast += (Math.random() - 0.5) * 8;
    forecast = Math.round(forecast);
    
    // For materials, make it batch-based
    if (itemId === 'RM001' && Math.random() > 0.4) {
      forecast = 0;
    } else if (itemId === 'RM001') {
      forecast = Math.round(forecast * 2.1);
    }
    
    const confidenceMargin = forecast * 0.15;
    
    data.push({
      date: dateStr,
      forecast,
      confidenceLow: Math.round(forecast - confidenceMargin),
      confidenceHigh: Math.round(forecast + confidenceMargin),
      isForecast: true
    });
  }
  
  return data;
};


export default function WarehousePage() {
  const [activeTab, setActiveTab] = useState<TabType>('inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StockStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<'finished' | 'raw'>('finished');
  const [requestType, setRequestType] = useState<RequestType>('production');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showOrderDetailModal, setShowOrderDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState<any>(null);
  
  // Movements tab state
  const [selectedForecastItem, setSelectedForecastItem] = useState<ForecastItem>(mockForecastItems[0]);
  const [demandData, setDemandData] = useState<DemandDataPoint[]>(generateDemandData(mockForecastItems[0].id));

  const getStatusColor = (status: StockStatus) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800 border-green-300';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
    }
  };

  const getStatusIcon = (status: StockStatus) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      case 'critical': return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getStatusText = (status: StockStatus) => {
    switch (status) {
      case 'healthy': return 'Healthy';
      case 'warning': return 'Low Stock';
      case 'critical': return 'Critical';
    }
  };

  const getRequestStatusColor = (status: RequestStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'approved': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'in-progress': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'completed': return 'bg-green-100 text-green-800 border-green-300';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-300';
    }
  };

  const getRequestStatusText = (status: RequestStatus) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'approved': return 'Approved';
      case 'in-progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
    }
  };

  const getPriorityColor = (priority: 'low' | 'medium' | 'high') => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const filteredFinishedGoods = mockFinishedGoods.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const filteredRawMaterials = mockRawMaterials.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const finishedGoodsCategories = ['all', ...Array.from(new Set(mockFinishedGoods.map(item => item.category)))];
  const rawMaterialsCategories = ['all', ...Array.from(new Set(mockRawMaterials.map(item => item.category)))];

  const tabs = [
    { id: 'inventory' as TabType, label: 'Inventory', icon: Package },
    { id: 'requests' as TabType, label: 'Requests & Schedule', icon: FileText },
    { id: 'orders' as TabType, label: 'Orders & Loading', icon: Truck },
    { id: 'movements' as TabType, label: 'Movements', icon: History }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Warehouse Management</h1>
          <p className="text-sm text-gray-600 mt-1">Track inventory, manage requests, and coordinate logistics</p>
        </div>

        {/* Tabs */}
        <div className="px-6">
          <div className="flex gap-4 border-b border-gray-200">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            {/* Controls */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  {/* View Mode Toggle */}
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('finished')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        viewMode === 'finished'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Finished Goods
                    </button>
                    <button
                      onClick={() => setViewMode('raw')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        viewMode === 'raw'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Raw Materials
                    </button>
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by name or code..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-80 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Category Filter */}
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {(viewMode === 'finished' ? finishedGoodsCategories : rawMaterialsCategories).map(cat => (
                        <option key={cat} value={cat}>
                          {cat === 'all' ? 'All Categories' : cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status Filter */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as StockStatus | 'all')}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="healthy">Healthy</option>
                    <option value="warning">Low Stock</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <p className="text-sm text-gray-600">Total Items</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {viewMode === 'finished' ? filteredFinishedGoods.length : filteredRawMaterials.length}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Healthy Stock</p>
                  <p className="text-2xl font-bold text-green-600">
                    {viewMode === 'finished' 
                      ? filteredFinishedGoods.filter(i => i.status === 'healthy').length
                      : filteredRawMaterials.filter(i => i.status === 'healthy').length
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Low Stock</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {viewMode === 'finished' 
                      ? filteredFinishedGoods.filter(i => i.status === 'warning').length
                      : filteredRawMaterials.filter(i => i.status === 'warning').length
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Critical</p>
                  <p className="text-2xl font-bold text-red-600">
                    {viewMode === 'finished' 
                      ? filteredFinishedGoods.filter(i => i.status === 'critical').length
                      : filteredRawMaterials.filter(i => i.status === 'critical').length
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Inventory Tables */}
            {viewMode === 'finished' ? (
              /* Finished Goods Table */
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stock</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reorder Point</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capacity</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Restocked</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredFinishedGoods.map(item => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{item.sku}</td>
                          <td className="px-3 py-3 text-sm text-gray-900">{item.name}</td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">{item.category}</td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm">
                            <span className="font-semibold text-gray-900">{item.currentStock}</span>
                            <span className="text-gray-500"> {item.unit}</span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">{item.reorderPoint} {item.unit}</td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${
                                    (item.currentStock / item.maxCapacity) * 100 > 60 ? 'bg-green-500' :
                                    (item.currentStock / item.maxCapacity) * 100 > 30 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${(item.currentStock / item.maxCapacity) * 100}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500">
                                {Math.round((item.currentStock / item.maxCapacity) * 100)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm font-mono text-gray-600">{item.location}</td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                              {getStatusIcon(item.status)}
                              {getStatusText(item.status)}
                            </span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">{item.lastRestocked}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* Raw Materials Table */
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material Name</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stock</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reorder Point</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Daily Usage</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days Remaining</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Purchased</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredRawMaterials.map(item => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{item.code}</td>
                          <td className="px-3 py-3 text-sm text-gray-900">{item.name}</td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">{item.category}</td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm">
                            <span className="font-semibold text-gray-900">{item.currentStock}</span>
                            <span className="text-gray-500"> {item.unit}</span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">{item.reorderPoint} {item.unit}</td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm">
                            <div className="flex items-center gap-1 text-gray-600">
                              <TrendingDown className="w-4 h-4 text-gray-400" />
                              {item.dailyConsumption} {item.unit}/day
                            </div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm">
                            <span className={`font-semibold ${
                              item.daysRemaining > 10 ? 'text-green-600' :
                              item.daysRemaining > 5 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {item.daysRemaining} days
                            </span>
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600">{item.supplier}</td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                              {getStatusIcon(item.status)}
                              {getStatusText(item.status)}
                            </span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">{item.lastPurchased}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="space-y-4">
            {/* Controls Header */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Request Type Toggle */}
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setRequestType('production')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        requestType === 'production'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <Factory className="w-4 h-4" />
                      Production Requests
                    </button>
                    <button
                      onClick={() => setRequestType('purchase')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        requestType === 'purchase'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Purchase Requests
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  New Request
                </button>
              </div>

              {/* Schedule Calendar */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="flex items-center gap-2 font-semibold text-gray-900">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    Schedule Calendar (14 Days)
                  </h3>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-gray-600">Production</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="text-gray-600">Material Arrival</span>
                    </div>
                  </div>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2">
                  {(() => {
                    const today = new Date('2026-02-27');
                    const days: Date[] = [];
                    for (let i = 0; i < 14; i++) {
                      const date = new Date(today);
                      date.setDate(today.getDate() + i);
                      days.push(date);
                    }

                    // Map requests to calendar events
                    const eventsByDate: Record<string, any[]> = {};
                    
                    // Add production requests
                    mockProductionRequests.forEach(req => {
                      const dateKey = req.scheduledDate;
                      if (!eventsByDate[dateKey]) eventsByDate[dateKey] = [];
                      eventsByDate[dateKey].push({
                        type: 'production',
                        title: req.productName,
                        requestNumber: req.requestNumber,
                        quantity: req.quantity,
                        unit: req.unit,
                        priority: req.priority,
                        status: req.status
                      });
                    });

                    // Add purchase requests  
                    mockPurchaseRequests.forEach(req => {
                      const dateKey = req.estimatedArrival;
                      if (!eventsByDate[dateKey]) eventsByDate[dateKey] = [];
                      eventsByDate[dateKey].push({
                        type: 'purchase',
                        title: req.materialName,
                        requestNumber: req.requestNumber,
                        quantity: req.quantity,
                        unit: req.unit,
                        supplier: req.supplier,
                        priority: req.priority,
                        status: req.status
                      });
                    });

                    const formatDate = (date: Date) => date.toISOString().split('T')[0];
                    const isToday = (date: Date) => formatDate(date) === formatDate(today);

                    return days.map((day, idx) => {
                      const dateKey = day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).replace(' ', ' ');
                      const dayEvents = eventsByDate[dateKey] || [];

                      return (
                        <div
                          key={idx}
                          className={`min-h-24 p-2 rounded-lg border transition-all ${
                            isToday(day)
                              ? 'bg-red-50 border-red-300 ring-2 ring-red-200'
                              : 'bg-white border-gray-200'
                          } ${dayEvents.length > 0 ? 'hover:shadow-md cursor-pointer' : 'opacity-60'}`}
                          onClick={() => dayEvents.length > 0 && setSelectedCalendarEvent(dayEvents[0])}
                        >
                          <div className="flex flex-col h-full">
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-xs font-semibold ${isToday(day) ? 'text-red-700' : 'text-gray-500'}`}>
                                {day.toLocaleDateString('en-US', { weekday: 'short' })}
                              </span>
                              <span className={`text-sm font-bold ${isToday(day) ? 'text-red-700' : 'text-gray-900'}`}>
                                {day.getDate()}
                              </span>
                            </div>
                            
                            <div className="flex-1 space-y-1">
                              {dayEvents.slice(0, 2).map((event, eventIdx) => (
                                <div
                                  key={eventIdx}
                                  className={`text-xs p-1 rounded flex items-center gap-1 ${
                                    event.type === 'production'
                                      ? 'bg-green-500 text-white'
                                      : 'bg-blue-500 text-white'
                                  }`}
                                  title={event.title}
                                >
                                  {event.type === 'production' ? (
                                    <Factory className="w-3 h-3 flex-shrink-0" />
                                  ) : (
                                    <ShoppingCart className="w-3 h-3 flex-shrink-0" />
                                  )}
                                  <span className="truncate flex-1">{event.title}</span>
                                </div>
                              ))}
                              {dayEvents.length > 2 && (
                                <div className="text-xs text-gray-500 font-medium text-center">
                                  +{dayEvents.length - 2} more
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-5 gap-4 mt-4 pt-4 border-t border-gray-200">
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {requestType === 'production' ? mockProductionRequests.length : mockPurchaseRequests.length}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {requestType === 'production' 
                      ? mockProductionRequests.filter(r => r.status === 'pending').length
                      : mockPurchaseRequests.filter(r => r.status === 'pending').length
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Approved</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {requestType === 'production' 
                      ? mockProductionRequests.filter(r => r.status === 'approved').length
                      : mockPurchaseRequests.filter(r => r.status === 'approved').length
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">In Progress</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {requestType === 'production' 
                      ? mockProductionRequests.filter(r => r.status === 'in-progress').length
                      : mockPurchaseRequests.filter(r => r.status === 'in-progress').length
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-green-600">
                    {requestType === 'production' 
                      ? mockProductionRequests.filter(r => r.status === 'completed').length
                      : mockPurchaseRequests.filter(r => r.status === 'completed').length
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Production Requests Table */}
            {requestType === 'production' && (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request #</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scheduled Date</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Est. Completion</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested By</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {mockProductionRequests.map(request => (
                        <tr key={request.id} className="hover:bg-gray-50">
                          <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{request.requestNumber}</td>
                          <td className="px-3 py-3 text-sm text-gray-900">
                            <div>
                              <div className="font-medium">{request.productName}</div>
                              <div className="text-xs text-gray-500">{request.productSku}</div>
                            </div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm">
                            <span className="font-semibold text-gray-900">{request.quantity}</span>
                            <span className="text-gray-500"> {request.unit}</span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4 text-gray-400" />
                              {request.scheduledDate}
                            </div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">{request.estimatedCompletion}</td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getRequestStatusColor(request.status)}`}>
                              {getRequestStatusText(request.status)}
                            </span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getPriorityColor(request.priority)}`}>
                              {request.priority.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">{request.requestedBy}</td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">{request.requestDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Purchase Requests Table */}
            {requestType === 'purchase' && (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request #</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested Delivery</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Est. Arrival</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested By</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {mockPurchaseRequests.map(request => (
                        <tr key={request.id} className="hover:bg-gray-50">
                          <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{request.requestNumber}</td>
                          <td className="px-3 py-3 text-sm text-gray-900">
                            <div>
                              <div className="font-medium">{request.materialName}</div>
                              <div className="text-xs text-gray-500">{request.materialCode}</div>
                            </div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm">
                            <span className="font-semibold text-gray-900">{request.quantity}</span>
                            <span className="text-gray-500"> {request.unit}</span>
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600">{request.supplier}</td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4 text-gray-400" />
                              {request.requestedDelivery}
                            </div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">{request.estimatedArrival}</td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getRequestStatusColor(request.status)}`}>
                              {getRequestStatusText(request.status)}
                            </span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getPriorityColor(request.priority)}`}>
                              {request.priority.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">{request.requestedBy}</td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">{request.requestDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-6">
            {/* Header with Stats */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-600">Ready to Load</p>
                <p className="text-2xl font-bold text-blue-600">8</p>
                <p className="text-xs text-gray-500 mt-1">Orders approved</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-600">Currently Loading</p>
                <p className="text-2xl font-bold text-yellow-600">2</p>
                <p className="text-xs text-gray-500 mt-1">Trucks in progress</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-600">Ready to Depart</p>
                <p className="text-2xl font-bold text-green-600">1</p>
                <p className="text-xs text-gray-500 mt-1">Loaded & verified</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-600">Stock Issues</p>
                <p className="text-2xl font-bold text-red-600">3</p>
                <p className="text-xs text-gray-500 mt-1">Orders with shortages</p>
              </div>
            </div>

            {/* Orders Ready for Loading */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Orders Ready for Loading</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Order</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Customer</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Destination</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Stock Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Weight/Volume</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Required</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Urgency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {/* Order 1 - All Stock Available */}
                    <tr 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setSelectedOrder({
                          orderNumber: 'ORD-2026-1234',
                          customer: 'BuildRight Corp',
                          destination: 'Quezon City',
                          requiredDate: 'Feb 28, 2026',
                          items: [
                            { name: 'PVC Pipe 4" Pressure', sku: 'PVC-P-4-001', quantity: 100, currentStock: 200, unit: 'pcs', status: 'available' },
                            { name: 'PVC Elbow 4"', sku: 'PVC-E-4-001', quantity: 50, currentStock: 150, unit: 'pcs', status: 'available' },
                            { name: 'PVC Tee 4"', sku: 'PVC-T-4-001', quantity: 30, currentStock: 80, unit: 'pcs', status: 'available' }
                          ],
                          totalWeight: 850,
                          totalVolume: 4.2,
                          urgency: 'High',
                          status: 'Approved'
                        });
                        setShowOrderDetailModal(true);
                      }}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">Order 1 - All Stock Available</div>
                        <div className="text-xs text-gray-600">ORD-2026-1234</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">BuildRight Corp</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">Quezon City</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-green-600">All Available</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">850 kg</div>
                        <div className="text-xs text-gray-600">4.2 m³</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">Feb 28</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs font-medium">High</span>
                      </td>
                    </tr>

                    {/* Order 2 - Stock Shortage */}
                    <tr 
                      className="hover:bg-gray-50 bg-red-50 cursor-pointer"
                      onClick={() => {
                        setSelectedOrder({
                          orderNumber: 'ORD-2026-1235',
                          customer: 'MegaConstruct Inc',
                          destination: 'Makati City',
                          requiredDate: 'Feb 29, 2026',
                          items: [
                            { name: 'PVC Pipe 4" Sanitary', sku: 'PVC-S-4-001', quantity: 200, currentStock: 50, unit: 'pcs', status: 'shortage', nextBatch: { date: 'Mar 2', quantity: 500 } },
                            { name: 'PVC Elbow 2"', sku: 'PVC-E-2-001', quantity: 100, currentStock: 80, unit: 'pcs', status: 'partial', nextBatch: { date: 'Mar 1', quantity: 300 } },
                            { name: 'PVC Cap 4"', sku: 'PVC-C-4-001', quantity: 50, currentStock: 100, unit: 'pcs', status: 'available' },
                            { name: 'PVC Adapter 4"', sku: 'PVC-A-4-001', quantity: 30, currentStock: 60, unit: 'pcs', status: 'available' }
                          ],
                          totalWeight: 1200,
                          totalVolume: 6.8,
                          urgency: 'Medium',
                          status: 'Approved'
                        });
                        setShowOrderDetailModal(true);
                      }}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">Order 2 - Stock Shortage</div>
                        <div className="text-xs text-gray-600">ORD-2026-1235</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">MegaConstruct Inc</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">Makati City</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                          <span className="text-sm font-medium text-red-600">Stock Issues</span>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">2 items affected</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">1,200 kg</div>
                        <div className="text-xs text-gray-600">6.8 m³</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">Feb 29</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-yellow-50 text-yellow-700 rounded text-xs font-medium">Medium</span>
                      </td>
                    </tr>

                    {/* Order 3 - All Available */}
                    <tr 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setSelectedOrder({
                          orderNumber: 'ORD-2026-1236',
                          customer: 'CityWorks Ltd',
                          destination: 'Pasig City',
                          requiredDate: 'Mar 1, 2026',
                          items: [
                            { name: 'PVC Pipe 6" Pressure', sku: 'PVC-P-6-001', quantity: 80, currentStock: 150, unit: 'pcs', status: 'available' },
                            { name: 'PVC Coupling 6"', sku: 'PVC-C-6-001', quantity: 40, currentStock: 25, unit: 'pcs', status: 'partial', nextBatch: { date: 'Mar 3', quantity: 200 } }
                          ],
                          totalWeight: 720,
                          totalVolume: 3.8,
                          urgency: 'Low',
                          status: 'Approved'
                        });
                        setShowOrderDetailModal(true);
                      }}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">Order 3 - Partial Stock</div>
                        <div className="text-xs text-gray-600">ORD-2026-1236</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">CityWorks Ltd</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">Pasig City</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4 text-yellow-600" />
                          <span className="text-sm font-medium text-yellow-600">Partial Stock</span>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">1 item affected</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">720 kg</div>
                        <div className="text-xs text-gray-600">3.8 m³</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">Mar 1</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">Low</span>
                      </td>
                    </tr>

                    {/* Order 4 - Assigned to Truck - Loading */}
                    <tr 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setSelectedOrder({
                          orderNumber: 'ORD-2026-1237',
                          customer: 'Manila Builders',
                          destination: 'Manila',
                          requiredDate: 'Mar 2, 2026',
                          items: [
                            { name: 'PVC Pipe 4" Pressure', sku: 'PVC-P-4-001', quantity: 120, currentStock: 200, unit: 'pcs', status: 'available' },
                            { name: 'PVC Elbow 4"', sku: 'PVC-E-4-001', quantity: 60, currentStock: 150, unit: 'pcs', status: 'available' },
                            { name: 'PVC Tee 4"', sku: 'PVC-T-4-001', quantity: 40, currentStock: 80, unit: 'pcs', status: 'available' }
                          ],
                          totalWeight: 950,
                          totalVolume: 5.1,
                          urgency: 'High',
                          status: 'Assigned',
                          truckId: 'TRK-003',
                          truckName: 'Truck 003 (DEF-9012)',
                          driverName: 'Pedro Cruz',
                          scheduledDeparture: 'Today, 1:00 PM'
                        });
                        setShowOrderDetailModal(true);
                      }}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">Order 4 - Assigned to Truck</div>
                        <div className="text-xs text-gray-600">ORD-2026-1237</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">Manila Builders</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">Manila</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-green-600">All Available</span>
                        </div>
                        <div className="text-xs text-blue-600 mt-1 font-medium">📦 Truck 003 assigned</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">950 kg</div>
                        <div className="text-xs text-gray-600">5.1 m³</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">Mar 2</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs font-medium">High</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Available Trucks */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Available Trucks</h3>
              </div>

              <div className="grid grid-cols-3 gap-4 p-4">
                {/* Truck 1 - Available */}
                <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Truck className="w-5 h-5 text-blue-600" />
                        <div className="font-semibold text-gray-900">Truck 002</div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">ABC-5678</div>
                    </div>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Available
                    </span>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>Driver: Carlos Garcia</span>
                    </div>
                    <div className="text-xs text-gray-500">Next departure: 2:00 PM</div>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-600">Weight</span>
                        <span className="font-medium">0/5,000 kg (0%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: '0%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-600">Volume</span>
                        <span className="font-medium">0/25 m³ (0%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-purple-500 h-2 rounded-full" style={{ width: '0%' }}></div>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 mb-3">
                    Orders: 0 • Ready for loading
                  </div>

                  <button className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                    Start Loading
                  </button>
                </div>

                {/* Truck 2 - Loading (64%) */}
                <div className="border border-yellow-300 rounded-lg p-4 bg-yellow-50">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Truck className="w-5 h-5 text-yellow-600" />
                        <div className="font-semibold text-gray-900">Truck 003</div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">DEF-9012</div>
                    </div>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Loading
                    </span>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>Driver: Pedro Cruz</span>
                    </div>
                    <div className="text-xs text-gray-500">Departure: 1:00 PM</div>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-600">Weight</span>
                        <span className="font-medium">3,200/5,000 kg (64%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: '64%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-600">Volume</span>
                        <span className="font-medium">15.8/25 m³ (63%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-purple-500 h-2 rounded-full" style={{ width: '63%' }}></div>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 mb-3">
                    Orders: 2 • Loading in progress
                  </div>

                  <button className="w-full px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium">
                    Continue Loading
                  </button>
                </div>

                {/* Truck 3 - Ready to Depart (85%) */}
                <div className="border border-green-300 rounded-lg p-4 bg-green-50">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Truck className="w-5 h-5 text-green-600" />
                        <div className="font-semibold text-gray-900">Truck 001</div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">ABC-1234</div>
                    </div>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Ready
                    </span>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>Driver: Juan Santos</span>
                    </div>
                    <div className="text-xs text-green-600 font-medium">✓ Loaded & verified</div>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-600">Weight</span>
                        <span className="font-medium">4,250/5,000 kg (85%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-600">Volume</span>
                        <span className="font-medium">21.3/25 m³ (85%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-purple-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 mb-3">
                    Orders: 3 • Ready for dispatch
                  </div>

                  <button className="w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
                    Confirm Departure
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'movements' && (
          <div className="space-y-6">
            {/* Header with Item Selector */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <Activity className="w-7 h-7 text-blue-600" />
                    Demand Forecast & Movement Analysis
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">AI-powered demand prediction using historical data and machine learning</p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Brain className="w-5 h-5 text-purple-600" />
                  <div>
                    <div className="font-semibold text-gray-900">Model Accuracy: 87.3%</div>
                    <div className="text-xs text-gray-500">Last updated: Today, 6:00 AM</div>
                  </div>
                </div>
              </div>

              {/* Item Selector */}
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Item to Forecast
                  </label>
                  <select
                    value={selectedForecastItem.id}
                    onChange={(e) => {
                      const item = mockForecastItems.find(i => i.id === e.target.value);
                      if (item) {
                        setSelectedForecastItem(item);
                        setDemandData(generateDemandData(item.id));
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                  >
                    <optgroup label="Finished Products">
                      {mockForecastItems.filter(i => i.type === 'product').map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name} - {item.currentStock} {item.unit}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Raw Materials">
                      {mockForecastItems.filter(i => i.type === 'material').map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name} - {item.currentStock} {item.unit}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
                <button 
                  onClick={() => setDemandData(generateDemandData(selectedForecastItem.id))}
                  className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>
            </div>

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-gray-600">Current Stock</div>
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {selectedForecastItem.currentStock.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">{selectedForecastItem.unit}</div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-gray-600">Days of Cover</div>
                  <Clock className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {selectedForecastItem.daysOfCover}
                </div>
                <div className="text-sm text-gray-500">days remaining</div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-gray-600">Predicted Stockout</div>
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {selectedForecastItem.predictedStockoutDate}
                </div>
                <div className="text-sm text-gray-500">if no replenishment</div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-gray-600">Recommended Reorder</div>
                  <Target className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {selectedForecastItem.recommendedQuantity}
                </div>
                <div className="text-sm text-gray-500">by {selectedForecastItem.recommendedReorderDate}</div>
              </div>
            </div>

            {/* Demand Forecast Chart */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    28-Day Demand Forecast
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Historical consumption (14 days) + AI-predicted demand (14 days)
                  </p>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-1 bg-blue-600 rounded"></div>
                    <span className="text-gray-600">Historical (Actual)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-1 bg-orange-500 rounded" style={{ borderTop: '2px dashed orange' }}></div>
                    <span className="text-gray-600">Forecast (Predicted)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-4 bg-orange-100 rounded border border-orange-300"></div>
                    <span className="text-gray-600">Confidence Range</span>
                  </div>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={demandData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    label={{ value: `Quantity (${selectedForecastItem.unit})`, angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    labelStyle={{ fontWeight: 'bold', marginBottom: '8px' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  
                  {/* Confidence interval (shaded area) */}
                  <Area
                    type="monotone"
                    dataKey="confidenceHigh"
                    stroke="none"
                    fill="#fed7aa"
                    fillOpacity={0.3}
                    name="Confidence High"
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="confidenceLow"
                    stroke="none"
                    fill="#ffffff"
                    fillOpacity={1}
                    name="Confidence Low"
                    dot={false}
                  />
                  
                  {/* Actual historical line */}
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={{ fill: '#2563eb', r: 4 }}
                    name="Historical Actual"
                    connectNulls={false}
                  />
                  
                  {/* Forecasted line */}
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    stroke="#f97316"
                    strokeWidth={3}
                    strokeDasharray="8 4"
                    dot={{ fill: '#f97316', r: 4 }}
                    name="Forecasted Demand"
                    connectNulls={false}
                  />
                  
                  {/* Today marker */}
                  <ReferenceLine 
                    x="Feb 27" 
                    stroke="#dc2626" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    label={{ 
                      value: 'Today', 
                      position: 'top',
                      fill: '#dc2626',
                      fontWeight: 'bold',
                      fontSize: 12
                    }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* ML Insights & Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* ML Insights Panel */}
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-purple-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="w-6 h-6 text-purple-600" />
                  <h3 className="text-lg font-semibold text-gray-900">AI Model Insights</h3>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                    <div>
                      <div className="font-medium text-gray-900">Trend Analysis</div>
                      <div className="text-sm text-gray-600">
                        {selectedForecastItem.forecastedDailyDemand > selectedForecastItem.avgDailyDemand 
                          ? `Demand increasing by ${Math.round(((selectedForecastItem.forecastedDailyDemand - selectedForecastItem.avgDailyDemand) / selectedForecastItem.avgDailyDemand) * 100)}% - growth trend detected`
                          : 'Stable demand pattern with seasonal variation'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                    <div>
                      <div className="font-medium text-gray-900">Pattern Recognition</div>
                      <div className="text-sm text-gray-600">
                        Weekly cycle detected: Higher demand on weekdays (Mon-Fri), 25% drop on weekends
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                    <div>
                      <div className="font-medium text-gray-900">Peak Forecast</div>
                      <div className="text-sm text-gray-600">
                        Expected demand spike on Mar 8 (+30%) due to scheduled orders and historical patterns
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                    <div>
                      <div className="font-medium text-gray-900">Recommendation</div>
                      <div className="text-sm text-gray-600">
                        {selectedForecastItem.daysOfCover < 10 
                          ? `🚨 Urgent: Reorder ${selectedForecastItem.recommendedQuantity} ${selectedForecastItem.unit} by ${selectedForecastItem.recommendedReorderDate}`
                          : `Maintain current stock levels. Reorder ${selectedForecastItem.recommendedQuantity} ${selectedForecastItem.unit} by ${selectedForecastItem.recommendedReorderDate}`
                        }
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-purple-200">
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>📊 Data Points Used: 90 days historical + production schedule</div>
                      <div>🎯 Confidence Level: High (87.3% accuracy on validation set)</div>
                      <div>⏱️ Model Last Trained: Today, 6:00 AM</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Smart Alerts Panel */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-6 h-6 text-orange-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Smart Alerts</h3>
                </div>
                
                <div className="space-y-3">
                  {selectedForecastItem.daysOfCover <= 10 && (
                    <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-medium text-red-900 mb-1">Low Stock Warning</div>
                        <div className="text-sm text-red-700">
                          Only {selectedForecastItem.daysOfCover} days of stock remaining. Stockout predicted on {selectedForecastItem.predictedStockoutDate}.
                        </div>
                        <button className="mt-2 text-xs font-medium text-red-600 hover:text-red-700 underline">
                          Create {selectedForecastItem.type === 'product' ? 'Production' : 'Purchase'} Request
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-orange-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-orange-900 mb-1">Demand Spike Predicted</div>
                      <div className="text-sm text-orange-700">
                        +30% increase expected on Mar 8 (Peak: ~{Math.round(selectedForecastItem.forecastedDailyDemand * 1.3)} {selectedForecastItem.unit})
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <Target className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-blue-900 mb-1">Reorder Point Approaching</div>
                      <div className="text-sm text-blue-700">
                        Recommended to reorder {selectedForecastItem.recommendedQuantity} {selectedForecastItem.unit} by {selectedForecastItem.recommendedReorderDate}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <Activity className="w-5 h-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-green-900 mb-1">Seasonal Pattern Detected</div>
                      <div className="text-sm text-green-700">
                        Weekly cycle confirmed: 25% lower demand on weekends, Monday surge pattern
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Movement History Table */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-gray-600" />
                  Recent Movement History (Last 30 Days)
                </h3>
                <p className="text-sm text-gray-600 mt-1">Actual stock movements for {selectedForecastItem.name}</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Feb 27, 2:45 PM</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">Out</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">-35 {selectedForecastItem.unit}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">ORD-2026-045</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">J. Santos</td>
                      <td className="px-6 py-4 text-sm text-gray-500">Customer delivery</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Feb 27, 10:30 AM</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">Production</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">+100 {selectedForecastItem.unit}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">BATCH-2026-027</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">System</td>
                      <td className="px-6 py-4 text-sm text-gray-500">Production completion</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Feb 26, 4:15 PM</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">Out</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">-42 {selectedForecastItem.unit}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">ORD-2026-044</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">M. Cruz</td>
                      <td className="px-6 py-4 text-sm text-gray-500">Manila delivery</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Feb 26, 11:00 AM</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">Transfer</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">+25 {selectedForecastItem.unit}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">TRF-2026-012</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">P. Garcia</td>
                      <td className="px-6 py-4 text-sm text-gray-500">From Branch B</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Feb 25, 3:20 PM</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">Out</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">-38 {selectedForecastItem.unit}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">ORD-2026-043</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">R. Santos</td>
                      <td className="px-6 py-4 text-sm text-gray-500">Urgent order</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-4 border-t border-gray-200 text-center">
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  View Full History (90 days) →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Request Modal */}
      <CreateRequestModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        initialType={requestType}
        finishedGoods={mockFinishedGoods}
        rawMaterials={mockRawMaterials}
      />

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          isOpen={showOrderDetailModal}
          onClose={() => {
            setShowOrderDetailModal(false);
            setSelectedOrder(null);
          }}
          order={selectedOrder}
        />
      )}

      {/* Calendar Event Detail Modal */}
      {selectedCalendarEvent && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  selectedCalendarEvent.type === 'production' ? 'bg-green-100' : 'bg-blue-100'
                }`}>
                  {selectedCalendarEvent.type === 'production' ? (
                    <Factory className={`w-6 h-6 ${selectedCalendarEvent.type === 'production' ? 'text-green-600' : 'text-blue-600'}`} />
                  ) : (
                    <ShoppingCart className={`w-6 h-6 ${selectedCalendarEvent.type === 'production' ? 'text-green-600' : 'text-blue-600'}`} />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900">
                    {selectedCalendarEvent.type === 'production' ? 'Production Batch' : 'Material Arrival'}
                  </h3>
                  <p className="text-sm text-gray-500">{selectedCalendarEvent.requestNumber}</p>
                </div>
                <button
                  onClick={() => setSelectedCalendarEvent(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Details */}
              <div className="space-y-3 mb-6 text-sm bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    {selectedCalendarEvent.type === 'production' ? 'Product:' : 'Material:'}
                  </span>
                  <span className="font-medium">{selectedCalendarEvent.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Quantity:</span>
                  <span className="font-medium">{selectedCalendarEvent.quantity} {selectedCalendarEvent.unit}</span>
                </div>
                {selectedCalendarEvent.supplier && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Supplier:</span>
                    <span className="font-medium">{selectedCalendarEvent.supplier}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Priority:</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    selectedCalendarEvent.priority === 'high' ? 'bg-red-100 text-red-700' :
                    selectedCalendarEvent.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {selectedCalendarEvent.priority.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    selectedCalendarEvent.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    selectedCalendarEvent.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                    selectedCalendarEvent.status === 'in-progress' ? 'bg-purple-100 text-purple-700' :
                    selectedCalendarEvent.status === 'completed' ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {selectedCalendarEvent.status === 'in-progress' ? 'IN PROGRESS' : selectedCalendarEvent.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedCalendarEvent(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    console.log('View full request:', selectedCalendarEvent.requestNumber);
                    setSelectedCalendarEvent(null);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  View Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
