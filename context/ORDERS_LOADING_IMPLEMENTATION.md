# Orders & Loading Tab - Implementation Documentation

## Overview
The **Orders & Loading** tab provides a comprehensive interface for warehouse staff to manage order loading onto delivery trucks, with real-time stock visibility and shortage alerts.

## Location
**File**: `src/pages/WarehousePage.tsx` (Orders tab section)

---

## Key Features Implemented

### 1. **Dashboard Statistics** (4 KPI Cards)
Provides quick overview of loading operations:
- ✅ **Ready to Load**: 8 orders approved and waiting
- ✅ **Currently Loading**: 2 trucks in loading process
- ✅ **Ready to Depart**: 1 truck loaded and verified
- ✅ **Stock Issues**: 3 orders with inventory shortages

### 2. **Report Problem Button**
- 🔴 **Red button** with AlertTriangle icon
- Located in Orders section header
- Allows warehouse staff to quickly escalate issues
- Visible at all times for easy access

---

## Orders Ready for Loading Table

### Columns:
1. **Checkbox** - Multi-select for batch operations
2. **Order** - Order number + approval status
3. **Customer** - Customer name
4. **Destination** - Delivery location with icon
5. **Items** - Link to view items + shortage warnings
6. **Stock Status** - Critical feature with detailed info
7. **Weight/Volume** - Total capacity required
8. **Required** - Delivery deadline
9. **Urgency** - Priority badge (High/Medium/Low)
10. **Actions** - Assign to truck or status indicator

---

## Stock Status Feature (Core Innovation)

### Status Types & Visual Indicators:

#### **1. All Available** ✅
- **Icon**: Green CheckCircle
- **Text**: "All Available" (green)
- **Background**: White (normal row)
- **Action**: "Assign to Truck" button enabled
- **Example**: Order ORD-2026-1234

#### **2. Stock Shortage** ❌
- **Icon**: Red AlertTriangle
- **Background**: Red-50 (light red highlight)
- **Details Shown**:
  - "Short 150 units" (red text)
  - Product name: "PVC Pipe 4""
  - Current stock: "Stock: 50/200"
  - **Next Batch Schedule**: "✓ Next batch: Mar 2 (500 units)" (green)
- **Action**: "Stock Issue" button (disabled, grayed out)
- **Example**: Order ORD-2026-1235

**Multiple Items with Issues:**
```
⚠️ Short 150 units
   PVC Pipe 4" (Stock: 50/200)
   ✓ Next batch: Mar 2 (500 units)

⚠️ Low Stock
   PVC Elbow 2" (Stock: 80/100)
   ✓ Next batch: Mar 1 (300 units)
```

#### **3. Partial Stock Available** ⚠️
- **Icon**: Yellow AlertTriangle
- **Background**: Yellow-50 (light yellow highlight)
- **Details Shown**:
  - "Partial Available" (yellow text)
  - Product name: "PVC Valve 3""
  - Current stock: "Stock: 25/50"
  - **Next Batch Schedule**: "✓ Next batch: Feb 29 (100 units)" (green)
- **Action**: "Partial Load" button (yellow, enabled)
- **Example**: Order ORD-2026-1237
- **Use Case**: Can partially fulfill order now, complete when stock arrives

---

## Next Batch Schedule Format

### Display Pattern:
```
✓ Next batch: [DATE] ([QUANTITY] units)
```

### Examples:
- `✓ Next batch: Mar 2 (500 units)` - Production batch scheduled
- `✓ Next batch: Mar 1 (300 units)` - Incoming material
- `✓ Next batch: Feb 29 (100 units)` - Same-week arrival

### Visual Styling:
- **Color**: Green-600 (positive indicator)
- **Font**: Medium weight for emphasis
- **Icon**: ✓ checkmark for confirmation
- **Purpose**: Reassures staff that stock is coming

---

## Available Trucks Section

### Truck Card Components:

#### **Truck 002 - Available** (0% loaded)
```
┌─────────────────────────────┐
│ 🚛 Truck 002                │ [Available - Green Badge]
│ ABC-5678                    │
│                             │
│ 🕐 Driver: Carlos Garcia    │
│ Next departure: 2:00 PM     │
│                             │
│ Weight:  [░░░░░░░░░░░░] 0/5,000 kg (0%)
│ Volume:  [░░░░░░░░░░░░] 0/25 m³ (0%)
│                             │
│ Orders: 0 • Ready for loading
│                             │
│ [Start Loading] (Blue)      │
└─────────────────────────────┘
```

#### **Truck 003 - Loading** (64% loaded)
```
┌─────────────────────────────┐
│ 🚛 Truck 003                │ [Loading - Yellow Badge]
│ DEF-9012                    │
│                             │
│ 🕐 Driver: Pedro Cruz       │
│ Departure: 1:00 PM          │
│                             │
│ Weight:  [████████░░░░] 3,200/5,000 kg (64%)
│ Volume:  [████████░░░░] 15.8/25 m³ (63%)
│                             │
│ Orders: 2 • Loading in progress
│                             │
│ [Continue Loading] (Yellow) │
└─────────────────────────────┘
```

