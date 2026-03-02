# Movements Tab - Demand Forecasting & ML Integration

## Overview
Transform the Movements tab from a simple history log into an **intelligent demand forecasting dashboard** that uses the company's historical data to predict future product and material needs using machine learning.

---

## Key Features

### 1. **Product/Material Selector**
- Dropdown to select either:
  - **Finished Products** (PVC pipes, fittings, etc.)
  - **Raw Materials** (PVC resin, stabilizers, pigments)
- Search functionality
- Category filtering
- Recently viewed items

### 2. **Demand Forecast Graph (Main Feature)**
- **Line chart with dual time zones:**
  - **Historical Data (Feb 13-27)**: 14 days of actual usage/consumption (blue solid line)
  - **Forecast Data (Feb 28-Mar 13)**: 14 days of predicted demand (orange/red dashed line)
- **Total span**: 28 days (14 historical + 14 forecast)
- **Y-axis**: Quantity (units/kg/L)
- **X-axis**: Dates
- **Visual distinction**:
  - Vertical divider at "Today" (Feb 27)
  - Different line styles (solid vs dashed)
  - Color transition (blue → orange/red)
  - Confidence interval shading for forecast

### 3. **ML Model Insights Panel**
- Model accuracy: 87.3%
- Confidence level: High/Medium/Low
- Factors considered:
  - Historical consumption patterns
  - Seasonal trends
  - Production schedule
  - Order pipeline
  - Weather patterns (for construction materials)
  - Market trends
- Last model training: Date/time
- Data points used: Number of historical records

### 4. **Key Metrics Cards**
- **Current Stock**: Actual inventory level
- **Days of Cover**: Based on forecasted demand
- **Predicted Stockout Date**: When inventory will run out
- **Recommended Reorder Date**: When to place new order
- **Recommended Order Quantity**: Suggested amount to order
- **Forecast Accuracy**: Historical vs actual comparison

### 5. **Historical Movement Log**
- Scrollable table below the graph
- Movement type icons (In/Out/Transfer/Production/Adjust)
- Date, quantity, reference, user
- Filter by movement type
- Export to Excel

### 6. **Smart Alerts**
- ⚠️ Stock running low (based on forecast)
- 📈 Demand spike predicted
- 📉 Demand decline detected
- 🎯 Reorder point approaching
- 🔄 Seasonal pattern detected

---

## Mock Data Structure

### Historical Consumption (14 days)
```typescript
interface HistoricalDemand {
  date: string; // "Feb 13", "Feb 14", etc.
  quantity: number;
  movementType: 'Production' | 'Sale' | 'Transfer' | 'Adjust';
  actual: number; // Actual consumption
}
```

### Forecasted Demand (14 days)
```typescript
interface ForecastedDemand {
  date: string; // "Feb 28", "Mar 1", etc.
  predictedQuantity: number;
  confidenceInterval: {
    low: number;
    high: number;
  };
  factors: {
    seasonality: number; // 0-1
    trend: number; // -1 to 1
    orders: number; // Impact from known orders
    production: number; // Impact from production schedule
  };
}
```

### Complete Data Point
```typescript
interface DemandDataPoint {
  date: string;
  actual?: number; // Historical only
  forecast?: number; // Forecast only
  confidenceLow?: number;
  confidenceHigh?: number;
  isForecast: boolean;
  events?: string[]; // "Order #123", "Production BATCH-001"
}
```

---

## Visual Design

