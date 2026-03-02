# Schedule Calendar Integration Plan

## Overview
Merge the Schedule tab into the Requests tab by adding a calendar widget that visualizes upcoming events.

## Calendar Widget Features

### Event Types
1. **Production Batches** (Green)
   - Scheduled production start dates
   - Estimated completion dates
   - Batch numbers and product names
   
2. **Material Arrivals** (Blue)
   - Expected delivery dates from suppliers
   - Material name and quantity
   - Supplier information

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│  Requests Tab                                                │
├─────────────────────────────────────────────────────────────┤
│  [Production] [Purchase]            [New Request]            │
│                                                               │
│  📅 Schedule Calendar (14 Days)                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ [Day Grid with Events]                                │  │
│  │ • Green dots = Production batches                      │  │
│  │ • Blue dots = Material arrivals                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
│  [Summary Stats]                                             │
│  [Requests Table]                                            │
└─────────────────────────────────────────────────────────────┘
```

### User Experience
1. Calendar shows next 14 days (2 weeks ahead)
2. Today is highlighted with red border
3. Click event to see details in modal
4. Color coding matches event type
5. Shows up to 3 events per day, "+X more" for overflow

## Implementation Steps

1. ✅ Create calendar component structure
2. ✅ Map production requests to calendar events (scheduledDate)
3. ✅ Map purchase requests to calendar events (estimatedArrival)
4. ✅ Add calendar widget above summary stats
5. ✅ Create event detail modal
6. ✅ Remove Schedule tab from navigation

## Mock Data Mapping

### Production Request → Calendar Event
```typescript
{
  date: '2026-03-01',
  type: 'production',
  title: 'PROD-2026-003: PVC Pipe 4" Sanitary',
  details: {
    requestNumber: 'PROD-2026-003',
    productName: 'PVC Pipe 4" Sanitary',
    quantity: 5000,
    priority: 'high'
  }
}
```

### Purchase Request → Calendar Event
```typescript
{
  date: '2026-03-05',
  type: 'purchase',
  title: 'PURCH-2026-002: PVC Resin Powder K70',
  details: {
    requestNumber: 'PURCH-2026-002',
    materialName: 'PVC Resin Powder K70',
    quantity: 2000,
    supplier: 'PetroPlastics Inc'
  }
}
```

## Benefits

✅ **Visual Planning** - See schedule at a glance
✅ **Collision Detection** - Spot overlapping batches/arrivals
✅ **Context-Aware** - Calendar in same view as requests table
✅ **Less Navigation** - No need for separate Schedule tab
✅ **Executive Style** - Consistent with executive dashboard calendar
