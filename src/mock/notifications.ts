import { Branch } from '../types';
import { NotificationItem, CalendarEvent } from '../types/executive';

// ============================================
// NOTIFICATIONS BY BRANCH
// ============================================

const NOTIFICATIONS_BRANCH_A: NotificationItem[] = [
  { id: 'notif-a-1', category: 'Approvals', message: 'ORD-2026-1045 requires urgent approval (12% discount, ₱450K).', time: '10 mins ago', read: false, urgent: true, actionUrl: '/orders', actionLabel: 'Review Order' },
  { id: 'notif-a-2', category: 'Inventory', message: 'PVC Resin SG-5 stock critically low (5 days remaining).', time: '1 hour ago', read: false, urgent: true, actionUrl: '/materials', actionLabel: 'Create Purchase Request' },
  { id: 'notif-a-3', category: 'Inventory', message: 'PVC Pipe 2" Class 150 stockout risk in 4 days.', time: '2 hours ago', read: false, urgent: true, actionUrl: '/products', actionLabel: 'Schedule Batch' },
  { id: 'notif-a-4', category: 'Payment', message: 'Metro Hardware Hub invoice INV-2026-089 is 5 days overdue (₱85K).', time: '3 hours ago', read: true, urgent: false, actionUrl: '/finance', actionLabel: 'View Invoice' },
  { id: 'notif-a-5', category: 'Delivery', message: 'Delivery to City Builders completed successfully.', time: '1 day ago', read: true, urgent: false },
  { id: 'notif-a-6', category: 'Approvals', message: 'ORD-2026-1052 approved successfully.', time: '1 day ago', read: true, urgent: false },
];

const NOTIFICATIONS_BRANCH_B: NotificationItem[] = [
  { id: 'notif-b-1', category: 'Delivery', message: 'Truck TRK-004 delayed by 2 hours due to traffic.', time: '30 mins ago', read: false, urgent: false, actionUrl: '/logistics', actionLabel: 'Track Delivery' },
  { id: 'notif-b-2', category: 'Approvals', message: 'ORD-2026-1048 requires approval (8% discount, ₱125K).', time: '2 hours ago', read: false, urgent: true, actionUrl: '/orders', actionLabel: 'Review Order' },
  { id: 'notif-b-3', category: 'Payment', message: 'BuildRight Supplies invoice INV-2026-102 is 12 days overdue (₱155K).', time: '4 hours ago', read: true, urgent: true, actionUrl: '/finance', actionLabel: 'View Invoice' },
  { id: 'notif-b-4', category: 'Inventory', message: 'PVC Pipe 4" Class 150 stockout risk in 5 days.', time: '6 hours ago', read: true, urgent: true, actionUrl: '/products', actionLabel: 'Schedule Batch' },
  { id: 'notif-b-5', category: 'Inventory', message: 'New batch of Solvent Cement 100ml completed QC.', time: '1 day ago', read: true, urgent: false },
];

const NOTIFICATIONS_BRANCH_C: NotificationItem[] = [
  { id: 'notif-c-1', category: 'Approvals', message: 'ORD-2026-1055 requires URGENT approval (15% discount, delivery TODAY).', time: '5 mins ago', read: false, urgent: true, actionUrl: '/orders', actionLabel: 'Review Order' },
  { id: 'notif-c-2', category: 'Payment', message: 'Payment received from Mindanao Builders Hub (₱350K).', time: '3 hours ago', read: false, urgent: false },
  { id: 'notif-c-3', category: 'Delivery', message: 'Delivery to Southern Construction Supply scheduled for March 4.', time: '1 day ago', read: true, urgent: false },
];

const NOTIFICATIONS_ALL: NotificationItem[] = [
  { id: 'notif-all-1', category: 'System', message: 'System maintenance scheduled for March 1, 2026, 2:00 AM - 4:00 AM.', time: '2 hours ago', read: false, urgent: false },
  ...NOTIFICATIONS_BRANCH_A,
  ...NOTIFICATIONS_BRANCH_B,
  ...NOTIFICATIONS_BRANCH_C,
];

export const getNotificationsByBranch = (branch: Branch): NotificationItem[] => {
  switch (branch) {
    case 'Branch A':
      return NOTIFICATIONS_BRANCH_A;
    case 'Branch B':
      return NOTIFICATIONS_BRANCH_B;
    case 'Branch C':
      return NOTIFICATIONS_BRANCH_C;
    case 'All':
    default:
      return NOTIFICATIONS_ALL;
  }
};

// ============================================
// CALENDAR EVENTS BY BRANCH
// ============================================

