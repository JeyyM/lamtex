import { Branch } from '../types';

export interface BranchData {
  id: string;
  name: Branch;
  location: string;
  warehouseManager: string;
  logisticsManager: string;
}

export const BRANCHES: BranchData[] = [
  {
    id: 'branch-a',
    name: 'Branch A',
    location: 'Quezon City, Metro Manila',
    warehouseManager: 'Carlos Mendoza',
    logisticsManager: 'Ana Rivera'
  },
  {
    id: 'branch-b',
    name: 'Branch B',
    location: 'Cebu City, Cebu',
    warehouseManager: 'Roberto Santos',
    logisticsManager: 'Elena Cruz'
  },
  {
    id: 'branch-c',
    name: 'Branch C',
    location: 'Davao City, Davao',
    warehouseManager: 'Miguel Torres',
    logisticsManager: 'Sofia Reyes'
  }
];

export const getBranchById = (branchName: Branch): BranchData | undefined => {
  return BRANCHES.find(b => b.name === branchName);
};
