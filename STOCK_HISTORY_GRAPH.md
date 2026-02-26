# Stock History Graph - Recharts Implementation

## Overview
Updated the Create Request Modal to use **Recharts** for displaying stock history as a professional line graph with a continuously rising trend.

## Changes Made

### 1. Removed Dynamic Generation
- ❌ Removed `generateStockHistory()` function
- ❌ Removed random variance calculations
- ❌ Removed complex SVG polyline implementation

### 2. Added Mock Data
Created consistent placeholder data showing a **continuously rising trend** over 30 days:

```typescript
const mockStockHistory: StockHistoryPoint[] = [
  { date: 'Jan 28', actualStock: 450, reservedStock: 180 },
  { date: 'Jan 30', actualStock: 480, reservedStock: 190 },
  { date: 'Feb 1', actualStock: 520, reservedStock: 210 },
  // ... continues rising to Feb 27: 960 / 385
];
```

**Trend**: Both lines show steady growth from ~450 to 960 (actual) and 180 to 385 (reserved)

### 3. Implemented Recharts
Replaced custom SVG with proper Recharts components:

```tsx
<ResponsiveContainer width="100%" height={200}>
  <LineChart data={mockStockHistory}>
    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
    <XAxis dataKey="date" />
    <YAxis />
    <Tooltip />
    <Legend />
    <Line type="monotone" dataKey="actualStock" stroke="#3b82f6" name="Actual Stock" />
    <Line type="monotone" dataKey="reservedStock" stroke="#a855f7" name="Reserved/Consumption" />
  </LineChart>
</ResponsiveContainer>
```

## Features

### Visual Design
- **Two Lines**: Blue (actual stock) and Purple (reserved stock)
- **Grid**: Dashed grid lines for readability
- **Axes**: Labeled X-axis (dates) and Y-axis (quantities)
- **Legend**: Auto-generated with line names
- **Tooltip**: Hover to see exact values
- **Responsive**: Automatically adjusts to container width

### Data Characteristics
- **16 data points** spanning 30 days (every 2 days)
- **Rising trend**: Both lines increase consistently
- **Relationship**: Reserved stock is ~40% of actual stock
- **Same for all items**: Consistent mock data regardless of selected product/material

### Benefits Over Previous Implementation
✅ **Professional appearance** - Recharts provides polished UI
✅ **Interactive tooltips** - Hover shows exact values
✅ **Consistent data** - Same graph for all items (simple)
✅ **Less code** - Removed complex SVG calculations
✅ **Better accessibility** - Built-in Recharts features
✅ **Responsive** - Automatically scales with container

## Graph Appearance

```
960 |                                           ●
    |                                      ●
    |                                 ●
    |                            ●
720 |                       ●
    |                  ●
    |             ●
    |        ●
480 |   ●
    +------------------------------------------------
    Jan 28        Feb 7         Feb 17        Feb 27
```

**Blue Line (Actual Stock)**: 450 → 480 → 520 → ... → 960
**Purple Line (Reserved)**: 180 → 190 → 210 → ... → 385

Both show clear upward momentum, indicating healthy stock accumulation.

## Technical Details

### Import
```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
```

### Props Used
- `type="monotone"` - Smooth curved lines
- `strokeWidth={2}` - 2px line thickness
- `dot={false}` - No dots on data points for cleaner look
- `stroke="#3b82f6"` / `stroke="#a855f7"` - Tailwind blue-500 and purple-500
- `name` - Legend label

### Display Condition
- Shows graph when either `selectedProduct` OR `selectedMaterial` is selected
- Uses same `mockStockHistory` data for all selections

## Integration
- ✅ Works with both Production and Purchase requests
- ✅ Shows immediately when item selected
- ✅ No loading state needed (static data)
- ✅ No errors or warnings

## Future Enhancements
If you want dynamic data later:
- Connect to real API endpoint for historical stock data
- Add date range selector
- Allow switching between different time periods (7/30/90 days)
- Show comparison between multiple products
- Add trend line or projection