#### **Truck 001 - Ready to Depart** (85% loaded)
```
┌─────────────────────────────┐
│ 🚛 Truck 001                │ [✓ Ready - Green Badge]
│ ABC-1234                    │
│                             │
│ 🕐 Driver: Juan Santos      │
│ ✓ Loaded & verified         │
│                             │
│ Weight:  [████████████░] 4,250/5,000 kg (85%)
│ Volume:  [████████████░] 21.3/25 m³ (85%)
│                             │
│ Orders: 3 • Ready for dispatch
│                             │
│ [Confirm Departure] (Green) │
└─────────────────────────────┘
```

---

## Color Coding System

### Row Background Colors:
- **White** - All stock available, ready to load
- **Red-50** - Critical shortage, cannot load
- **Yellow-50** - Partial stock, can load partially

### Badge Colors:
**Urgency:**
- 🔴 **Red** - High priority (red-100 bg, red-800 text)
- 🟡 **Yellow** - Medium priority (yellow-100 bg, yellow-800 text)
- ⚪ **Gray** - Low priority (gray-100 bg, gray-800 text)

**Truck Status:**
- 🟢 **Green** - Available / Ready to Depart
- 🟡 **Yellow** - Loading in progress
- 🔵 **Blue** - On Trip (not shown here)
- 🔴 **Red** - Maintenance / Issue

**Stock Status:**
- 🟢 **Green** - All available (with CheckCircle icon)
- 🔴 **Red** - Shortage (with AlertTriangle icon)
- 🟡 **Yellow** - Partial/Low stock (with AlertTriangle icon)

---

## Interactive Elements

### Buttons:

1. **Report Problem** (Header)
   - Red background
   - White text
   - AlertTriangle icon
   - Hover: Darker red

2. **Assign to Truck** (Order action)
   - Blue text
   - Enabled when stock available
   - Hover: Darker blue

3. **Stock Issue** (Order action)
   - Gray text
   - Disabled state
   - Cursor: not-allowed
   - Shown when stock shortage

4. **Partial Load** (Order action)
   - Yellow text
   - Enabled for partial stock
   - Hover: Darker yellow

5. **Start Loading** (Truck card)
   - Blue background
   - White text
   - Full width
   - Hover: Darker blue

6. **Continue Loading** (Truck card)
   - Yellow background
   - White text
   - Full width
   - Hover: Darker yellow

7. **Confirm Departure** (Truck card)
   - Green background
   - White text
   - Full width
   - Hover: Darker green

### Clickable Elements:
- ✅ Order checkboxes for multi-select
- ✅ "View X items" links (blue underlined)
- ✅ Entire truck card (hover effect with border change)

---

## Stock Shortage Details

### Information Displayed:

**For Each Item with Stock Issue:**
```
[Icon] [Status Text]
       [Product Name] (Stock: [Current]/[Required])
       ✓ Next batch: [Date] ([Quantity] units)
```

**Example - Multiple Items:**
```
⚠️ Short 150 units
   PVC Pipe 4" (Stock: 50/200)
   ✓ Next batch: Mar 2 (500 units)

⚠️ Low Stock  
   PVC Elbow 2" (Stock: 80/100)
   ✓ Next batch: Mar 1 (300 units)
```

### Severity Levels:

1. **Shortage** (Red)
   - Current stock < Required
   - Cannot fulfill order
   - Must wait for next batch

2. **Low Stock** (Yellow)
   - Current stock ≈ Required (within 20%)
   - Can fulfill but leaves warehouse low
   - Warning to plan ahead

---

## Capacity Bars (Truck Cards)

### Weight Bar:
- **Color**: Blue-500
- **Background**: Gray-200
- **Height**: 2 (h-2)
- **Rounded**: Full rounded corners
- **Dynamic Width**: Based on percentage loaded

### Volume Bar:
- **Color**: Purple-500
- **Background**: Gray-200
- **Height**: 2 (h-2)
- **Rounded**: Full rounded corners
- **Dynamic Width**: Based on percentage loaded

### Capacity Warnings:
- **0-79%**: Normal (blue/purple)
- **80-99%**: Warning (could add yellow)
- **100%+**: Error (would show red if exceeded)

---

## Data Structure

### Mock Order Data:
```typescript
interface OrderForLoading {
  orderNumber: string;
  customer: string;
  destination: string;
  items: Array<{
    name: string;
    quantity: number;
    currentStock: number;
    nextBatch?: {
      date: string;
      quantity: number;
    }
  }>;
  totalWeight: number; // kg
  totalVolume: number; // m³
  requiredDate: string;
  urgency: 'High' | 'Medium' | 'Low';
  stockStatus: 'available' | 'shortage' | 'partial';
}
```

### Mock Truck Data:
```typescript
interface TruckForLoading {
  id: string;
  name: string;
  plateNumber: string;
  driver: string;
  status: 'Available' | 'Loading' | 'Ready';
  currentWeight: number; // kg
  maxWeight: number; // kg
  currentVolume: number; // m³
  maxVolume: number; // m³
  ordersLoaded: number;
  departureTime?: string;
}
```

---

