---
name: DealFlow Operations System
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf2'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d8e3fb'
  on-surface: '#111c2d'
  on-surface-variant: '#42474f'
  inverse-surface: '#263143'
  inverse-on-surface: '#ecf1ff'
  outline: '#727781'
  outline-variant: '#c2c7d1'
  surface-tint: '#2a6198'
  primary: '#115086'
  on-primary: '#ffffff'
  primary-container: '#3368a0'
  on-primary-container: '#d5e5ff'
  inverse-primary: '#a0c9ff'
  secondary: '#22657f'
  on-secondary: '#ffffff'
  secondary-container: '#a2e0fe'
  on-secondary-container: '#20647e'
  tertiary: '#3d524f'
  on-tertiary: '#ffffff'
  tertiary-container: '#556a67'
  on-tertiary-container: '#d2e9e5'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d2e4ff'
  primary-fixed-dim: '#a0c9ff'
  on-primary-fixed: '#001c37'
  on-primary-fixed-variant: '#01497f'
  secondary-fixed: '#bee9ff'
  secondary-fixed-dim: '#92cfec'
  on-secondary-fixed: '#001f2a'
  on-secondary-fixed-variant: '#004d64'
  tertiary-fixed: '#d0e7e3'
  tertiary-fixed-dim: '#b4cbc7'
  on-tertiary-fixed: '#0a1f1d'
  on-tertiary-fixed-variant: '#364b48'
  background: '#f9f9ff'
  on-background: '#111c2d'
  surface-variant: '#d8e3fb'
typography:
  page-title:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.02em
  page-title-mobile:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  section-heading:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  card-heading:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
  metric-display:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  metric-display-compact:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  body-large:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-text:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  button-text:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  input-label:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  table-text:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  table-header:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.04em
  status-badge:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  helper-caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  space-2xs: 0.25rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 1.25rem
  space-xl: 1.5rem
  space-2xl: 2rem
  space-3xl: 2.5rem
  gutter: 1rem
  margin-desktop: 1.5rem
  margin-mobile: 1rem
---

## Brand & Style

This design system serves high-velocity B2B revenue operations, sales leadership, and pipeline analysts. The visual language balances institutional rigor with contemporary utility. It emphasizes clarity over ornamentation, prioritizing high data density, rapid scan-ability, and visual ergonomics over long working sessions.

The aesthetic philosophy centers on **Corporate Modernism with Warm Utility**:
- **Controlled Density:** Layouts maximize screen real estate without feeling cluttered, using calibrated gutters and tabular alignments.
- **Editorial Subtlety:** Crisp, structural dividers replace heavy dropped shadows or flashy translucent planes.
- **Organic Substrate:** A gentle parchment-tinted canvas softens harsh screen glare, establishing a dignified, dependable atmosphere for deal tracking and revenue forecasting.
- **Precision Typography:** Monospaced data readouts and balanced geometric sans typography ensure immediate numerical comprehension.

## Colors

The palette establishes hierarchical focus through varying saturations of slate, steel blue, and muted mineral tones layered over a warm, tactile foundation:

- **Primary Blue (`#3368A0`)**: Designated for primary interactive nodes, active navigation markers, pipeline conversion buttons, and focused inputs.
- **Secondary Blue (`#66A3BF`)**: Deployed for secondary metrics, stage markers, interactive chart series, and contextual tools.
- **Soft Teal (`#C8DFDB`)**: Utilized as a tint for low-contrast alert surfaces, positive trend indicators, table row highlights, and informational chips.
- **Warm Canvas (`#F2EFE7`)**: The primary application backdrop, establishing an anti-glare operational foundation.
- **Card & Surface Background (`#FFFFFF` & `#F9F8F5`)**: High-contrast white surfaces for isolated data cards, with warm-tinted neutral fills for embedded toolbars and table headers.
- **Text Layers**:
  - Primary Slate (`#1E293B`): High-legibility body, titles, and key metrics.
  - Secondary Slate (`#475569`): Labels, descriptions, and structural table text.
  - Muted Slate (`#94A3B8`): Disabled states, helper text, and inactive iconography.
- **Dividers & Borders**: `#E2DDD5` (primary cell and card container stroke) and `#D8D2C5` (accent divider for interactive states and header delineations).

## Typography

Inter serves as the single typographic foundation across all visual hierarchy levels to guarantee consistency and clarity across high-density tables, forms, and charts.

- **Numerics**: Enable tabular lining figures (`font-feature-settings: 'tnum' on, 'cv05' on`) across metrics, financial values, and table cells to ensure columns align cleanly.
- **Table Headers**: Set in uppercase with `0.04em` tracking to distinguish field labels from data rows.
- **Headings & Hierarchy**: Weights are constrained strictly to `400` (Regular), `500` (Medium), and `600` (Semi-Bold) to maintain a lean, functional visual hierarchy without arbitrary heavy weights.

## Layout & Spacing

The layout is built upon a 12-column responsive fluid grid structured for dense information architecture and multi-pane analytical dashboards:

