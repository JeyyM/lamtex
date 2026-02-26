# Trip Scheduling Modal - Feature Documentation

## Overview
Added an interactive **Trip Scheduling Modal** to the Route Planning workflow. When creating a delivery trip, users must now select specific calendar date(s) for the trip, with visual warnings if there are scheduling conflicts with existing trips.

## Implementation

### Files Created

#### 1. `src/components/logistics/TripScheduleModal.tsx` (282 lines)
A comprehensive modal component for selecting trip dates with conflict detection.

**Component Props:**
```typescript
interface TripScheduleModalProps {
  isOpen: boolean;                    // Controls modal visibility
  onClose: () => void;                // Called when modal is closed
  onConfirm: (selectedDates: string[]) => void;  // Called with selected dates
  vehicleName: string;                // Display name of selected vehicle
  orderCount: number;                 // Number of orders in the trip
  existingBookings: Array<{           // Existing vehicle bookings
    date: string;
    type: 'Trip' | 'Maintenance';
    tripNumber?: string;
    status?: string;
  }>;
}
```

**Features:**

1. **Modal Structure**
   - Full-screen overlay with backdrop (black/50 opacity)
   - Centered modal with max width 4xl
   - Scrollable content area (max-h-[90vh])
   - Sticky header and footer

2. **Header Section**
   - Calendar icon with "Schedule Delivery Trip" title
   - Context info: Order count and vehicle name
   - Close button (X icon)

3. **Legend Bar**
   - Visual indicators for date types:
     * Blue (Selected) - Dates chosen for the new trip
     * Orange (Existing Trip) - Dates with scheduled trips
     * Red (Maintenance) - Dates with maintenance scheduled
     * White (Available) - Open dates
   - Selected date counter badge

4. **Conflict Warning**
   - Orange alert banner appears when selecting dates with existing trips
   - Warning message: "Schedule Conflict Detected"
   - Explanation of potential resource conflicts

5. **Interactive Calendar**
   - **Month Navigation**: Previous/Next month buttons
   - **Month/Year Header**: Current month display (e.g., "February 2026")
   - **Calendar Grid**: 7-column layout (Sun-Sat)
   - **Date Cells**: 90px min height for readability

6. **Date Cell States**
   - **Past Dates**: Gray background, cursor-not-allowed, unselectable
   - **Selected Dates**: Blue background, white text, checkmark icon, shadow
   - **Existing Trip**: Orange background with MapPin icon and trip number
   - **Maintenance**: Red background with Wrench icon
   - **Available**: White background, hover effects, clickable

7. **Date Selection Logic**
   - Click to toggle selection
   - Can select multiple dates
   - Past dates are disabled
   - Selected dates sorted chronologically
   - X button to remove individual selections

8. **Selected Dates Summary**
   - Blue banner showing all selected dates
   - Date format: "Feb 27, 2026"
   - Conflict indicator (AlertTriangle icon) for dates with existing trips
   - Remove button (X) for each date

9. **Footer Actions**
   - **Cancel Button**: Closes modal without saving
   - **Schedule Trip Button**: 
     * Shows count of selected days
     * Disabled if no dates selected
     * Confirms selection and closes modal
     * CheckCircle icon

### Files Modified

#### 2. `src/components/logistics/RoutePlanningView.tsx`
Updated the route planning component to integrate the scheduling modal.

**Changes:**
1. **New Imports**:
   ```typescript
   import { TripScheduleModal } from './TripScheduleModal';
   import { getCalendarBookings } from '@/src/mock/truckDetails';
   ```

2. **New State**:
   ```typescript
   const [showScheduleModal, setShowScheduleModal] = useState(false);
   ```

3. **Updated Button Action**:
   - "Create Delivery Trip" button now opens modal instead of immediately creating trip
   - Changed `onClick` from `onCreateTrip()` to `setShowScheduleModal(true)`

4. **Modal Integration**:
   ```typescript
   <TripScheduleModal
     isOpen={showScheduleModal}
     onClose={() => setShowScheduleModal(false)}
     onConfirm={(selectedDates) => {
       console.log('Trip scheduled for dates:', selectedDates);
       onCreateTrip(selectedOrders, selectedVehicle);
       setSelectedOrders([]);
       setSelectedVehicle('');
     }}
     vehicleName={vehicle?.vehicleName || 'Selected Vehicle'}
     orderCount={selectedOrders.length}
     existingBookings={selectedVehicle ? getCalendarBookings(selectedVehicle) : []}
   />
   ```

## User Flow

### Step-by-Step Process:

1. **User selects orders** in Route Planning tab
2. **User selects vehicle** from dropdown
3. **User reviews capacity** (weight/volume utilization)
4. **User clicks "Create Delivery Trip"**
5. **Modal opens** showing calendar with vehicle's existing bookings
6. **User views legend** to understand date color coding
7. **User clicks date(s)** to select when trip should occur
   - Can select single date (same-day delivery)
   - Can select multiple dates (multi-day trip)
   - Cannot select past dates
8. **If conflict exists**: Orange warning banner appears
9. **User reviews selected dates** in summary section
10. **User clicks "Schedule Trip"** to confirm
11. **Modal closes** and trip is created
12. **Form resets** (orders and vehicle cleared)

## Visual Design

