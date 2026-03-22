# Responsive Design - Quick Reference Card

## Standard Breakpoints (ALWAYS Use These)

```
Mobile:        0-639px (default classes)
Tablet Small:  640px+   (sm:)
Tablet:        768px+   (md:)
Desktop:      1024px+   (lg:)
Large Desktop: 1280px+  (xl:)
Ultra-Wide:   1536px+   (2xl:)
```

## Never Use Custom Breakpoints

❌ `min-[600px]` → Use `sm:` instead  
❌ `min-[750px]` → Use `md:` instead  
❌ `min-[800px]` → Use `md:` instead  
❌ `min-[900px]` → Use `lg:` instead  
❌ `min-[1200px]` → Use `lg:` instead  
❌ `min-[1400px]` → Use `xl:` instead  
❌ `min-[1500px]` → Use `2xl:` instead  

## Mobile-First Pattern

```tsx
// CORRECT ORDER
<div className="
  text-sm              // Mobile (320px)
  sm:text-base         // Small devices (640px+)
  md:text-lg           // Tablets (768px+)
  lg:text-xl           // Desktop (1024px+)
  xl:text-2xl          // Large desktop (1280px+)
">
  My Text
</div>
```

## Show/Hide Pattern

```tsx
// ✓ CORRECT
<div className="hidden md:block">Desktop only</div>
<div className="md:hidden">Mobile only</div>

// ✗ WRONG
<div className="max-[768px]:hidden">Desktop only</div>
<div className="min-[768px]:hidden">Mobile only</div>
```

## Responsive Spacing

```tsx
// Padding responsive
<div className="p-3 sm:p-4 md:p-6">
  Content here
</div>

// Gap responsive
<div className="flex gap-2 sm:gap-3 md:gap-4">
  Item 1
  Item 2
</div>

// Margin responsive
<div className="mt-2 sm:mt-3 md:mt-4">
  Content here
</div>
```

## Responsive Typography

```tsx
// Headers
<h1 className="text-xl sm:text-2xl md:text-3xl font-bold">
<h2 className="text-lg sm:text-xl md:text-2xl font-bold">
<h3 className="text-base sm:text-lg md:text-xl font-bold">

// Body text
<p className="text-sm sm:text-base md:text-lg">

// Small text
<span className="text-xs sm:text-sm">
```

## Responsive Grids

```tsx
// 1 column mobile, 2 tablet, 3+ desktop
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">

// 2 columns mobile, 3 tablet, 4+ desktop
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4">

// Custom: 1 mobile, 2 medium, 3 large, 5 huge
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
```

## Responsive Flex

```tsx
// Stack on mobile, side-by-side on desktop
<div className="flex flex-col lg:flex-row gap-4">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

// Full width on mobile, auto on desktop
<button className="w-full sm:w-auto">
  Click Me
</button>
```

## Responsive Buttons

```tsx
// Full width mobile, auto desktop
<Button className="w-full sm:w-auto">
  Action
</Button>

// Hide text on mobile, show on desktop
<Button className="gap-2">
  <Icon className="w-4 h-4" />
  <span className="hidden sm:inline">
    Full Button Text
  </span>
</Button>
```

## Touch Target Sizing (Min 44px × 44px)

```tsx
// ✓ GOOD
<button className="h-11 px-4 py-2">Click</button>
<div className="min-h-[44px] flex items-center">Item</div>

// ✗ TOO SMALL
<button className="h-6 px-2 py-1">Click</button>
```

## Common Responsive Components

### Header
```tsx
<div className="p-3 sm:p-4 md:p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
  <div>
    <h1 className="text-xl sm:text-2xl font-bold">Title</h1>
    <p className="text-xs sm:text-sm text-gray-500">Subtitle</p>
  </div>
  <Button className="w-full sm:w-auto">Action</Button>
</div>
```

### Stats Cards
```tsx
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
  <Card className="p-4 sm:p-6">
    <p className="text-xs sm:text-sm text-gray-500">Label</p>
    <p className="text-xl sm:text-2xl font-bold mt-2">Value</p>
  </Card>
</div>
```

### Forms
```tsx
<form className="space-y-4 sm:space-y-6">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
    <div>
      <label className="text-xs sm:text-sm font-medium mb-2">Field</label>
      <input className="w-full px-3 sm:px-4 py-2 text-sm" />
    </div>
  </div>
  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
    <Button className="flex-1 sm:flex-none">Submit</Button>
    <Button variant="outline" className="flex-1 sm:flex-none">Cancel</Button>
  </div>
</form>
```

### Responsive Table
```tsx
import { ResponsiveTable } from '@/src/components/ui/ResponsiveTable';

<ResponsiveTable
  columns={[
    { key: 'name', label: 'Name', align: 'left' },
    { key: 'amount', label: 'Amount', align: 'right', render: (val) => `$${val}` },
  ]}
  data={items}
  mobileColumns={['name', 'amount']}
/>
```

## Check Your Work

Before submitting a PR, verify:

- [ ] Works at 320px width
- [ ] Works at 768px width
- [ ] Works at 1024px width
- [ ] No horizontal scroll on mobile
- [ ] Buttons are 44px+ tall on mobile
- [ ] Text is readable (min 14px effective)
- [ ] No custom pixel breakpoints used
- [ ] Standard Tailwind breakpoints only

## Common Mistakes

| ❌ WRONG | ✅ CORRECT |
|---------|----------|
| `max-[768px]:hidden` | `hidden md:block` |
| `min-[768px]:hidden` | `md:hidden` |
| `text-4xl` | `text-2xl md:text-3xl lg:text-4xl` |
| `p-8` | `p-4 sm:p-6 md:p-8` |
| `flex gap-8` | `flex gap-3 sm:gap-4 md:gap-8` |
| `w-64` (fixed) | `w-full md:w-64` |
| `overflow-x-auto` (table) | `<ResponsiveTable />` |

## Examples in Codebase

- **Full Page:** `src/pages/SuppliersPage.tsx`
- **Tables:** `src/pages/FinancePageNew.tsx`
- **Component:** `src/components/ui/ResponsiveTable.tsx`
- **Guide:** `RESPONSIVE_BEST_PRACTICES.md`

---

**Print this and keep it handy!** 📌