- **Desktop (1280px+)**: Multi-pane layout consisting of an 80px collapsed or 240px expanded global navigation bar, a sub-navigation or filter shelf, and an active operational canvas with `1.5rem` outside margins and `1rem` column gutters.
- **Tablet (768px - 1279px)**: Collapsed navigation rail (64px), single-column dashboard cards stacking to 2 columns where appropriate, gutters fixed at `1rem`.
- **Mobile (<768px)**: Single-column reflow, top app bar with sheet navigation, full-width data tables converted to horizontally scrollable viewports or stacked card rows, outside margin reduced to `1rem`.
- **Vertical Rhythm**: Built strictly around a 4px baseline sub-grid. Form rows, table cell heights (`40px` dense, `48px` standard), and toolbar controls conform to exact multiples of 4px.

## Elevation & Depth

This design system avoids heavy drop shadows, neon glows, and glassy transparency, relying on a tactile, structural surface layering model:

- **Surface Tiers**:
  - `Layer 0 (Canvas)`: `#F2EFE7` — The structural background.
  - `Layer 1 (Card & Module)`: `#FFFFFF` — Inset dashboards, data tables, and inspection panes bounded by a 1px border of `#E2DDD5`.
  - `Layer 2 (Inset Controls)`: `#F9F8F5` — Inactive table headers, metric grouping cards, and search inputs.
- **Structural Separation**: Division is established via 1px crisp rules (`#E2DDD5` standard, `#D8D2C5` for structural columns) rather than cast shadows.
- **Floating Overlays**: Modals, popovers, and contextual action menus utilize a single, restrained ambient shadow: `0 4px 12px -2px rgba(30, 41, 59, 0.08), 0 2px 6px -1px rgba(30, 41, 59, 0.04)` combined with an explicit 1px stroke (`#D8D2C5`).

## Shapes

The design uses a compact, disciplined corner radius profile (Level 1 - Soft) to maintain structural density and precision:

- **Base Radius (0.25rem / 4px)**: Applied to buttons, inputs, table row highlights, tabs, and status badges. This maintains clean alignment lines across large tables and input groups.
- **Medium Radius (0.375rem / 6px)**: Applied to standalone cards, metric tiles, context menus, and modal dialogs.
- **Circular Indicators**: Status dot markers and avatar chips use 9999px pill rounding.

## Components

### Buttons
- **Primary**: Solid `#3368A0` background, `#FFFFFF` text, `4px` radius, `0 1px 2px rgba(0,0,0,0.05)` baseline shadow. On hover: `#2B5888`. On active: `#23476E`.
- **Secondary**: `#FFFFFF` background, `1px solid #D8D2C5`, text `#1E293B`. On hover: `#F9F8F5` with border `#94A3B8`.
- **Ghost/Tertiary**: Transparent fill, `#475569` text. On hover: `#E2DDD5` background tint with `#1E293B` text.
- **Dimensions**: Standard height `36px` (padding `8px 14px`), Compact height `30px` (padding `5px 10px`) for table action bars.

### Data Tables
- **Header Cells**: 36px height, background `#F9F8F5`, uppercase `12px/600` text in `#475569`, border-bottom `1px solid #D8D2C5`.
- **Body Rows**: 44px standard height (36px high-density toggle), background `#FFFFFF`, text `13px/400` in `#1E293B`. Separated by `1px solid #E2DDD5`.
- **Row States**: Hover triggers `#F9F8F5` fill; active/selected row triggers `#F2EFE7` with a 2px left border accent in `#3368A0`.

### Status Badges & Chips
- **Structure**: Height 22px, `4px` radius, inline padding `6px 8px`, `12px/500` typography.
- **Pipeline Active / In Progress**: `#66A3BF` background at 15% opacity, `#2B5888` text.
- **Qualified / Closed Won**: `#C8DFDB` background, `#174E43` text.
- **At Risk / Inactive**: `#F2EFE7` background, `1px solid #D8D2C5`, `#475569` text.

### Form Inputs & Controls
- **Fields**: 36px height, `#FFFFFF` background, `1px solid #D8D2C5`, text `14px/400` `#1E293B`, `4px` radius.
- **Focused State**: Border `#3368A0`, outline `2px solid rgba(51, 104, 160, 0.20)`.
- **Checkboxes & Radios**: 16px square/circle, `1px solid #94A3B8` border, checked fill `#3368A0` displaying sharp contrast check/dot in white.

### Metric KPI Tiles & Cards
- **Card Body**: `#FFFFFF` background, `1px solid #E2DDD5` stroke, `6px` radius, `16px` internal padding.
- **Header**: `13px/500` in `#475569`, flex-aligned with contextual period dropdown or micro-trend chip.
- **Value**: `28px/600` in `#1E293B`, tabular figures.
- **Footer Delta**: `12px/400` text paired with green or red indicator icon, referencing comparison baseline.

### Pipeline Funnel & Stage Nodes
- **Pipeline Track**: Horizontal node chain connected by `1px solid #D8D2C5` lines. Completed stages filled with `#3368A0`, current stage highlighted with `#66A3BF` and white text, future stages styled with `#F2EFE7` background and `#475569` text.