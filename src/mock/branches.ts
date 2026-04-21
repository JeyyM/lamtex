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
    id: 'branch-mnl',
    name: 'Manila',
    location: 'Valenzuela City, Metro Manila',
    warehouseManager: 'Ricardo Santos',
    logisticsManager: 'Ana Rivera'
  },
  {
    id: 'branch-ceb',
    name: 'Cebu',
    location: 'Cebu City, Cebu',
    warehouseManager: 'Maria Dela Cruz',
    logisticsManager: 'Elena Cruz'
  },
  {
    id: 'branch-btg',
    name: 'Batangas',
    location: 'Batangas City, Batangas',
    warehouseManager: 'Jose Reyes',
    logisticsManager: 'Sofia Reyes'
  }
];

export const getBranchById = (branchName: Branch): BranchData | undefined => {
  return BRANCHES.find(b => b.name === branchName);
};
