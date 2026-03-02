# Orders & Loading Tab - Feature Specification

## Overview
The **Orders & Loading** tab is where warehouse staff manage the loading of approved orders onto delivery trucks. This is the critical transition point between warehouse inventory and logistics delivery.

---

## Core Purpose
**"What orders need to be loaded onto which trucks, and when are they ready to depart?"**

Warehouse staff need to:
1. See which orders are approved and ready for loading
2. Select available trucks for loading
3. Verify truck capacity vs order requirements
4. Load items and deduct from inventory
5. Mark trucks as "Loaded" and ready for dispatch
6. Track loading status in real-time

---

## Critical Information Needed When Loading

### 📦 **ORDER INFORMATION**
| Field | Why It Matters |
|-------|----------------|
| **Order Number** | Unique identifier for tracking |
| **Customer Name** | Who is receiving the order |
| **Destination** | Where the truck needs to go (for route planning) |
| **Required Date** | Delivery deadline (urgency) |
| **Items & Quantities** | What products to load (with SKUs) |
| **Total Weight (kg)** | Critical for truck capacity validation |
| **Total Volume (m³)** | Critical for truck space validation |
| **Urgency** | High/Medium/Low - prioritize loading |
| **Special Instructions** | Fragile items, stacking rules, etc. |

### 🚛 **TRUCK INFORMATION**
| Field | Why It Matters |
|-------|----------------|
| **Vehicle ID/Name** | Which truck (e.g., "Truck 001") |
| **Plate Number** | Physical identification |
| **Current Status** | Available, Loading, On Trip, Maintenance |
| **Max Weight Capacity** | Don't exceed weight limit |
| **Max Volume Capacity** | Don't exceed space limit |
| **Current Load Weight** | How much is already loaded |
| **Current Load Volume** | How much space is used |
| **Capacity % Used** | Visual indicator (progress bar) |
| **Driver Name** | Who will drive this trip |
| **Scheduled Departure** | When truck needs to leave |

### 🔗 **LOADING RELATIONSHIP**
| Field | Why It Matters |
|-------|----------------|
| **Trip Number** | Links orders to a specific delivery trip |
| **Orders Assigned** | How many orders on this truck |
| **Destinations** | All stops on this route |
| **ETA** | Expected arrival time |
| **Loading Status** | Not Started, In Progress, Completed |

---

## Key Features Required

### **1. Orders Ready for Loading Section**
**Display all approved orders that haven't been loaded yet**

