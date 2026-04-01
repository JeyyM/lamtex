# Stock Adjustment System - Final Locations

## Overview
Moved stock adjustment functionality to the correct pages based on user feedback. Stock adjustment is now available on **individual variant pages** for products and **individual material detail pages** for raw materials, rather than category/family pages.

---

## Changes Made

### ✅ **Removed from ProductCategoryPage.tsx**
- **Reason:** Product families shouldn't have stock adjustment buttons
- **Action:** Removed imports, states, handlers, buttons, and modal
- **Result:** Clean category browsing page without stock adjustment clutter

### ✅ **Added to ProductDetailPage.tsx** (Product Variants)
**Location:** `/products/:id` (individual product with variants)

#### Implementation:
- ✅ Added `StockAdjustmentModal` and `Edit3` imports
- ✅ Added state: `showStockAdjustmentModal`, `selectedItemForAdjustment`
- ✅ Added handlers: `handleOpenAdjustment`, `handleStockAdjustment`
- ✅ Added "Adjust Stock" button next to "Edit" in variant table (desktop)
- ✅ Added "Adjust Stock" button in mobile card view
- ✅ Integrated modal with `itemType="finished-good"`

#### Button Locations:
**Desktop Table:**
- Actions column now has 2 buttons side-by-side:
  - Edit (blue)
  - Adjust Stock (red)

**Mobile Cards:**
- Bottom of card with 2 buttons in flex row:
  - Edit Variant (50% width, blue)
  - Adjust Stock (50% width, red)

#### Data Mapping:
```typescript
{
  id: variant.id,
  name: `${product.name} - ${variant.size}`, // e.g., "HDPE Pipe - 32mm"
  sku: variant.sku,
  currentStock: variant.totalStock,
  unit: 'units',
  reorderPoint: variant.reorderPoint || 100
}
```

---

### ✅ **Kept in MaterialCategoryPage.tsx** 
**Location:** `/materials/category/:categoryName`

- Stock adjustment on material cards is useful here
- Each material card has "Adjust Stock" button
- Allows quick adjustments while browsing materials by category

---

### ✅ **Added to MaterialDetailPage.tsx** (Individual Material)
**Location:** `/materials/category/:categoryName/details/:id`

#### Implementation:
- ✅ Added `StockAdjustmentModal` and `Edit3` imports
- ✅ Added state: `showStockAdjustmentModal`, `selectedItemForAdjustment`
- ✅ Added handlers: `handleOpenAdjustment`, `handleStockAdjustment`
- ✅ Added "Adjust Stock" button in header (primary red button)
- ✅ Integrated modal with `itemType="raw-material"`

#### Button Location:
**Header Section:**
- Three buttons displayed:
  - Create PR (outline, secondary)
  - Edit Material (outline, secondary)
  - **Adjust Stock** (primary, red) ← NEW

#### Data Mapping:
```typescript
{
  id: material.id,
  name: material.name,
  sku: material.sku,
  currentStock: material.totalStock,
  unit: material.unitOfMeasure,
  reorderPoint: material.reorderPoint
}
```

---

## Final System Architecture

### Pages WITH Stock Adjustment:

1. **WarehousePage** (`/warehouse`)
   - Finished goods table - Actions column
   - Raw materials table - Actions column
   - **Use Case:** Warehouse workers doing inventory counts

2. **MaterialCategoryPage** (`/materials/category/:categoryName`)
   - Material cards - "Adjust Stock" button
   - **Use Case:** Quick adjustments while browsing materials

3. **MaterialDetailPage** (`/materials/category/:categoryName/details/:id`)
   - Header button - "Adjust Stock" (primary)
   - **Use Case:** Detailed material inspection with stock adjustment

4. **ProductDetailPage** (`/products/:id`)
   - Variant table/cards - "Adjust Stock" button per variant
   - **Use Case:** Adjusting specific product variant stocks (sizes, colors, etc.)

### Pages WITHOUT Stock Adjustment:

1. **ProductsPage** (`/products`)
   - Just browsing categories, no stock shown

2. **ProductCategoryPage** (`/products/category/:categoryName`)
   - Shows product families (groups of variants)
   - Stock adjustment doesn't make sense at family level
   - **Why Removed:** Product families are logical groupings; actual stock is at variant level

3. **RawMaterialsPage** (`/materials`)
   - Just browsing categories

---

## User Workflows

### Adjusting Product Stock:
1. Navigate to Products page
2. Click on a product family (e.g., "Heavy Duty Industrial Pipes")
3. See all variants (32mm, 40mm, 50mm, etc.)
4. Click "Adjust Stock" on specific variant
5. Confirmation modal appears
6. Review change and submit

