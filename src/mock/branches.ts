import { Branch } from '../types';
import {
  LAMTEX_BRANCH_CALABARZON,
  LAMTEX_BRANCH_NCR,
  LAMTEX_BRANCH_QUEZON,
  LAMTEX_BRANCH_VISAYAS,
} from '../constants/lamtexBranches';

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
    name: LAMTEX_BRANCH_NCR,
    location: 'Valenzuela City, Metro Manila (NCR HQ & main warehouse)',
    warehouseManager: 'Ricardo Santos',
    logisticsManager: 'Ana Rivera'
  },
  {
    id: 'branch-ceb',
    name: LAMTEX_BRANCH_VISAYAS,
    location: 'Cebu City, Cebu (Visayas — regional hub & warehouse)',
    warehouseManager: 'Maria Dela Cruz',
    logisticsManager: 'Elena Cruz'
  },
  {
    id: 'branch-btg',
    name: LAMTEX_BRANCH_CALABARZON,
    location: 'Batangas City, Batangas (Calabarzon plant & export staging)',
    warehouseManager: 'Jose Reyes',
    logisticsManager: 'Sofia Reyes',
  },
  {
    id: 'branch-qzn',
    name: LAMTEX_BRANCH_QUEZON,
    location: 'Quezon Province / Lucena area (LAMTEX Quezon branch)',
    warehouseManager: 'Warren Castro',
    logisticsManager: 'Armand Vergara',
  },
];

export const getBranchById = (branchName: Branch): BranchData | undefined => {
  return BRANCHES.find(b => b.name === branchName);
};
