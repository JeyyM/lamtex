# Responsive Design Best Practices Guide

## Introduction
This guide establishes patterns and standards for creating responsive interfaces in the Lamtex application. All new components and pages should follow these principles.

## Core Principles

### 1. Mobile-First Approach
- Write base styles for mobile (320px) first
- Add complexity through media queries as screen size increases
- This ensures accessibility and performance on smaller devices

```tsx
// ✓ GOOD: Mobile first
<div className="text-sm md:text-base lg:text-lg">

// ✗ WRONG: Desktop first
<div className="max-[768px]:text-sm text-base">
```

### 2. Standard Breakpoints
Use Tailwind's standard breakpoints consistently across the project:

| Breakpoint | Width | Use Case |
|-----------|-------|----------|
| (default) | 0px | Mobile phones |
| `sm:` | 640px | Small devices / large phones |
| `md:` | 768px | Tablets / iPad |
| `lg:` | 1024px | Desktop computers |
| `xl:` | 1280px | Large desktop |
| `2xl:` | 1536px | Ultra-wide displays |

**Never use custom pixel breakpoints** like `min-[600px]` or `max-[750px]` unless absolutely necessary and documented.

### 3. Touch-Friendly Design (WCAG 2.5.5)
All interactive elements on mobile must be at least 44px × 44px:

```tsx
// ✓ GOOD: Touch-friendly button on mobile
<Button className="h-11 px-4">Click Me</Button>

// ✗ WRONG: Too small for touch
<button className="h-6 px-2">Click Me</button>
```

### 4. Responsive Typography
Text sizes should adapt to screen size:

```tsx
// ✓ GOOD: Responsive text
<h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
  Page Title
</h1>

// ✗ WRONG: Fixed size
<h1 className="text-4xl font-bold">Page Title</h1>
```

### 5. Responsive Spacing
Padding and margins should scale with screen size:

```tsx
// ✓ GOOD: Responsive spacing
<div className="p-3 sm:p-4 md:p-6">
  <h2 className="text-lg sm:text-xl mb-2 sm:mb-4">Section</h2>
</div>

// ✗ WRONG: Fixed spacing
<div className="p-6">
  <h2 className="text-xl mb-4">Section</h2>
</div>
```

## Component Patterns

### Header Pattern
```tsx
<div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
        Title
      </h1>
      <p className="text-xs sm:text-sm text-gray-500 mt-1">
        Subtitle
      </p>
    </div>
    <Button className="w-full sm:w-auto">
      Action
    </Button>
  </div>
</div>
```

### Grid Pattern (Stats Cards)
```tsx
// 2 columns on mobile, 3 on tablet, 4+ on desktop
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
  {items.map(item => (
    <Card key={item.id} className="p-4 sm:p-6">
      {/* Card content */}
    </Card>
  ))}
</div>
```

### Layout Pattern (Side-by-Side Desktop, Stacked Mobile)
```tsx
<div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
  {/* Item 1 */}
  <div className="flex-1">Item 1</div>
  
  {/* Item 2 */}
  <div className="flex-1">Item 2</div>
</div>
```

### Show/Hide Pattern
```tsx
// ✓ GOOD: Use standard Tailwind breakpoints
<div className="hidden md:block">Desktop only</div>
<div className="md:hidden">Mobile only</div>

// ✗ WRONG: Custom breakpoints
<div className="max-[768px]:hidden">Desktop only</div>
<div className="min-[768px]:hidden">Mobile only</div>
```

### Table Pattern
Use the new `ResponsiveTable` component:

```tsx
import { ResponsiveTable } from '@/src/components/ui/ResponsiveTable';

<ResponsiveTable
  columns={[
    { key: 'name', label: 'Name', align: 'left' },
    { key: 'amount', label: 'Amount', align: 'right', render: (val) => `$${val}` },
    { key: 'status', label: 'Status', hideOnMobile: true },
  ]}
  data={items}
  mobileColumns={['name', 'amount']} // Show fewer columns on mobile
/>
```

## Form & Input Pattern
```tsx
<form className="space-y-4 sm:space-y-6">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
    <div>
      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
        Field Label
      </label>
      <input 
        className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg"
        placeholder="Enter value"
      />
    </div>
    <div>
      {/* Next field */}
    </div>
  </div>
  
  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
    <Button className="flex-1 sm:flex-none">Submit</Button>
    <Button variant="outline" className="flex-1 sm:flex-none">Cancel</Button>
  </div>
</form>
```