```
┌────────────────────────────────────────────────────────────────────┐
│  Movements & Demand Forecast                                       │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [Select Item: PVC Pressure Pipe 4" x 10ft ▼]  [Products ▼]       │
│                                                                     │
│  ┌──────────┬──────────┬──────────┬──────────┐                    │
│  │ Current  │ Days of  │ Stockout │ Reorder  │                    │
│  │  Stock   │  Cover   │   Date   │   Date   │                    │
│  │  450 pcs │ 12 days  │  Mar 11  │  Mar 4   │                    │
│  └──────────┴──────────┴──────────┴──────────┘                    │
│                                                                     │
│  📊 Demand Forecast Chart                                          │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │   Qty                                                         │ │
│  │   60 │            Historical  │  Forecast                    │ │
│  │      │   ┌────┐               │     ╱╲                       │ │
│  │   50 │  ╱      ╲     ┌─┐      │    ╱  ╲   ╱╲                │ │
│  │      │ ╱        ╲   ╱   ╲     │   ╱    ╲ ╱  ╲               │ │
│  │   40 │            ╲╱     ╲    │  ╱      ╳    ╲              │ │
│  │      │                    ╲  ╱│ ╱      ╱ ╲    ╲             │ │
│  │   30 │                     ╲╱ │╱      ╱   ╲    ╲            │ │
│  │      ├─────────────────────┼──┼───────────────────────────  │ │
│  │        Feb 13 ... Feb 27 TODAY Feb 28 ... Mar 13           │ │
│  │                                                               │ │
│  │  Legend: ── Historical (Actual)  - - Forecast (Predicted)   │ │
│  │          ░░ Confidence Interval   │ Today Marker             │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  🤖 ML Insights                                                    │
│  • Model Accuracy: 87.3% (High Confidence)                        │
│  • Trend: Stable demand with slight increase                     │
│  • Peak days: Mar 2, Mar 8 (end of week patterns)               │
│  • Recommendation: Maintain current stock levels                  │
│                                                                     │
│  ⚠️ Alerts                                                         │
│  • Reorder point approaching on Mar 4                            │
│  • Predicted demand spike on Mar 8 (+25%)                        │
│                                                                     │
│  📋 Movement History (Last 30 Days)                               │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ Date     │ Type  │ Qty   │ Reference    │ User      │ Notes  │ │
│  ├──────────┼───────┼───────┼──────────────┼───────────┼────────┤ │
│  │ Feb 27   │ Out   │ -35   │ ORD-2026-045 │ J. Santos │        │ │
│  │ Feb 27   │ Prod  │ +100  │ BATCH-2026   │ System    │        │ │
│  │ Feb 26   │ Out   │ -42   │ ORD-2026-044 │ M. Cruz   │        │ │
│  └──────────┴───────┴───────┴──────────────┴───────────┴────────┘ │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Basic Structure
1. Create selector for products/materials
2. Display current stock metrics
3. Show historical movement log

### Phase 2: Graph Implementation
1. Set up recharts LineChart component
2. Create 28-day date range (14 historical + 14 forecast)
3. Plot historical data (solid blue line)
4. Add vertical "Today" divider
5. Plot forecast data (dashed orange line)
6. Add confidence interval shading

### Phase 3: ML Insights
1. Create mock ML model data
2. Display accuracy metrics
3. Show trend analysis
4. Generate recommendations

### Phase 4: Smart Alerts
1. Calculate stockout dates
2. Detect demand spikes
3. Generate reorder suggestions
4. Show seasonal patterns

---

## Mock Data Examples

### Product: PVC Pressure Pipe 4" x 10ft

**Historical (Feb 13-27):**
```
Feb 13: 38 pcs (Production +100, Sales -62)
Feb 14: 42 pcs
Feb 15: 35 pcs
Feb 16: 28 pcs (Weekend - lower)
Feb 17: 31 pcs (Weekend - lower)
Feb 18: 45 pcs (Monday surge)
Feb 19: 41 pcs
Feb 20: 38 pcs
Feb 21: 43 pcs
Feb 22: 39 pcs
Feb 23: 33 pcs (Weekend)
Feb 24: 29 pcs (Weekend)
Feb 25: 47 pcs (Monday surge)
Feb 26: 42 pcs
Feb 27: 35 pcs (Today)
```

**Forecast (Feb 28-Mar 13):**
```
Feb 28: 44 pcs (±5) - End of week pattern
Feb 29: 38 pcs (±4)
Mar 1:  32 pcs (±4) - Weekend
Mar 2:  30 pcs (±4) - Weekend
Mar 3:  48 pcs (±6) - Monday surge
Mar 4:  43 pcs (±5)
Mar 5:  40 pcs (±5)
Mar 6:  42 pcs (±5)
Mar 7:  39 pcs (±5)
Mar 8:  52 pcs (±7) - Peak (orders scheduled)
Mar 9:  35 pcs (±4) - Weekend
Mar 10: 33 pcs (±4) - Weekend
Mar 11: 46 pcs (±6)
Mar 12: 41 pcs (±5)
Mar 13: 38 pcs (±5)
```

**Metrics:**
- Current Stock: 450 pcs
- Average Daily Demand: 38 pcs/day
- Forecasted Daily Demand: 40 pcs/day
- Days of Cover: 11-12 days
- Predicted Stockout: Mar 11
- Recommended Reorder: Mar 4
- Recommended Quantity: 300 pcs (1 week production batch)

---

### Material: PVC Resin Powder K67

**Historical (Feb 13-27):**
```
Feb 13: 420 kg (Production usage)
Feb 14: 0 kg (No production)
Feb 15: 580 kg
Feb 16: 0 kg
Feb 17: 0 kg
Feb 18: 650 kg
Feb 19: 0 kg
Feb 20: 480 kg
Feb 21: 0 kg
Feb 22: 0 kg
Feb 23: 0 kg
Feb 24: 720 kg
Feb 25: 0 kg
Feb 26: 540 kg
Feb 27: 0 kg
```

**Forecast (Feb 28-Mar 13):**
```
Feb 28: 0 kg
Feb 29: 600 kg (±80) - Production scheduled
Mar 1:  0 kg
Mar 2:  680 kg (±90) - Large batch
Mar 3:  0 kg
Mar 4:  0 kg
Mar 5:  520 kg (±70)
Mar 6:  0 kg
Mar 7:  0 kg
Mar 8:  750 kg (±100) - Peak production
Mar 9:  0 kg
Mar 10: 0 kg
Mar 11: 580 kg (±80)
Mar 12: 0 kg
Mar 13: 640 kg (±85)
```

**Metrics:**
- Current Stock: 3,200 kg
- Average Daily Usage: 285 kg/day (production days only)
- Forecasted Usage: 305 kg/day
- Days of Cover: 8-10 production cycles (18-20 calendar days)
- Predicted Stockout: Mar 16
- Recommended Reorder: Now (3-4 day lead time)
- Recommended Quantity: 5,000 kg (bulk order discount)

---

## ML Model Simulation

### Algorithm Factors:
1. **Historical Pattern Recognition** (40% weight)
   - Identifies daily, weekly, monthly cycles
   - Detects seasonality (construction season, rainy season)
   - Recognizes special events (holidays, project deadlines)

2. **Trend Analysis** (25% weight)
   - Linear regression on 90-day window
   - Exponential smoothing
   - Moving averages

3. **Production Schedule Integration** (20% weight)
   - Known production batches
   - Material requirements planning
   - Manufacturing calendar

4. **Order Pipeline** (15% weight)
   - Confirmed orders
   - Pending quotations
   - Repeat customer patterns
   - Sales forecast from agents

### Confidence Levels:
- **High (>85%)**: Strong historical data, clear patterns, stable demand
- **Medium (70-85%)**: Some variability, seasonal factors, moderate data
- **Low (<70%)**: New product, high volatility, insufficient data

### Model Updates:
- **Real-time**: Stock movements update immediately
- **Daily**: Retrain model with yesterday's actuals
- **Weekly**: Deep learning cycle with full dataset
- **Monthly**: Seasonal adjustment and parameter tuning

---

## Technical Implementation

### Component Structure:
```
MovementsTab/
  ├─ ItemSelector/           (Product/Material dropdown)
  ├─ MetricsCards/           (Stock, days of cover, etc.)
  ├─ DemandForecastChart/    (Main graph)
  ├─ MLInsightsPanel/        (Model accuracy, trends)
  ├─ SmartAlerts/            (Warnings and recommendations)
  └─ MovementHistoryTable/   (Historical log)