const CALENDAR_EVENTS_BRANCH_A: CalendarEvent[] = [
  { id: 'evt-a-1', title: 'Delivery: Mega Hardware', date: '2026-02-24', type: 'Outgoing', atRisk: false, details: 'ORD-2026-1040 - 2 Trucks', branch: 'Branch A' },
  { id: 'evt-a-2', title: 'Arrival: PVC Resin', date: '2026-02-25', type: 'Incoming', atRisk: false, details: 'PO-2026-055 - 10,000 kg', branch: 'Branch A' },
  { id: 'evt-a-3', title: 'Delivery: City Builders', date: '2026-02-25', type: 'Outgoing', atRisk: false, details: 'ORD-2026-1048 - 1 Truck', branch: 'Branch A' },
  { id: 'evt-a-4', title: 'Delivery: Hardware Store A', date: '2026-02-28', type: 'Outgoing', atRisk: false, details: 'ORD-2026-1055 - 1 Truck', branch: 'Branch A' },
  { id: 'evt-a-5', title: 'Delivery: Mega Hardware', date: '2026-03-01', type: 'Outgoing', atRisk: false, details: 'ORD-2026-1060 - 2 Trucks', branch: 'Branch A' },
  { id: 'evt-a-6', title: 'Transfer to Branch B', date: '2026-03-02', type: 'Transfer', atRisk: false, details: 'PVC Pipe 4" Class 150 - 500 pcs', branch: 'Branch A' },
  { id: 'evt-a-7', title: 'Delivery: City Builders', date: '2026-03-03', type: 'Outgoing', atRisk: false, details: 'ORD-2026-1065 - 1 Truck', branch: 'Branch A' },
];

const CALENDAR_EVENTS_BRANCH_B: CalendarEvent[] = [
  { id: 'evt-b-1', title: 'Delivery: BuildRight', date: '2026-02-24', type: 'Outgoing', atRisk: true, details: 'ORD-2026-1042 - Truck TRK-004 Delayed', branch: 'Branch B' },
  { id: 'evt-b-2', title: 'Arrival: Calcium Carbonate', date: '2026-02-26', type: 'Incoming', atRisk: false, details: 'PO-2026-058 - 5,000 kg', branch: 'Branch B' },
  { id: 'evt-b-3', title: 'Delivery: Northern Const.', date: '2026-02-27', type: 'Outgoing', atRisk: false, details: 'ORD-2026-1052 - 3 Trucks', branch: 'Branch B' },
  { id: 'evt-b-4', title: 'Arrival: Titanium Dioxide', date: '2026-02-28', type: 'Incoming', atRisk: false, details: 'PO-2026-060 - 1,000 kg', branch: 'Branch B' },
  { id: 'evt-b-5', title: 'Transfer from Branch A', date: '2026-03-02', type: 'Transfer', atRisk: false, details: 'PVC Pipe 4" Class 150 - 500 pcs', branch: 'Branch B' },
  { id: 'evt-b-6', title: 'Arrival: Packaging Materials', date: '2026-03-02', type: 'Incoming', atRisk: false, details: 'PO-2026-062 - 50 Rolls', branch: 'Branch B' },
];

const CALENDAR_EVENTS_BRANCH_C: CalendarEvent[] = [
  { id: 'evt-c-1', title: 'Delivery: Home Fix Depot', date: '2026-02-26', type: 'Outgoing', atRisk: true, details: 'ORD-2026-1050 - Pending Approval', branch: 'Branch C' },
  { id: 'evt-c-2', title: 'Delivery: Mindanao Builders', date: '2026-03-01', type: 'Outgoing', atRisk: false, details: 'ORD-2026-1067 - 1 Truck', branch: 'Branch C' },
  { id: 'evt-c-3', title: 'Delivery: Southern Construction', date: '2026-03-04', type: 'Outgoing', atRisk: false, details: 'ORD-2026-1076 - 1 Truck', branch: 'Branch C' },
];

const CALENDAR_EVENTS_ALL: CalendarEvent[] = [
  ...CALENDAR_EVENTS_BRANCH_A,
  ...CALENDAR_EVENTS_BRANCH_B,
  ...CALENDAR_EVENTS_BRANCH_C,
];

export const getCalendarEventsByBranch = (branch: Branch): CalendarEvent[] => {
  switch (branch) {
    case 'Branch A':
      return CALENDAR_EVENTS_BRANCH_A;
    case 'Branch B':
      return CALENDAR_EVENTS_BRANCH_B;
    case 'Branch C':
      return CALENDAR_EVENTS_BRANCH_C;
    case 'All':
    default:
      return CALENDAR_EVENTS_ALL;
  }
};