## Common Mistakes to Avoid

### ❌ Custom Breakpoints
```tsx
// WRONG
<div className="min-[600px]:grid-cols-3 min-[1500px]:grid-cols-5">
// CORRECT
<div className="sm:grid-cols-3 2xl:grid-cols-5">
```

### ❌ Fixed Icon Sizes
```tsx
// WRONG
<Icon className="w-6 h-6" /> // Always 24px

// CORRECT
<Icon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
```

### ❌ Overflow for Tables
```tsx
// WRONG: Forces horizontal scroll
<div className="overflow-x-auto">
  <table>{/* ... */}</table>
</div>

// CORRECT: Use ResponsiveTable component
<ResponsiveTable columns={...} data={...} />
```

### ❌ Non-Responsive Buttons
```tsx
// WRONG: Takes full width on mobile
<Button>Action</Button>

// CORRECT: Responsive width
<Button className="w-full sm:w-auto">Action</Button>
```

### ❌ Empty State on Mobile
```tsx
// WRONG: Text too small
<p className="text-gray-500">No data available</p>

// CORRECT: Readable on mobile
<p className="text-sm sm:text-base text-gray-500">
  No data available
</p>
```

## Testing Checklist

### At Each Breakpoint
- [ ] 320px (iPhone SE / small mobile)
- [ ] 375px (iPhone 12 / standard mobile)
- [ ] 540px (Vertical tablet)
- [ ] 768px (iPad / tablet landscape)
- [ ] 1024px (Desktop start)
- [ ] 1440px (Large desktop)
- [ ] 1920px (Ultra-wide)

### Content Testing
- [ ] All text is readable (min 14px effective size)
- [ ] No horizontal scroll needed
- [ ] Touch targets are 44px+ on mobile
- [ ] Images scale appropriately
- [ ] Tables are readable (or use ResponsiveTable)
- [ ] Forms fill properly on all sizes

### Visual Testing
- [ ] Spacing is balanced (not cramped on mobile, not excessive on desktop)
- [ ] Alignment is consistent
- [ ] Colors and contrast are consistent
- [ ] Icons scale with content
- [ ] Nested elements don't overflow

## Code Review Questions

Before approving a PR, ask:

1. **Does this component work at 320px?**
   - Can you read the text?
   - Can you tap buttons?
   - Is there horizontal scroll?

2. **Does it follow standard breakpoints?**
   - Are custom `min-[Xpx]` breakpoints used? (Flag for removal)
   - Are `md:` `lg:` `xl:` used consistently?

3. **Is typography responsive?**
   - Do headings scale down on mobile?
   - Is text size readable at smallest width?

4. **Are spacing values responsive?**
   - Does padding scale with screen size?
   - Are gaps between items appropriate?

5. **Are touch targets large enough?**
   - Can users easily tap buttons on mobile?
   - Is there adequate spacing between clickable elements?

## Resources

- [Tailwind Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [WCAG Touch Target Size](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
- [Mobile First Design](https://www.nngroup.com/articles/mobile-first-web-design/)

## Component Examples

### ✓ Responsive Card Component
See `src/components/ui/ResponsiveTable.tsx` for an example of a component that automatically adapts between mobile and desktop views.

### ✓ Responsive Page Pattern
See `src/pages/SuppliersPage.tsx` and `src/pages/FinancePageNew.tsx` for full-page examples.

---

## Current Implementation Status

### Completed ✓
- [x] Header responsiveness across all pages
- [x] KPI/stat cards with responsive grids
- [x] Navigation responsive (desktop tabs, mobile dropdowns)
- [x] Search and filter responsive layouts
- [x] ResponsiveTable component
- [x] Typography scaling on all pages
- [x] Spacing responsive (padding/margins)

### In Progress 🔄
- [ ] Apply ResponsiveTable to all pages with tables
- [ ] Audit remaining pages for custom breakpoints
- [ ] Icon sizing responsive across all components

### Not Started ⏳
- [ ] Mobile app optimization
- [ ] Dark mode responsive testing
- [ ] Accessibility audit at all breakpoints

---

## Questions?

For questions about responsive design patterns, refer to:
1. This guide first
2. SuppliersPage.tsx (comprehensive example)
3. FinancePageNew.tsx (table example)
4. ResponsiveTable component (reusable table pattern)