### Color Scheme:
- **Blue (#3B82F6)**: Selected dates, primary actions
- **Orange (#F97316)**: Existing trips, warnings
- **Red (#EF4444)**: Maintenance, critical alerts
- **Green (#10B981)**: Success states (not used in dates)
- **Gray (#6B7280)**: Past dates, disabled states

### Typography:
- **Headers**: text-xl font-bold (modal title)
- **Body**: text-sm (most content)
- **Date Numbers**: text-sm font-bold
- **Labels**: text-sm font-medium

### Spacing:
- Modal padding: p-6
- Grid gap: gap-2
- Card spacing: space-y-6
- Button spacing: space-y-2

### Interactive Elements:
- **Hover**: Background color change, border color change
- **Active**: Shadow, scale (on click)
- **Disabled**: Opacity reduction, cursor-not-allowed
- **Focus**: Ring-2 outline

## Data Integration

### Existing Bookings:
Uses `getCalendarBookings(vehicleId)` from `truckDetails.ts`:
```typescript
{
  date: '2026-02-27',
  type: 'Trip',
  tripNumber: 'TRIP-2026-A-020',
  status: 'Planned',
}
```

### Mock Data Example:
```typescript
// TRK-001 (v1) bookings
{ date: '2026-02-26', type: 'Trip', tripNumber: 'TRIP-2026-A-001', status: 'In Transit' }
{ date: '2026-02-27', type: 'Trip', tripNumber: 'TRIP-2026-A-020', status: 'Planned' }
{ date: '2026-03-01', type: 'Trip', tripNumber: 'TRIP-2026-A-025', status: 'Planned' }
{ date: '2026-03-15', type: 'Maintenance', status: 'Scheduled' }
```

## Technical Details

### Calendar Generation Algorithm:
```typescript
const generateCalendar = () => {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const calendar: (Date | null)[] = [];
  
  // Add empty cells for alignment
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendar.push(null);
  }
  
  // Add actual dates
  for (let day = 1; day <= daysInMonth; day++) {
    calendar.push(new Date(year, month, day));
  }
  
  return calendar;
};
```

### Date Comparison Logic:
```typescript
const isDateSelected = (date: Date | null) => {
  if (!date) return false;
  const dateStr = date.toISOString().split('T')[0];  // "2026-02-27"
  return selectedDates.includes(dateStr);
};

const getBookingForDate = (date: Date | null) => {
  if (!date) return null;
  const dateStr = date.toISOString().split('T')[0];
  return existingBookings.find(b => b.date === dateStr);
};
```

### Conflict Detection:
```typescript
const hasConflicts = selectedDates.some(dateStr => {
  return existingBookings.some(b => 
    b.date === dateStr && b.type === 'Trip'
  );
});
```

## Benefits

### For Logistics Managers:
✅ **Visual Schedule Overview** - See all truck bookings at a glance
✅ **Conflict Prevention** - Warned before creating overlapping trips
✅ **Multi-Day Planning** - Can schedule trips spanning multiple days
✅ **Quick Availability Check** - Instantly see which dates are free

### For Business Operations:
💼 **Resource Optimization** - Prevent double-booking trucks
💼 **Better Planning** - Visual calendar aids in capacity planning
💼 **Reduced Errors** - Can't accidentally schedule on past dates
💼 **Maintenance Awareness** - See maintenance days alongside trips

## Future Enhancements

### Phase 1: Enhanced Validation
- [ ] Validate trip duration vs order count
- [ ] Suggest optimal dates based on order urgency
- [ ] Block dates too close to maintenance
- [ ] Show driver availability on calendar

### Phase 2: Smart Scheduling
- [ ] Auto-suggest best dates
- [ ] Drag-and-drop date selection
- [ ] Recurring trip patterns
- [ ] Time of day selection (AM/PM)

### Phase 3: Integration
- [ ] Save selected dates to trip record
- [ ] Update truck calendar after confirmation
- [ ] Send notifications for scheduled trips
- [ ] Calendar export (iCal, Google Calendar)

### Phase 4: Advanced Features
- [ ] Multi-vehicle scheduling view
- [ ] Swap/reschedule existing trips
- [ ] Bulk scheduling (multiple trips)
- [ ] Resource conflict resolution wizard

## Testing Checklist

### Functional Tests:
- [x] Modal opens when "Create Delivery Trip" clicked
- [x] Modal closes with X button
- [x] Modal closes with Cancel button
- [x] Past dates are not selectable
- [x] Single date selection works
- [x] Multiple date selection works
- [x] Date deselection works (click again)
- [x] Remove date from summary works
- [x] Conflict warning appears correctly
- [x] Schedule button disabled when no dates selected
- [x] Month navigation works (previous/next)
- [x] Existing bookings display correctly

### Visual Tests:
- [x] Modal backdrop has 50% opacity
- [x] Calendar grid aligned properly (7 columns)
- [x] Date colors correct (blue/orange/red/white)
- [x] Selected dates have checkmark icon
- [x] Trip numbers display in orange cells
- [x] Maintenance icon shows in red cells
- [x] Legend matches actual date colors
- [x] Responsive layout on mobile

### Edge Cases:
- [ ] No vehicle selected (empty bookings array)
- [ ] All dates in month are booked
- [ ] Selecting 10+ dates
- [ ] Navigating to past months
- [ ] Selecting dates across multiple months
- [ ] Rapid clicking on dates

## Summary

This feature adds a **professional scheduling interface** to the route planning workflow, ensuring that logistics managers:
1. **Select specific dates** for each delivery trip
2. **See existing bookings** on the vehicle calendar
3. **Get warnings** about scheduling conflicts
4. **Make informed decisions** about trip timing

The modal uses the **same calendar style** as the Truck Detail page's Schedule tab, providing **visual consistency** across the application.

**Status**: ✅ **Complete and Functional**
**Lines Added**: 282 (TripScheduleModal) + 5 (RoutePlanningView updates)
**Dependencies**: truckDetails.ts mock data (existing)
**User Impact**: Better scheduling visibility and conflict prevention
