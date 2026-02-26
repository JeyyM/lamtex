# Create Request Modal Documentation

## Overview
The Create Request Modal is a comprehensive form component for creating production and purchase requests in the warehouse management system. It features intelligent auto-filling, real-time validation, and a dual-line stock history graph.

## Location
- **Component**: `src/components/logistics/CreateRequestModal.tsx`
- **Used in**: `src/pages/WarehousePage.tsx` (Requests tab)

## Features

### 1. Dual Request Type System
- **Production Requests**: Schedule batch production of finished goods
- **Purchase Requests**: Order raw materials from suppliers
- Toggle between types with instant form adaptation

### 2. Smart Product/Material Selection
- **Searchable List**: Real-time filtering by name or code
- **Status Indicators**: Visual health status (critical/warning/healthy)
- **Current Stock Display**: Shows available quantity at selection time
- **Auto-Fill Intelligence**:
  - Sets quantity to reorder point
  - Adjusts priority based on stock status (critical → high, warning → medium)
  - Generates suggested dates (production: 2 days out + 4 day completion)
  - For purchases: Adjusts urgency based on days remaining

### 3. 30-Day Stock History Graph
**Dual-Line Graph showing:**
- **Blue Line**: Actual stock levels over 30 days
- **Purple Line**: Reserved/consumption stock
- **Features**:
  - Automatic Y-axis scaling based on max values
  - Grid lines for easy reading
  - Three X-axis date labels (start, middle, end)
  - Legend with color coding
  - Generated from historical trend simulation

### 4. Selected Item Info Card
Displays key information for the selected product/material:
- Current stock quantity
- Reorder point threshold
- Max capacity (products) or daily usage (materials)
- Visual gradient background with icon

### 5. Request Details Form

#### Quantity Input
- Numeric input with increment/decrement buttons (+10/-10)
- Unit display based on selected item
- Warning when quantity exceeds max capacity (production)

#### Supplier Field (Purchase Requests Only)
- Auto-filled from material's default supplier
- Editable text input

#### Date Scheduling
- **Scheduled/Delivery Date**: When production starts or delivery requested
- **Completion/Arrival Date**: When completed or materials arrive
- Min date validation (cannot schedule in the past)
- Completion must be after scheduled date

#### Priority Selector
- Three levels: Low, Medium, High
- Button grid with color coding:
  - Low: Gray
  - Medium: Yellow
  - High: Red
- Auto-set based on stock status

#### Notes Field
- Optional multi-line text area
- Context-specific placeholder text
- 4 rows for detailed information

### 6. Validation

**Required Fields:**
- Product/Material selection
- Quantity (must be > 0)
- Scheduled/Delivery date
- Completion/Arrival date
- Priority

**Warnings:**
- Quantity exceeds max capacity (production)
- Alert icon with yellow text

### 7. Form Actions

#### Cancel Button
- Closes modal without saving
- Discards all form data

#### Create Request Button
- Validates all required fields
- Generates request object with:
  - Auto-generated ID and request number
  - Selected item details
  - Scheduled dates
  - Status: 'pending'
  - Requested by: 'Current User'
  - Request date: Today
  - Priority and notes
- Console logs the request (for development)
- Shows success alert
- Closes modal

## Props Interface

```typescript
interface CreateRequestModalProps {
  isOpen: boolean;              // Controls modal visibility
  onClose: () => void;          // Function to close modal
  initialType: RequestType;     // 'production' | 'purchase'
  finishedGoods: FinishedGood[]; // Array of available products
  rawMaterials: RawMaterial[];   // Array of available materials
}
```

## Data Flow

### On Open
1. Modal receives initialType from parent (based on active request type)
2. Form resets to default state
3. Lists populated with finishedGoods/rawMaterials

### On Selection
1. User searches and selects product/material
2. Info card displays with current details
3. Stock history graph generates from mock data
4. Form fields auto-fill with intelligent defaults
5. Validation warnings appear if needed

### On Submit
1. Validates all required fields
2. Constructs request object with proper structure
3. Generates unique ID and request number
4. Logs to console (ready for API integration)
5. Shows success message
6. Closes modal and resets form

### On Cancel
1. Closes modal immediately
2. All form data discarded
3. Parent state unaffected