### Adjusting Material Stock (Method 1):
1. Navigate to Raw Materials page
2. Click on a category (e.g., "PVC Resin")
3. See material cards with stock
4. Click "Adjust Stock" on a material card
5. Confirmation modal appears
6. Review and submit

### Adjusting Material Stock (Method 2):
1. Navigate to material detail page
2. View full material information
3. Click "Adjust Stock" button in header
4. Confirmation modal appears
5. Review and submit

---

## Technical Details

### ProductDetailPage Variant Buttons

**Desktop (Table Row):**
```tsx
<td className="px-6 py-4">
  <div className="flex items-center gap-2">
    <button className="px-3 py-1 text-sm bg-blue-500...">
      Edit
    </button>
    <button 
      onClick={() => handleOpenAdjustment(variant)}
      className="px-3 py-1 text-sm bg-red-500... flex items-center gap-1"
    >
      <Edit3 className="w-3 h-3" />
      Adjust Stock
    </button>
  </div>
</td>
```

**Mobile (Card):**
```tsx
<div className="pt-2 flex gap-2">
  <button className="flex-1... bg-blue-500...">
    Edit Variant
  </button>
  <button 
    onClick={() => handleOpenAdjustment(variant)}
    className="flex-1... bg-red-500... flex items-center justify-center gap-1"
  >
    <Edit3 className="w-4 h-4" />
    Adjust Stock
  </button>
</div>
```

### MaterialDetailPage Header Button

```tsx
<div className="flex gap-2 flex-wrap">
  <Button variant="outline">
    <FileText className="w-4 h-4 mr-2" />
    Create PR
  </Button>
  <Button variant="outline">
    <Edit className="w-4 h-4 mr-2" />
    Edit Material
  </Button>
  <Button variant="primary" onClick={handleOpenAdjustment}>
    <Edit3 className="w-4 h-4 mr-2" />
    Adjust Stock
  </Button>
</div>
```

---

## Visual Design

### ProductDetailPage Variant Table:
- **Edit button:** Blue background, white text
- **Adjust Stock button:** Red background, white text, Edit3 icon
- **Layout:** Side-by-side with 2px gap
- **Mobile:** Stacked horizontally, equal width

### MaterialDetailPage Header:
- **Adjust Stock:** Primary button (red)
- **Position:** Right-aligned with other action buttons
- **Responsive:** Full width on mobile, auto on desktop

---

## Benefits of Current Architecture

### ✅ **Product Level:**
- Stock adjustment at **variant level** (correct granularity)
- Each size/color/specification has its own stock
- Workers adjust the exact item they're counting

### ✅ **Material Level:**
- Stock adjustment available in **two places:**
  - Category page (quick browsing adjustments)
  - Detail page (focused material management)
- Flexibility for different workflows

### ✅ **Warehouse Level:**
- Tables with Actions column
- Bulk inventory management
- Side-by-side finished goods and raw materials

---

## Testing Checklist

### ProductDetailPage:
- [ ] Navigate to any product detail page
- [ ] Verify variants table shows both Edit and Adjust Stock buttons
- [ ] Click "Adjust Stock" on a variant
- [ ] Verify modal shows correct variant name (Product - Size)
- [ ] Test Add/Subtract stock
- [ ] Verify mobile card view has both buttons side-by-side
- [ ] Test confirmation flow

### MaterialDetailPage:
- [ ] Navigate to any material detail page
- [ ] Verify header has "Adjust Stock" primary button
- [ ] Click "Adjust Stock"
- [ ] Verify modal shows correct material details
- [ ] Test Add/Subtract stock
- [ ] Verify mobile responsive button layout
- [ ] Test confirmation flow

### MaterialCategoryPage:
- [ ] Navigate to any material category
- [ ] Verify each material card has "Adjust Stock" button
- [ ] Click button on a material card
- [ ] Verify modal opens correctly
- [ ] Test stock adjustment

### ProductCategoryPage:
- [ ] Navigate to any product category
- [ ] Verify NO "Adjust Stock" buttons on family cards
- [ ] Verify clean browsing experience

---

## Summary

Stock adjustment is now in the **right places**:
- ✅ **Product variants** (not families)
- ✅ **Individual materials** (both category and detail pages)
- ✅ **Warehouse inventory tables** (bulk operations)

This provides a logical, granular approach where stock adjustments happen at the actual inventory item level, not at abstract grouping levels.
