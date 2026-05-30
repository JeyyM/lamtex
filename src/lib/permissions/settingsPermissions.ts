/** Settings module permission catalog + resolver hook. */

import { useMemo } from 'react';
import { useAppContext } from '@/src/store/AppContext';

export type SettingsPermissionKey =
  | 'companyInfo'
  | 'addresses'
  | 'paymentProfiles'
  | 'socialMedia'
  | 'notifications';

export interface SettingsPermissionDef {
  key: SettingsPermissionKey;
  label: string;
  description: string;
}

export const SETTINGS_PERMISSIONS: readonly SettingsPermissionDef[] = [
  {
    key: 'companyInfo',
    label: 'Company Info',
    description: 'View and edit company profile details for the selected branch.',
  },
  {
    key: 'addresses',
    label: 'Addresses',
    description: 'Manage company locations and map pins across branches.',
  },
  {
    key: 'paymentProfiles',
    label: 'Payment Profiles',
    description: 'Open the Payment Profiles tab (work in progress).',
  },
  {
    key: 'socialMedia',
    label: 'Social Media',
    description: 'Manage social media links for the selected branch.',
  },
  {
    key: 'notifications',
    label: 'Notifications',
    description: 'Configure notification preferences.',
  },
] as const;

export type SettingsPermissionSet = Record<SettingsPermissionKey, boolean>;

export const ALL_SETTINGS_PERMISSIONS_GRANTED: SettingsPermissionSet = SETTINGS_PERMISSIONS.reduce(
  (acc, def) => {
    acc[def.key] = true;
    return acc;
  },
  {} as SettingsPermissionSet,
);

export type SettingsTabId = 'company' | 'addresses' | 'payment' | 'social' | 'notifications';

export const SETTINGS_TAB_PERMISSION_KEY: Record<SettingsTabId, SettingsPermissionKey> = {
  company: 'companyInfo',
  addresses: 'addresses',
  payment: 'paymentProfiles',
  social: 'socialMedia',
  notifications: 'notifications',
};

export function settingsTabAllowed(perms: SettingsPermissionSet, tabId: SettingsTabId): boolean {
  return perms[SETTINGS_TAB_PERMISSION_KEY[tabId]];
}

export function hasAnySettingsTabAccess(perms: SettingsPermissionSet): boolean {
  return SETTINGS_PERMISSIONS.some((def) => perms[def.key]);
}

export function useSettingsPermissions(): SettingsPermissionSet {
  const { isExecutiveUser, settingsPermissions } = useAppContext();
  return useMemo<SettingsPermissionSet>(() => {
    if (isExecutiveUser) return { ...ALL_SETTINGS_PERMISSIONS_GRANTED };
    if (settingsPermissions) return settingsPermissions;
    return { ...ALL_SETTINGS_PERMISSIONS_GRANTED };
  }, [isExecutiveUser, settingsPermissions]);
}
