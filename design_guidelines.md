# Soulgraph Design Guidelines

## Design Approach

**Selected Approach:** Reference-Based (Trading Platform Aesthetic)

**Primary References:** Bybit, Binance, TradingView - professional trading platforms known for their dark themes, data-dense interfaces, and excellent chart readability.

**Design Principles:**
- Data-first: Chart and metrics take visual priority
- Professional precision: Clean, technical aesthetic
- Immediate clarity: Color-coded information at a glance
- Minimal distraction: Dark backgrounds reduce eye strain during extended use

## Core Design Elements

### A. Color Palette

**Dark Mode Foundation:**
- Background Primary: 17 12% 8% (deep charcoal, main app background)
- Background Secondary: 17 12% 12% (slightly lighter panels/cards)
- Background Elevated: 17 12% 16% (modals, dropdowns, hover states)
- Border Default: 0 0% 25% (subtle dividers)
- Border Muted: 0 0% 18% (grid lines, secondary borders)

**Semantic Colors:**
- Positive/Bullish: 142 76% 36% (vibrant green for positive news, up movements)
- Negative/Bearish: 0 84% 60% (vivid red for negative news, down movements)
- Text Primary: 0 0% 95% (high contrast white for main text)
- Text Secondary: 0 0% 65% (muted gray for labels, timestamps)
- Text Tertiary: 0 0% 45% (subtle gray for hints, placeholders)

**State Colors:**
- Mental/Душевное: 280 65% 65% (soft purple)
- Physical/Физическое: 200 85% 55% (bright cyan)
- Moral/Моральное: 45 90% 60% (golden amber)
- Financial/Финансовое: 142 76% 36% (green, aligns with positive)

**Accent & Interactive:**
- Primary Action: 220 85% 58% (professional blue for neutral actions)
- Hover Overlay: 0 0% 100% at 8% opacity (subtle white overlay)
- Focus Ring: 220 85% 58% (blue outline for accessibility)

### B. Typography

**Font Stack:**
- Primary: 'Inter', system-ui, sans-serif (clean, highly legible at small sizes)
- Monospace: 'Roboto Mono', 'Courier New', monospace (for numeric data, timestamps)

**Type Scale:**
- Display: text-2xl font-semibold (Chart title, modal headers)
- Heading: text-lg font-medium (Panel section titles)
- Body: text-sm font-normal (Default UI text, labels)
- Small: text-xs font-normal (Timestamps, axis labels, hints)
- Data: text-sm font-mono (Numeric values, prices, percentages)

**Line Heights:**
- Tight for data: leading-tight (numeric displays, compact info)
- Normal for UI: leading-normal (buttons, form labels)

### C. Layout System

**Spacing Primitives:**
Primary units: 2, 3, 4, 6, 8, 12, 16 (Tailwind scale)
- Micro spacing: p-2, gap-2 (within components)
- Standard spacing: p-4, gap-4 (between related elements)
- Section spacing: p-6, p-8 (panel padding, modal content)
- Large spacing: p-12, p-16 (separating major sections)

**Grid Structure:**
- Main Layout: Full-width chart area (flex-1) + Fixed right sidebar (w-80 to w-96)
- Chart container: Full height minus top toolbar (h-[calc(100vh-4rem)])
- Right panel: Scrollable with max-h-screen, sticky position

**Container Strategy:**
- App container: Full viewport (w-screen h-screen)
- Chart canvas: Responsive, fills available space
- Control panel: Fixed width, overflow-y-auto

### D. Component Library

**Buttons:**
- Positive News: Green background (bg-green-600), white text, rounded-lg, px-4 py-2, hover brightens
- Negative News: Red background (bg-red-600), white text, rounded-lg, px-4 py-2, hover brightens
- Secondary Actions: Dark gray (bg-gray-700), hover to bg-gray-600, text-gray-100
- Icon buttons: Square (w-10 h-10), subtle background, centered icon

**Chart Elements:**
- Grid Lines: Semi-transparent white/gray (1-2px, opacity 0.05-0.1)
- Crosshair: Bright blue or white line (1px solid, full opacity)
- Candlesticks: Green for up (fill + border), red for down (fill + border)
- Line series: 2px width, smooth curves, state-specific colors
- Markers: Triangular arrows pointing up (green) or down (red), 12-16px height