## Stock History Graph Technical Details

### Data Generation
```typescript
generateStockHistory(item): StockHistoryPoint[]
```
- Creates 31 data points (30 days + today)
- Simulates historical trends with variance (-15% to +15%)
- Reserved stock is 10-30% of actual stock
- Returns array of {date, actualStock, reservedStock}

### SVG Rendering
- Uses polyline for smooth lines
- Points calculated as percentages for responsiveness
- Y-axis: 5 labels from 0 to max value
- X-axis: 3 date labels (start, middle, end)
- Grid lines for readability
- Non-scaling stroke for consistent line width

### Color Scheme
- **Actual Stock**: #3b82f6 (blue-500)
- **Reserved Stock**: #a855f7 (purple-500)
- **Grid Lines**: border-gray-200
- **Background**: white with gray border

## UI/UX Features

### Layout
- **Max Width**: 6xl (1280px)
- **Max Height**: 90vh with scrollable content
- **Two-Column Grid**: Selection (left) + Form (right)
- **Responsive**: Adjusts to viewport size

### Visual Design
- Clean white background
- Consistent border-gray-200 throughout
- Blue accent for production (Factory icon, buttons)
- Green accent for purchase (ShoppingCart icon)
- Gradient info card (blue to purple)
- Shadow-xl for depth

### Interactions
- Hover effects on all buttons
- Focus rings on inputs (blue-500)
- Smooth transitions (transition-colors)
- Selected item highlighting (blue-50/green-50)
- Increment/decrement buttons for quantity

### Accessibility
- Clear labels for all fields
- Required field indicators (*)
- Error messages with icons
- Keyboard navigation support
- Semantic HTML structure

## Integration Points

### Parent Component (WarehousePage)
```typescript
const [showCreateModal, setShowCreateModal] = useState(false);
const [requestType, setRequestType] = useState<RequestType>('production');

<CreateRequestModal
  isOpen={showCreateModal}
  onClose={() => setShowCreateModal(false)}
  initialType={requestType}
  finishedGoods={mockFinishedGoods}
  rawMaterials={mockRawMaterials}
/>
```

### Trigger Button
```typescript
<button onClick={() => setShowCreateModal(true)}>
  <Plus className="w-4 h-4" />
  New Request
</button>
```

## Future Enhancements

### Phase 1 (API Integration)
- [ ] Connect to backend API for request creation
- [ ] Real-time stock validation
- [ ] Fetch actual stock history from database
- [ ] Update request tables on successful creation

### Phase 2 (Advanced Features)
- [ ] Bulk request creation
- [ ] Request templates/favorites
- [ ] Material substitution suggestions
- [ ] Cost estimation display
- [ ] Approval workflow preview

### Phase 3 (Enhanced UX)
- [ ] Form dirty state checking before close
- [ ] Save as draft functionality
- [ ] Recent selections quick access
- [ ] Predictive date suggestions based on machine learning
- [ ] Multi-material batch requests

## Testing Scenarios

### Production Request
1. Click "New Request" while on Production view
2. Search for "PVC Pipe"
3. Select a critical stock item
4. Verify auto-fill sets high priority
5. Adjust quantity above max capacity
6. Verify warning appears
7. Check stock graph renders correctly
8. Submit and verify console output

### Purchase Request
1. Switch to Purchase Requests tab
2. Click "New Request"
3. Search for raw material (e.g., "PVC Resin")
4. Select material with low days remaining
5. Verify supplier auto-fills
6. Verify urgent delivery date suggested
7. Add notes
8. Submit and verify structure

### Validation
1. Click Create without selecting item → Error
2. Set quantity to 0 → Error
3. Leave date empty → Error
4. Set completion before scheduled → Warning
5. All fields valid → Success

## Code Statistics
- **Total Lines**: 700+
- **Components**: 1 main modal + 1 graph + multiple form sections
- **State Variables**: 10
- **Helper Functions**: 2
- **Interfaces**: 4

## Dependencies
- React (useState)
- Lucide-react icons: X, Factory, ShoppingCart, Calendar, AlertCircle, TrendingUp, Package
- TypeScript for type safety
- Tailwind CSS for styling