```

### Data Flow:
1. User selects product/material
2. Fetch historical movement data (14 days)
3. Generate forecast data (14 days) - mock for now, API later
4. Calculate metrics (stock, days of cover, stockout date)
5. Render graph with dual timelines
6. Display ML insights and alerts

### Chart Library:
- **Recharts**: Already used in project
- Components needed:
  - `LineChart`
  - `Line` (2 lines: historical & forecast)
  - `Area` (confidence interval shading)
  - `XAxis` (dates)
  - `YAxis` (quantity)
  - `ReferenceLine` (today marker)
  - `CartesianGrid`
  - `Tooltip`
  - `Legend`

---

## Future Enhancements (Post-MVP)

### Phase 2 Features:
- **Multi-item comparison**: Compare demand of 2-3 products
- **What-if scenarios**: "What if demand increases by 20%?"
- **Export forecast**: Download CSV/PDF report
- **Email alerts**: Automatic notifications for stockouts
- **Mobile dashboard**: Responsive forecast view

### Phase 3 - Advanced ML:
- **Real ML API integration**: Connect to Python/TensorFlow backend
- **Custom model training**: Upload historical CSV
- **A/B testing**: Compare model accuracy
- **Sentiment analysis**: Social media/news impact
- **Competitor analysis**: Market share predictions

### Phase 4 - Integration:
- **Auto-create purchase requests**: When reorder point hit
- **Auto-create production batches**: Based on forecast
- **Supplier negotiation**: Bulk order suggestions
- **Budget forecasting**: Cost predictions
- **Cash flow impact**: Financial planning integration

---

## Success Metrics

### KPIs to Track:
1. **Forecast Accuracy**: 85%+ (MAPE - Mean Absolute Percentage Error)
2. **Stockout Prevention**: 95%+ orders fulfilled without delays
3. **Inventory Optimization**: 20% reduction in excess stock
4. **User Adoption**: 80%+ warehouse managers use weekly
5. **Time Savings**: 5 hours/week saved on manual planning

---

## Business Value

### For Warehouse Managers:
- ✅ Proactive planning vs reactive firefighting
- ✅ Reduced stockouts and customer delays
- ✅ Optimized inventory levels (not too much, not too little)
- ✅ Data-driven reorder decisions
- ✅ Better supplier negotiations (predictable orders)

### For Executive Team:
- ✅ Reduced carrying costs (less excess inventory)
- ✅ Improved cash flow (just-in-time ordering)
- ✅ Higher customer satisfaction (on-time deliveries)
- ✅ Competitive advantage (smart forecasting)
- ✅ Scalable growth (ML adapts to volume increases)

### For Production Team:
- ✅ Better production planning
- ✅ Reduced rush orders
- ✅ Optimized batch sizes
- ✅ Material availability assurance

---

## Implementation Timeline

**Week 1**: Basic UI + Historical graph
**Week 2**: Forecast graph + Mock ML data
**Week 3**: Metrics cards + Alerts
**Week 4**: Movement history + Polish
**Week 5**: User testing + Refinements
**Week 6**: Production deployment

**Total: 6 weeks to MVP**

---

Status: ✅ **READY FOR IMPLEMENTATION**