**Forms & Inputs:**
- Text inputs: Dark background (bg-gray-800), light border (border-gray-600), rounded-md, px-3 py-2
- Checkboxes: Custom styled with state color when checked, rounded border
- Sliders: Track in gray-700, thumb in state color, 4-6px track height
- Labels: text-sm text-gray-400, mb-2 spacing

**Modals:**
- Backdrop: bg-black/70 (dark overlay with 70% opacity)
- Content: bg-gray-900, rounded-xl, max-w-lg, p-6 to p-8
- Header: text-xl font-semibold mb-4, close button (text-gray-400 hover:text-white)
- Actions: Flex row with gap-3, justify-end alignment

**Data Display:**
- Value cards: bg-gray-800/50, rounded-lg, p-4, border border-gray-700
- Metric labels: text-xs text-gray-500 uppercase tracking-wide mb-1
- Metric values: text-2xl font-mono font-semibold, color-coded by state
- Percentage changes: Small badge with +/- indicator, green/red background

**Panel Sections:**
- Section container: mb-6 spacing between sections
- Section header: text-sm font-medium text-gray-300 mb-3, uppercase tracking-wide
- Dividers: border-t border-gray-700, my-6

### E. Chart-Specific Styling

**Lightweight Charts Configuration:**
- Layout: Dark background (#0f0f11), white text (#e5e7eb)
- Grid: Vertical and horizontal lines at 10% opacity, matching border colors
- Crosshair: Mode 'normal', vertLine and horzLine visible in bright blue
- Time scale: Visible, white text, dark background, border at top
- Price scale: Right-aligned, white text, precision based on data range
- Candlestick colors: upColor #10b981 (green), downColor #ef4444 (red)
- Line series: 2px width, smooth interpolation

**Markers Styling:**
- Position: 'belowBar' for negative (red triangle down), 'aboveBar' for positive (green triangle up)
- Shape: 'arrowDown' or 'arrowUp'
- Color: Matches news type (green/red)
- Text: Short summary (max 20 chars), displayed on hover
- Size: Scale 1.2 for emphasis

**Hover Tooltips:**
- Background: bg-gray-900/95, rounded-md, px-3 py-2
- Border: 1px solid in state color or border-gray-600
- Content: Multi-line with timestamp, value, change percentage
- Font: text-xs font-mono for precise data alignment
- Positioning: Follow cursor with 8-12px offset, boundary aware

### F. Animations

**Use Sparingly - Data Integrity Priority:**

**Permitted Animations:**
- Chart data updates: Smooth transitions over 300-400ms (built into lightweight-charts)
- Modal entry/exit: Scale and fade (scale-95 to scale-100), duration-200
- Hover states: Background color transitions, duration-150
- Value changes: Number counter animation for aggregate index (duration-500, ease-out)

**Forbidden:**
- Chart zoom/pan transitions (should be instant for trading feel)
- Distracting particle effects or decorative motion
- Auto-playing carousels or scrolling effects
- Loading spinners longer than 200ms (prefer skeleton screens)

## Layout Specifications

**Primary Layout:**
```
┌─────────────────────────────────────────┬──────────────┐
│ Top Toolbar (h-16)                      │              │
│ [Logo] [Timeframe Selector]            │              │
├─────────────────────────────────────────┤  Right Panel │
│                                         │   (w-80)     │
│                                         │              │
│   Chart Area (flex-1)                   │  - Checkboxes│
│   [Lightweight Charts Canvas]           │  - Weights   │
│                                         │  - News Btns │
│                                         │  - Metrics   │
│                                         │              │
│                                         │              │
└─────────────────────────────────────────┴──────────────┘
```

**Right Panel Structure:**
1. Aggregate Index Display (large value, trend indicator)
2. Series Toggles (4 checkboxes with colored indicators)
3. Weight Sliders (4 sliders, show current percentage)
4. News Actions (2 prominent buttons stacked vertically)
5. Recent Events List (scrollable, timestamped)

## Accessibility & Polish

- Focus indicators: 2px blue ring with offset-2
- Keyboard navigation: Full support for all interactive elements
- ARIA labels: Comprehensive for screen readers
- Color contrast: All text meets WCAG AA (4.5:1 minimum)
- Touch targets: Minimum 44x44px for mobile (if responsive)
- Error states: Red border + icon + message below input

## Technical Notes

- Chart container must have explicit dimensions (cannot be auto)
- Use ResizeObserver to handle chart responsiveness
- Debounce weight slider changes (300ms) before recalculating aggregate
- Implement optimistic UI updates for news additions
- Cache chart data in memory, sync with backend on interval