**Features:**
- ✅ List view with key details (order #, customer, destination, weight, volume, urgency)
- ✅ Search/filter by order number, customer, destination, urgency
- ✅ Sort by required date, urgency, weight, volume
- ✅ Color-coded urgency badges (red=high, yellow=medium, gray=low)
- ✅ Status badges: "Approved", "Ready to Load", "Assigned to Trip"
- ✅ Multi-select orders (checkboxes) to batch assign to truck
- ✅ Quick view of order items (expandable row)

**Information to Display:**
```
Order #  | Customer         | Destination    | Required Date | Weight | Volume | Urgency | Status        | Actions
ORD-1234 | BuildRight Corp  | Quezon City    | Feb 28, 2026  | 850 kg | 4.2 m³ | High    | Ready to Load | [Assign]
ORD-1235 | MegaConstruct    | Makati City    | Feb 29, 2026  | 1200kg | 6.8 m³ | Medium  | Ready to Load | [Assign]
```

---

### **2. Available Trucks Section**
**Display trucks that can be loaded**

**Features:**
- ✅ Card/grid view of available trucks
- ✅ Real-time capacity indicators (weight & volume bars)
- ✅ Status badges: Available (green), Loading (yellow), On Trip (blue), Maintenance (red)
- ✅ Show driver assignment
- ✅ Show scheduled departure time
- ✅ Filter by status, branch
- ✅ Click truck to open loading interface

**Information to Display:**
```
┌─────────────────────────────────────┐
│ 🚛 Truck 001 (ABC-1234)             │
│ Driver: Juan Santos                 │
│ Status: Available                   │
│                                     │
│ Weight:  [████████░░░░] 3,200/5,000 kg (64%)
│ Volume:  [█████████░░░] 18.5/25.0 m³ (74%)
│                                     │
│ Orders Loaded: 2                    │
│ Departure: 2:00 PM Today            │
│                                     │
│ [View Details] [Start Loading]      │
└─────────────────────────────────────┘
```

---

### **3. Loading Interface (Modal or Side Panel)**
**Where staff actually load orders onto a truck**

**Features:**
- ✅ Two-column layout:
  - **LEFT**: Available orders to add (searchable, filterable)
  - **RIGHT**: Currently loaded orders (can remove)
- ✅ Drag-and-drop orders OR click "Add to Truck" button
- ✅ Real-time capacity calculation as orders are added
- ✅ Warning alerts when nearing capacity (80%+)
- ✅ Error alerts when exceeding capacity (can't add)
- ✅ Show total weight/volume at bottom
- ✅ Order details expandable (see items being loaded)
- ✅ Notes field for loading instructions
- ✅ "Confirm Loading" button to finalize

**Critical Validation:**
```javascript
if (currentWeight + orderWeight > truckMaxWeight) {
  alert("❌ EXCEEDED WEIGHT CAPACITY! Cannot add this order.");
  return false;
}

if (currentVolume + orderVolume > truckMaxVolume) {
  alert("❌ EXCEEDED VOLUME CAPACITY! Cannot add this order.");
  return false;
}

if (capacityUsed > 80%) {
  warning("⚠️ Truck is 80%+ full. Consider another truck or optimize loading.");
}
```

---

### **4. Loading Status Tracking**
**Visual indicators of loading progress**

**Features:**
- ✅ Status flow: `Ready to Load` → `Assigned` → `Loading in Progress` → `Loaded & Ready`
- ✅ Progress bar per truck showing loading completion
- ✅ Time tracking (started loading at X, estimated completion)
- ✅ Staff assignment (who is loading this truck)
- ✅ Checklist per order (items verified)

**States:**
```
1. READY TO LOAD
   - Order is approved
   - Not yet assigned to any truck
   - Shows in "Orders Ready" list

2. ASSIGNED TO TRIP
   - Order assigned to a truck/trip
   - Truck status changes to "Loading"
   - But loading hasn't started

3. LOADING IN PROGRESS
   - Warehouse staff actively loading items
   - Can scan items or manually check off
   - Real-time capacity updates

4. LOADED & READY
   - All items loaded and verified
   - Truck marked as "Ready to Depart"
   - Inventory deducted
   - Trip status changes to "Pending Departure"
```

---

### **5. Inventory Deduction Logic**
**Critical: When loading is confirmed, stock MUST be deducted**

**When to Deduct:**
- ⏰ Option A: Deduct when "Confirm Loading" button clicked
- ⏰ Option B: Deduct when truck status changes to "Loaded & Ready"
- ⏰ Recommended: **Deduct when loading is completed and verified**

**What Happens:**
```typescript
onConfirmLoading(truckId: string, orders: Order[]) => {
  // 1. For each order in the truck
  orders.forEach(order => {
    // 2. For each item in the order
    order.items.forEach(item => {
      // 3. Deduct from finished goods inventory
      deductInventory(item.sku, item.quantity);
      
      // 4. Update order status
      updateOrderStatus(order.id, 'Loaded');
      
      // 5. Create inventory movement log
      logInventoryMovement({
        type: 'outbound',
        reason: 'loaded_for_delivery',
        orderId: order.id,
        tripId: truck.currentTrip,
        items: order.items,
        timestamp: now()
      });
    });
  });
  
  // 6. Update truck status
  updateTruckStatus(truckId, 'Ready to Depart');
  
  // 7. Update trip status
  updateTripStatus(truck.currentTrip, 'Pending Departure');
  
  // 8. Notify logistics team
  notifyLogistics(truck.currentTrip, 'Truck loaded and ready');
}
```

---

### **6. Signal When Loaded (Ready to Depart)**
**How to communicate truck is ready for dispatch**

**Features:**
- ✅ **"Mark as Loaded & Ready" button** - Big, prominent action
- ✅ **Status badge changes** - "Loading" → "Ready to Depart"
- ✅ **Visual indicator** - Green checkmark, truck icon changes
- ✅ **Notification sent** - Alert to logistics manager/driver
- ✅ **Timestamp recorded** - When loading completed
- ✅ **Trip status updates** - Trip changes from "Loading" to "Pending" or "Scheduled"
- ✅ **Print loading manifest** - PDF with all loaded orders

**Flow:**
```
1. Warehouse staff clicks "Confirm Loading" ✅
2. System validates all items checked
3. Inventory deducted automatically
4. Truck status → "Ready to Depart" 🚛
5. Trip status → "Scheduled" 📅
6. Driver receives notification 📱
7. Logistics dashboard updated 📊
8. Loading manifest generated 📄
```

---

## UI Layout Recommendation

### **Main View (Split Screen)**

```
┌────────────────────────────────────────────────────────────────────┐
│ 📦 Orders & Loading                                  [Filter] [🔍] │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│ ┌─ ORDERS READY FOR LOADING ─────────────────────────────────┐   │
│ │                                                              │   │
│ │ Total: 12 orders | High Priority: 4 | Total Weight: 18,500kg│   │
│ │                                                              │   │
│ │ [Table with orders]                                          │   │
│ │ Order #     Customer         Destination    Weight  Volume   │   │
│ │ ORD-1234   BuildRight Corp   Quezon City    850kg   4.2m³   │   │
│ │ ORD-1235   MegaConstruct     Makati City    1200kg  6.8m³   │   │
│ │ ...                                                          │   │
│ └──────────────────────────────────────────────────────────────┘   │
│                                                                    │
│ ┌─ AVAILABLE TRUCKS ──────────────────────────────────────────┐   │
│ │                                                              │   │
│ │ [Truck Card 001]  [Truck Card 002]  [Truck Card 003]        │   │
│ │                                                              │   │
│ └──────────────────────────────────────────────────────────────┘   │
│                                                                    │
│ ┌─ CURRENTLY LOADING ─────────────────────────────────────────┐   │
│ │                                                              │   │
│ │ Truck 001 - Loading (2 orders) [████████░░] 80%             │   │
│ │ Truck 005 - Loading (1 order)  [████░░░░░░] 40%             │   │
│ │                                                              │   │
│ └──────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────┘
```

---

## Data Integration Points

### **From Orders System:**
- Order status (must be "Approved" or "Ready to Ship")
- Order items and quantities
- Customer and destination
- Required delivery date
- Special instructions

### **From Logistics System:**
- Available trucks
- Truck capacity (weight/volume)
- Driver assignments
- Trip schedules
- Current trip status

### **To Inventory System:**
- Deduct finished goods stock
- Create outbound movement log
- Update stock status (reserved → shipped)

### **To Logistics System:**
- Update truck status (Loading → Ready)
- Update trip status (Planned → Scheduled)
- Notify driver that truck is ready

---

## Mock Data Needs

### **Orders Ready for Loading:**
```typescript
interface OrderForLoading {
  id: string;
  orderNumber: string;
  customer: string;
  destination: string;
  requiredDate: string;
  items: OrderLineItem[];
  totalWeight: number;  // kg
  totalVolume: number;  // m³
  urgency: 'High' | 'Medium' | 'Low';
  status: 'Approved' | 'Ready to Load' | 'Assigned' | 'Loading' | 'Loaded';
  tripId?: string;  // If assigned to a trip
  specialInstructions?: string;
  branch: string;
}
```

### **Loading Actions:**
```typescript
interface LoadingAction {
  assignOrdersToTruck(orderIds: string[], truckId: string): void;
  removeOrderFromTruck(orderId: string, truckId: string): void;
  confirmLoading(truckId: string): void;
  markAsReadyToDepart(truckId: string): void;
}
```

---

## User Stories

### **Story 1: Warehouse staff loading a truck**
```
As a warehouse staff member,
I want to see which orders are ready to load,
So I can efficiently load them onto available trucks.

Acceptance Criteria:
✅ I can see all approved orders in one list
✅ I can filter by urgency or destination
✅ I can select a truck and see its capacity
✅ I can add orders to the truck
✅ System warns me if I exceed capacity
✅ I can confirm when loading is complete
```

### **Story 2: Capacity validation**
```
As a warehouse staff member,
I want the system to prevent overloading,
So trucks don't exceed weight/volume limits.

Acceptance Criteria:
✅ System shows real-time capacity as I add orders
✅ System blocks adding orders that exceed limits
✅ System shows warnings at 80% capacity
✅ I can see total weight and volume clearly
```

### **Story 3: Signaling ready to depart**
```
As a warehouse staff member,
I want to signal when a truck is loaded and ready,
So logistics can dispatch it for delivery.

Acceptance Criteria:
✅ I can mark truck as "Loaded & Ready"
✅ Inventory is deducted automatically
✅ Truck status updates to "Ready to Depart"
✅ Driver is notified
✅ Logistics dashboard updates
```

---

## Technical Considerations

### **State Management:**
- Track which orders are assigned to which trucks
- Real-time capacity calculations
- Loading progress tracking
- Prevent double-loading same order

### **Validation Rules:**
1. Only "Approved" orders can be loaded
2. Cannot exceed truck weight capacity
3. Cannot exceed truck volume capacity
4. Cannot assign same order to multiple trucks
5. Must have driver assigned before marking ready
6. Must verify all items loaded before confirming

### **Error Handling:**
- Network failures during loading
- Inventory stock discrepancies
- Truck becomes unavailable mid-loading
- Order gets cancelled during loading

---

## Success Metrics
- ⏱️ **Loading Time**: How long to load a truck
- 📊 **Capacity Utilization**: Average % of truck capacity used
- ❌ **Loading Errors**: Overloading attempts blocked
- ✅ **On-Time Departures**: Trucks leaving on schedule
- 🔄 **Inventory Accuracy**: Correct stock deductions

---

## Next Steps After This Tab

**Phase 4: Schedule Tab**
- Calendar view of all deliveries
- When trucks depart and return
- Driver schedules

**Phase 5: Movements & History Tab**
- All inventory movements (in/out)
- Audit trail for loaded shipments
- Historical loading data

---

## Summary: What Makes This Tab Critical

**This tab is the handoff point between two major systems:**
1. **Warehouse Inventory** (what we have in stock)
2. **Logistics Delivery** (what goes on trucks)

**If done wrong:**
- ❌ Trucks overloaded (dangerous, illegal)
- ❌ Wrong items shipped
- ❌ Inventory not deducted (inaccurate stock counts)
- ❌ Delays in dispatch
- ❌ Customer orders not fulfilled

**If done right:**
- ✅ Efficient loading process
- ✅ Accurate inventory tracking
- ✅ On-time departures
- ✅ Safe truck loads
- ✅ Happy customers