## User Workflows

### Workflow 1: Loading Order with Available Stock
1. Staff views "Orders Ready for Loading" table
2. Sees **green checkmark** "All Available" status
3. Clicks "Assign to Truck" button
4. Selects available truck (Truck 002)
5. Order assigned, truck status → "Loading"
6. Staff physically loads items
7. Confirms loading completion
8. Inventory automatically deducted
9. Truck status → "Ready to Depart"

### Workflow 2: Handling Stock Shortage
1. Staff sees **red highlighted row** (Order ORD-2026-1235)
2. Reviews stock shortage details:
   - "Short 150 units - PVC Pipe 4" (Stock: 50/200)"
3. Sees **next batch schedule**: "✓ Next batch: Mar 2 (500 units)"
4. Decides to:
   - **Option A**: Wait for March 2 batch
   - **Option B**: Click "Report Problem" to escalate
   - **Option C**: Contact customer about delay
5. Order remains unassigned until stock available

### Workflow 3: Partial Loading
1. Staff sees **yellow highlighted row** (Order ORD-2026-1237)
2. Reviews partial stock: "PVC Valve 3" (Stock: 25/50)"
3. Sees next batch: "✓ Next batch: Feb 29 (100 units)"
4. Clicks "Partial Load" button
5. Loads available 25 units now
6. Plans second delivery after Feb 29 batch arrives
7. Customer notified of split delivery

### Workflow 4: Confirming Truck Departure
1. Staff completes loading Truck 001
2. Truck card shows 85% capacity used
3. Status badge → "✓ Ready"
4. Green highlight on truck card
5. Clicks "Confirm Departure" button
6. System:
   - Updates trip status → "Scheduled"
   - Notifies driver (Juan Santos)
   - Generates loading manifest
   - Logs departure time
7. Truck moves to logistics dispatch queue

---

## Integration Points

### With Inventory System:
- Real-time stock checks for each order item
- Display current stock vs required quantity
- Show next production batch schedules
- Deduct inventory when loading confirmed

### With Orders System:
- Fetch approved orders ready for loading
- Update order status (Approved → Assigned → Loading → Loaded)
- Track which orders assigned to which trucks
- Handle partial order fulfillment

### With Logistics System:
- Display available trucks with capacity
- Update truck status (Available → Loading → Ready)
- Sync with trip schedules
- Notify drivers when trucks ready

### With Production System:
- Display scheduled production batches
- Show estimated completion dates
- Link stock shortages to upcoming batches
- Coordinate urgent production requests

---

## Future Enhancements

### Phase 1:
- [ ] **Loading Modal**: Detailed interface for adding/removing orders from truck
- [ ] **Item Scanning**: Barcode scanner integration for verification
- [ ] **Capacity Calculator**: Real-time calculation as orders added
- [ ] **Conflict Detection**: Warn about route conflicts or time overlaps

### Phase 2:
- [ ] **Photo Documentation**: Capture loading photos for proof
- [ ] **Weight Verification**: Integration with truck scales
- [ ] **Driver Assignment**: Reassign drivers to different trucks
- [ ] **Loading History**: Track who loaded what and when

### Phase 3:
- [ ] **Smart Routing**: Suggest optimal truck-order combinations
- [ ] **Batch Operations**: Assign multiple orders at once
- [ ] **Export Manifest**: Generate loading manifest PDFs
- [ ] **Mobile View**: Tablet-friendly interface for warehouse floor

---

## Business Impact

### Benefits:
✅ **Prevents Overloading**: Real-time capacity validation
✅ **Reduces Delays**: Staff see stock issues immediately
✅ **Better Planning**: Next batch schedules help coordinate timing
✅ **Faster Escalation**: "Report Problem" button for quick issues
✅ **Inventory Accuracy**: Automatic stock deduction on loading
✅ **Clear Status**: Color coding makes status obvious at a glance

### Metrics to Track:
- Average loading time per truck
- Frequency of stock shortages blocking orders
- Percentage of partial loads vs full loads
- On-time departure rate
- Problem reports filed per day

---

## Technical Notes

### Responsive Design:
- Table uses horizontal scroll if needed
- Truck cards use 3-column grid (adjusts to 2 or 1 on smaller screens)
- Compact spacing (px-3 py-3) for better fit

### Performance Considerations:
- Real-time stock checks may need caching
- Large order lists should implement pagination
- Consider virtualization for 100+ orders

### Accessibility:
- Color not the only indicator (icons + text)
- Checkboxes properly labeled
- Buttons have clear text labels
- Hover states for interactive elements

---

## Summary

This Orders & Loading tab implementation provides:
1. ✅ **Visibility** - See all orders and their stock status at a glance
2. ✅ **Next Batch Info** - Know when stock shortages will be resolved
3. ✅ **Problem Reporting** - Quick escalation button for issues
4. ✅ **Capacity Management** - Real-time truck capacity tracking
5. ✅ **Status Workflow** - Clear progression from ready → loading → departure

The hardcoded "next batch" schedules demonstrate how the system will integrate with production scheduling in the future, giving warehouse staff confidence that stock issues are temporary and planned.
