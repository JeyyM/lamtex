# Stock Adjustment System - Pages Integration

## Overview
Extended the stock adjustment modal system to **Raw Materials Category Page** and **Products Category Page**, allowing warehouse workers to adjust inventory directly from the category browsing pages.

---

## Pages Updated

### 1. **MaterialCategoryPage.tsx** (`/materials/category/:categoryName`)
**Purpose:** Browse and manage raw materials within a specific category

#### Changes Made:
- ✅ Added `StockAdjustmentModal` import
- ✅ Added `Edit3` icon for adjust button
- ✅ Added state: `showStockAdjustmentModal`, `selectedItemForAdjustment`
- ✅ Added handlers: `handleOpenAdjustment`, `handleStockAdjustment`
- ✅ Added "Adjust Stock" button to each material card
- ✅ Integrated modal with `itemType="raw-material"`

#### Button Location:
- Below the Price & Total Value section
- Above the card footer
- Full-width button with hover effects

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

### 2. **ProductCategoryPage.tsx** (`/products/category/:categoryName`)
**Purpose:** Browse and manage finished goods (product families) within a specific category

#### Changes Made:
- ✅ Added `StockAdjustmentModal` import
- ✅ Added `Edit3` icon for adjust button
- ✅ Added state: `showStockAdjustmentModal`, `selectedItemForAdjustment`
- ✅ Added handlers: `handleOpenAdjustment`, `handleStockAdjustment`
- ✅ Added "Adjust Stock" button to each product family card
- ✅ Integrated modal with `itemType="finished-good"`

#### Button Location:
- Below warning messages (if any)
- Above the card footer
- Full-width button with hover effects

#### Data Mapping:
```typescript
{
  id: family.id,
  name: family.name,
  sku: family.familyCode,
  currentStock: family.totalStock,
  unit: 'units',
  reorderPoint: 500  // Default for products
}
```

---

## Visual Design

### Button Styling:
```tsx
<Button
  variant="outline"
  size="sm"
  onClick={(e) => handleOpenAdjustment(item, e)}
  className="w-full flex items-center justify-center gap-2 
             hover:bg-red-50 hover:border-red-300 hover:text-red-600 
             transition-colors"
>
  <Edit3 className="w-4 h-4" />
  Adjust Stock
</Button>
```

### Features:
- **Icon:** Edit3 (adjustment icon)
- **Full width:** Spans entire card width
- **Hover effect:** Red theme matching Lamtex brand
- **Stop propagation:** Prevents card click when clicking button

---

## User Flow

### Material Category Page:
1. User navigates to `/materials/category/pvc-resin` (or any category)
2. Sees grid of material cards with stock information
3. Clicks "Adjust Stock" on a specific material
4. **Confirmation Modal appears:**
   - Shows current stock → adjustment → new stock
   - Displays reorder point warnings if applicable
   - Optional notes field
5. User reviews and clicks "Confirm & Submit"
6. Success message appears
7. Modal auto-closes after 2 seconds

### Product Category Page:
1. User navigates to `/products/category/hdpe-pipes` (or any category)
2. Sees grid of product family cards with stock information
3. Clicks "Adjust Stock" on a specific product family
4. **Confirmation Modal appears:** (same as materials)
5. Adjustment is logged (console + alert in development)

---

## Technical Implementation

### Event Handling:
```typescript
const handleOpenAdjustment = (item, e: MouseEvent) => {
  e.stopPropagation(); // Prevent card click navigation
  setSelectedItemForAdjustment({...});
  setShowStockAdjustmentModal(true);
};
```

### Adjustment Handler:
```typescript
const handleStockAdjustment = (adjustment) => {
  console.log('Stock Adjustment:', {
    item: selectedItemForAdjustment,
    adjustment,
    timestamp: new Date().toISOString(),
  });

  const notesMessage = adjustment.notes ? `\nNotes: ${adjustment.notes}` : '';
  const message = `Stock adjusted successfully!\n\n${adjustment.type === 'add' ? '+' : '-'}${adjustment.quantity} ${selectedItemForAdjustment.unit}${notesMessage}\n\nThis would update the database in production.`;
  
  alert(message);
};
```

---

## Pages with Stock Adjustment System

✅ **WarehousePage** - Main inventory management page
  - Finished goods table
  - Raw materials table

✅ **MaterialCategoryPage** - Raw materials by category
  - Material cards with stock info

✅ **ProductCategoryPage** - Finished goods by category
  - Product family cards with stock info

---

## Future Backend Integration

When connecting to real API, update handlers in all three pages:

```typescript
const handleStockAdjustment = async (adjustment) => {
  try {
    const response = await api.post('/inventory/adjust', {
      itemId: selectedItemForAdjustment.id,
      itemType: 'raw-material', // or 'finished-good'
      type: adjustment.type,
      quantity: adjustment.quantity,
      notes: adjustment.notes,
      userId: currentUser.id,
      timestamp: new Date().toISOString(),
    });

    // Refresh inventory data
    await refreshInventoryData();

    // Show success notification
    toast.success('Stock adjusted successfully!');
    
  } catch (error) {
    toast.error('Failed to adjust stock');
    console.error(error);
  }
};
```

---

## Consistency Across Pages

All three pages (Warehouse, Material Category, Product Category) now have:
- ✅ Same modal component (StockAdjustmentModal)
- ✅ Same user flow (adjust → confirm → success)
- ✅ Same visual design (red theme, full-width button)
- ✅ Same validation rules (over-subtraction prevention)
- ✅ Same confirmation flow (preview before final submit)
- ✅ Same data structure (type, quantity, notes)

---

## Testing Checklist

### MaterialCategoryPage:
- [ ] Navigate to any material category
- [ ] Click "Adjust Stock" on a material card
- [ ] Verify modal shows correct material details
- [ ] Test Add Stock functionality
- [ ] Test Subtract Stock functionality
- [ ] Test over-subtraction prevention
- [ ] Test low stock warnings
- [ ] Test confirmation flow (Go Back / Confirm & Submit)
- [ ] Verify success message displays correctly
- [ ] Test card click still navigates to detail page

### ProductCategoryPage:
- [ ] Navigate to any product category
- [ ] Click "Adjust Stock" on a product card
- [ ] Verify modal shows correct product details
- [ ] Test Add Stock functionality
- [ ] Test Subtract Stock functionality
- [ ] Test over-subtraction prevention
- [ ] Test low stock warnings (500 units default)
- [ ] Test confirmation flow
- [ ] Verify success message
- [ ] Test card click still navigates

---

## Notes

1. **Event Propagation:** Both pages use `e.stopPropagation()` to prevent the card's onClick from firing when clicking the Adjust Stock button.

2. **Item Type:** 
   - MaterialCategoryPage uses `itemType="raw-material"`
   - ProductCategoryPage uses `itemType="finished-good"`

3. **Reorder Points:**
   - Materials: Use actual `material.reorderPoint` from data
   - Products: Default to 500 units (can be customized per product)

4. **Stock Units:**
   - Materials: Use `material.unitOfMeasure` (kg, liters, etc.)
   - Products: Use 'units' as default

5. **Modal Cleanup:** Both pages properly reset state when modal closes to prevent stale data.

---

## Summary

The stock adjustment system is now consistently available across:
- **Warehouse page** (table view)
- **Material category pages** (card view)
- **Product category pages** (card view)

This provides maximum flexibility for warehouse workers to adjust inventory from any relevant page in the system, reducing navigation time and improving workflow efficiency.
