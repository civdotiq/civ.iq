# CIV.IQ Design System

**Version 1.0** | December 2025 | Otl Aicher Design Language

---

## Introduction

CIV.IQ implements a design system rooted in the **Ulm School of Design** principles, specifically drawing inspiration from Otl Aicher's work on the 1972 Munich Olympics. This system prioritizes clarity, functionality, and systematic consistency—principles essential for a civic technology platform serving citizens with government data.

### Design Philosophy

> "Design is not making things beautiful. Design is making things work beautifully."
> — Dieter Rams

Our design system embodies three core principles:

1. **Functionalism** — Every element serves a purpose; decoration is eliminated
2. **Systematic Consistency** — Rules and patterns create predictable experiences
3. **Democratic Clarity** — Information is accessible to all citizens regardless of ability

---

## Table of Contents

1. [Color System](#1-color-system)
2. [Typography](#2-typography)
3. [Spacing & Grid](#3-spacing--grid)
4. [Borders & Depth](#4-borders--depth)
5. [Components](#5-components)
6. [Motion & Animation](#6-motion--animation)
7. [Responsive Design](#7-responsive-design)
8. [Accessibility](#8-accessibility)
9. [Iconography](#9-iconography)
10. [Implementation Reference](#10-implementation-reference)

---

## 1. Color System

### Brand Colors

CIV.IQ uses a **strictly limited palette** of three brand colors plus grayscale. This constraint ensures visual consistency and reinforces our identity across all touchpoints.

| Color     | Hex Value | CSS Variable     | Usage                                         |
| --------- | --------- | ---------------- | --------------------------------------------- |
| **Red**   | `#e11d07` | `--aicher-red`   | Errors, House chamber, high-emphasis CTAs     |
| **Green** | `#0a9338` | `--aicher-green` | Success states, Senate chamber, confirmations |
| **Blue**  | `#3ea2d4` | `--aicher-blue`  | Links, primary actions, interactive elements  |

```css
:root {
  --aicher-red: #e11d07;
  --aicher-green: #0a9338;
  --aicher-blue: #3ea2d4;
}
```

### Color States

Each brand color has defined states for interactive feedback:

#### Red States

| State   | Hex       | Variable              | Application           |
| ------- | --------- | --------------------- | --------------------- |
| Default | `#e11d07` | `--aicher-red`        | Base state            |
| Hover   | `#c41a06` | `--aicher-red-hover`  | Mouse hover           |
| Active  | `#a31605` | `--aicher-red-active` | Click/press           |
| Muted   | `#f5948a` | `--aicher-red-muted`  | Disabled, backgrounds |

#### Green States

| State   | Hex       | Variable                | Application           |
| ------- | --------- | ----------------------- | --------------------- |
| Default | `#0a9338` | `--aicher-green`        | Base state            |
| Hover   | `#088030` | `--aicher-green-hover`  | Mouse hover           |
| Active  | `#066a28` | `--aicher-green-active` | Click/press           |
| Muted   | `#86d4a5` | `--aicher-green-muted`  | Disabled, backgrounds |

#### Blue States

| State   | Hex       | Variable               | Application           |
| ------- | --------- | ---------------------- | --------------------- |
| Default | `#3ea2d4` | `--aicher-blue`        | Base state            |
| Hover   | `#3293c2` | `--aicher-blue-hover`  | Mouse hover           |
| Active  | `#2a7aa3` | `--aicher-blue-active` | Click/press           |
| Muted   | `#a8d4e8` | `--aicher-blue-muted`  | Disabled, backgrounds |

### Semantic Colors

These colors communicate meaning consistently across the application:

| Purpose | Color           | Variable          | When to Use                          |
| ------- | --------------- | ----------------- | ------------------------------------ |
| Action  | Blue            | `--color-action`  | Buttons, links, interactive elements |
| Success | Green           | `--color-success` | Confirmations, positive outcomes     |
| Error   | Red             | `--color-error`   | Errors, destructive actions          |
| Warning | Amber `#d97706` | `--color-warning` | Cautions, attention needed           |
| Info    | Gray `#4b5563`  | `--color-info`    | Neutral information                  |

### Grayscale Palette

| Name     | Hex       | Usage                     |
| -------- | --------- | ------------------------- |
| Black    | `#000000` | Primary text, borders     |
| Gray 900 | `#111827` | Headings                  |
| Gray 700 | `#374151` | Body text                 |
| Gray 500 | `#6b7280` | Secondary text, icons     |
| Gray 300 | `#d1d5db` | Dividers, disabled states |
| Gray 100 | `#f3f4f6` | Backgrounds, hover states |
| Gray 50  | `#f9fafb` | Subtle backgrounds        |
| White    | `#ffffff` | Cards, containers         |

### Color Usage Rules

1. **No purple, orange, or custom colors** — Only the defined palette
2. **Red for emphasis, not decoration** — Reserve red for important callouts
3. **Blue for interactivity** — Users learn blue = clickable
4. **Green for positive feedback** — Success, confirmations, Senate
5. **Grayscale for content** — Text and structural elements

---

## 2. Typography

### Font Family

**Primary Typeface: Braun Linear**

Designed by Dieter Rams for Braun products, this typeface embodies the same functionalist principles as our design system. It provides excellent legibility at all sizes while maintaining a distinctive, modernist character.

```css
:root {
  --font-primary:
    'Braun Linear', 'Helvetica Neue', 'Helvetica', 'Arial', 'Nimbus Sans L', 'Liberation Sans',
    sans-serif;
}
```

**Available Weights:**

- Thin (100)
- Light (300)
- Regular (400) — Default body text
- Medium (500) — UI elements
- Bold (700) — Headings, emphasis

### Type Scale

Our type scale follows a systematic progression based on functional hierarchy:

| Token         | Size | Rem      | Use Case                   |
| ------------- | ---- | -------- | -------------------------- |
| `--type-xs`   | 12px | 0.75rem  | Labels, metadata, captions |
| `--type-sm`   | 14px | 0.875rem | Small body, UI elements    |
| `--type-base` | 16px | 1rem     | Body text (default)        |
| `--type-lg`   | 18px | 1.125rem | Subheadings, lead text     |
| `--type-xl`   | 24px | 1.5rem   | Section headers            |
| `--type-2xl`  | 32px | 2rem     | Page titles                |
| `--type-3xl`  | 48px | 3rem     | Statistics, numbers        |
| `--type-4xl`  | 64px | 4rem     | Hero display, names        |

### Letter Spacing (Tracking)

Letter spacing varies inversely with font size—a core principle of professional typography:

| Context           | Tracking | Variable             | Rationale                      |
| ----------------- | -------- | -------------------- | ------------------------------ |
| Display (48px+)   | -0.02em  | `--tracking-display` | Tighten large text for impact  |
| Heading (24-32px) | 0.02em   | `--tracking-heading` | Slight opening for readability |
| Body (14-18px)    | 0.05em   | `--tracking-body`    | Standard reading comfort       |
| Label (12px-)     | 0.08em   | `--tracking-label`   | Open small text for legibility |

### Typography Classes

Pre-defined classes for consistent text styling:

#### `.aicher-display`

```css
.aicher-display {
  font-size: var(--type-4xl); /* 64px */
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: var(--tracking-display);
}
```

**Use for:** Representative names, hero headings

#### `.aicher-title`

```css
.aicher-title {
  font-size: var(--type-2xl); /* 32px */
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: var(--tracking-heading);
}
```

**Use for:** Page titles, major section headers

#### `.aicher-heading`

```css
.aicher-heading {
  font-size: var(--type-xl); /* 24px */
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: var(--tracking-heading);
}
```

**Use for:** Section headers, card titles

#### `.aicher-label`

```css
.aicher-label {
  font-size: var(--type-xs); /* 12px */
  font-weight: 700;
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
}
```

**Use for:** Badges, form labels, metadata

#### `.aicher-body`

```css
.aicher-body {
  font-size: var(--type-base); /* 16px */
  font-weight: 400;
  line-height: 1.5;
  letter-spacing: var(--tracking-body);
}
```

**Use for:** Paragraphs, descriptions, general content

### Line Height Guidelines

| Content Type | Line Height | Rationale               |
| ------------ | ----------- | ----------------------- |
| Display text | 1.1         | Tight for visual impact |
| Headings     | 1.2-1.3     | Balanced for scanning   |
| Body text    | 1.5-1.6     | Comfortable reading     |
| UI elements  | 1.25        | Compact but accessible  |

---

## 3. Spacing & Grid

### The 8px Grid

All spacing in CIV.IQ is based on an **8px grid unit**. This creates visual rhythm and ensures elements align predictably across the interface.

```css
:root {
  --grid: 8px;
}
```

### Spacing Scale

| Token     | Value | Calculation | Common Usage                  |
| --------- | ----- | ----------- | ----------------------------- |
| `grid-1`  | 8px   | 1 × 8px     | Tight spacing, icon gaps      |
| `grid-2`  | 16px  | 2 × 8px     | List item padding, small gaps |
| `grid-3`  | 24px  | 3 × 8px     | Component internal spacing    |
| `grid-4`  | 32px  | 4 × 8px     | Card padding, form spacing    |
| `grid-5`  | 40px  | 5 × 8px     | **Section gaps** (primary)    |
| `grid-6`  | 48px  | 6 × 8px     | Large component spacing       |
| `grid-8`  | 64px  | 8 × 8px     | Hero sections, major breaks   |
| `grid-10` | 80px  | 10 × 8px    | Page-level spacing            |
| `grid-12` | 96px  | 12 × 8px    | Maximum section gaps          |

### Density Contexts

Different interfaces require different spacing densities:

#### Default Density

```css
.density-default {
  --section-gap: 40px; /* grid-5 */
  --card-padding: 32px; /* grid-4 */
}
```

**Use for:** Standard pages, detail views

#### Compact Density

```css
.density-compact {
  --section-gap: 24px; /* grid-3 */
  --card-padding: 24px; /* grid-3 */
}
```

**Use for:** Data-dense tables, lists, dashboards

#### Detailed Density

```css
.density-detailed {
  --section-gap: 56px; /* grid-7 */
  --card-padding: 40px; /* grid-5 */
}
```

**Use for:** Landing pages, marketing content

### Layout Patterns

#### Page Container

```css
.page-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 var(--grid-4); /* 32px horizontal */
}
```

#### Section Spacing

```css
.section {
  margin-bottom: var(--section-gap); /* 40px default */
}
```

#### Card Grid

```css
.card-grid {
  display: grid;
  gap: var(--grid-4); /* 32px */
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}
```

### Spacing Rules

1. **Always use grid multiples** — Never use arbitrary values like 13px or 27px
2. **40px section gaps** — Standard vertical rhythm between major sections
3. **32px card padding** — Comfortable internal spacing for containers
4. **16px list spacing** — Vertical padding for list items
5. **8px minimum** — Smallest spacing unit for tight arrangements

---

## 4. Borders & Depth

### The No-Shadow Principle

> **Borders replace shadows.** This is a fundamental Ulm School principle.

CIV.IQ creates visual hierarchy through border weight, not drop shadows. This approach:

- Maintains clarity at all screen densities
- Reduces visual noise
- Aligns with our functionalist philosophy

### Border Weights

| Weight     | Pixels | Variable              | Application                  |
| ---------- | ------ | --------------------- | ---------------------------- |
| Structural | 2px    | `--border-structural` | Cards, containers, emphasis  |
| Divider    | 1px    | `--border-divider`    | List separators, table rows  |
| Emphasis   | 3px    | `--border-emphasis`   | Active tabs, selected states |

```css
:root {
  --border-structural: 2px;
  --border-divider: 1px;
  --border-emphasis: 3px;
}
```

### High-DPI Adjustment

```css
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  --border-divider: 0.5px; /* Hairline on retina displays */
}
```

### Border Colors

| Purpose     | Color             | Usage               |
| ----------- | ----------------- | ------------------- |
| Default     | `#000000` (black) | Primary borders     |
| Subtle      | `#e5e5e5` (gray)  | Dividers, inputs    |
| Interactive | `--aicher-blue`   | Hover states, focus |
| Error       | `--aicher-red`    | Validation errors   |
| Success     | `--aicher-green`  | Confirmation states |

### Border Patterns

#### Standard Card

```css
.card {
  border: 2px solid #000000;
  background: white;
}

.card:hover {
  border-color: var(--aicher-blue);
}
```

#### Accent Bar Pattern

```css
.accent-card {
  border: 2px solid #000000;
  position: relative;
}

.accent-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--aicher-red);
}
```

#### Data List Pattern

```css
.data-list {
  border-top: 2px solid #000000;
}

.data-list-item {
  padding: 16px 0;
  border-bottom: 2px solid #000000;
}
```

---

## 5. Components

### Buttons

Buttons communicate interactivity and guide users toward actions.

#### Variants

| Variant       | Appearance             | Use Case            |
| ------------- | ---------------------- | ------------------- |
| **Primary**   | Blue fill, white text  | Main actions, CTAs  |
| **Secondary** | Gray border, gray text | Alternative actions |
| **Ghost**     | Transparent, gray text | Tertiary actions    |
| **Danger**    | Red fill, white text   | Destructive actions |

#### Primary Button

```css
.btn-primary {
  background: var(--aicher-blue);
  color: white;
  border: 2px solid var(--aicher-blue);
  padding: 12px 24px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  transition: all 150ms ease;
}

.btn-primary:hover {
  background: white;
  color: var(--aicher-blue);
}
```

#### Sizes

| Size   | Padding   | Min Height | Use Case               |
| ------ | --------- | ---------- | ---------------------- |
| Small  | 6px 12px  | 32px       | Inline actions, tables |
| Medium | 12px 24px | 44px       | Standard buttons       |
| Large  | 16px 32px | 52px       | Hero CTAs, emphasis    |

#### High-Emphasis CTA

```css
.aicher-button-high-emphasis {
  display: block;
  width: 100%;
  padding: 16px 24px;
  background: var(--aicher-blue);
  color: white;
  border: 2px solid var(--aicher-blue);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  text-align: center;
}

.aicher-button-high-emphasis:hover {
  background: white;
  color: var(--aicher-blue);
}
```

### Cards

Cards are the primary container for grouped content.

#### Standard Card

```tsx
<Card padding="md" interactive={false}>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>{/* Content */}</CardContent>
  <CardFooter>{/* Actions */}</CardFooter>
</Card>
```

#### Styles

```css
.card {
  background: white;
  border: 2px solid #000000;
  transition: all 200ms ease;
}

.card:hover {
  border-color: var(--aicher-blue);
  transform: translateY(-2px);
}

.card-header {
  border-bottom: 1px solid #e5e5e5;
  padding-bottom: 16px;
}

.card-footer {
  border-top: 1px solid #e5e5e5;
  padding-top: 16px;
  margin-top: 16px;
}
```

#### Metric Card

For displaying statistics and KPIs:

```css
.aicher-metric-card {
  background: white;
  border: 2px solid #000000;
  position: relative;
  padding: 24px;
}

.aicher-metric-accent-bar {
  position: absolute;
  top: 0;
  left: 0;
  width: 6px;
  height: 100%;
  background: var(--aicher-red);
}

.aicher-metric-value {
  font-size: 48px;
  font-weight: 700;
  line-height: 1.1;
}

.aicher-metric-label {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #6b7280;
}
```

### Badges

Badges communicate status, categories, or metadata.

#### Variants

| Variant | Background  | Text     | Use Case              |
| ------- | ----------- | -------- | --------------------- |
| Default | Gray 100    | Gray 700 | Neutral labels        |
| Success | Green muted | Green    | Positive status       |
| Warning | Amber muted | Amber    | Caution               |
| Danger  | Red muted   | Red      | Errors, Republican    |
| Info    | Blue muted  | Blue     | Information, Democrat |

#### Styles

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-radius: 0; /* No rounded corners */
}

.badge-success {
  background: var(--aicher-green-muted);
  color: var(--aicher-green);
}

.badge-danger {
  background: var(--aicher-red-muted);
  color: var(--aicher-red);
}

.badge-info {
  background: var(--aicher-blue-muted);
  color: var(--aicher-blue);
}
```

#### Party Badges

```tsx
<PartyBadge party="Republican" />  // Renders danger variant
<PartyBadge party="Democrat" />    // Renders info variant
```

### Tabs

Navigation between related content sections.

```css
.aicher-tabs {
  background: #f9fafb;
  border-bottom: 2px solid #000000;
}

.aicher-tab {
  padding: 16px 24px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 14px;
  border-right: 2px solid #000000;
  min-height: 48px;
  transition: all 200ms ease;
}

.aicher-tab:hover:not(.active) {
  background: #e5e7eb;
}

.aicher-tab.active {
  background: var(--aicher-red);
  color: white;
}
```

### Inputs

Form inputs for user data entry.

```css
input[type='text'],
input[type='email'],
input[type='search'] {
  border: 1px solid #e5e5e5;
  padding: 12px 16px;
  font-size: 16px;
  transition: all 200ms ease;
}

input:focus {
  border-color: var(--aicher-blue);
  outline: none;
  box-shadow: 0 0 0 2px rgba(62, 162, 212, 0.2);
}

input:invalid {
  border-color: var(--aicher-red);
}
```

### Data Lists

For displaying structured information without nested boxes.

```css
.aicher-data-list {
  border-top: 2px solid #000000;
}

.aicher-data-list-item {
  padding: 16px 0;
  border-bottom: 2px solid #000000;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.aicher-data-list-item:hover {
  background-color: #f9fafb;
  margin-left: -16px;
  margin-right: -16px;
  padding-left: 16px;
  padding-right: 16px;
}
```

---

## 6. Motion & Animation

### Timing

All animations use a consistent timing function:

```css
:root {
  --timing-aicher: cubic-bezier(0.25, 0.1, 0.25, 1);
  --duration-default: 150ms;
  --duration-mobile: 100ms;
}
```

### Standard Transitions

| Property      | Duration | Use Case            |
| ------------- | -------- | ------------------- |
| Color changes | 150ms    | Hover states, focus |
| Transform     | 200ms    | Lifts, slides       |
| Opacity       | 300ms    | Fade in/out         |
| Complex       | 400ms    | Page transitions    |

### Animation Classes

#### Fade In Up

```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in-up {
  animation: fadeInUp 0.4s ease forwards;
}
```

#### Slide In

```css
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
```

#### Loading Shimmer

```css
@keyframes shimmer {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(100%);
  }
}

.skeleton {
  background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

### Animation Delays

Stagger entrance animations for lists:

```css
.animation-delay-100 {
  animation-delay: 0.1s;
}
.animation-delay-200 {
  animation-delay: 0.2s;
}
.animation-delay-300 {
  animation-delay: 0.3s;
}
/* ... through 1000ms */
```

### Reduced Motion

Always respect user preferences:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 7. Responsive Design

### Breakpoints

| Name  | Width  | Target Devices           |
| ----- | ------ | ------------------------ |
| `sm`  | 640px  | Large phones (landscape) |
| `md`  | 768px  | Tablets                  |
| `lg`  | 1024px | Small laptops            |
| `xl`  | 1280px | Desktops                 |
| `2xl` | 1536px | Large displays           |

### Mobile-First Approach

CIV.IQ is designed mobile-first. Base styles target phones; larger breakpoints add complexity.

```css
/* Mobile (default) */
.section {
  padding: 24px 16px;
}

/* Tablet and up */
@media (min-width: 768px) {
  .section {
    padding: 40px 32px;
  }
}

/* Desktop and up */
@media (min-width: 1024px) {
  .section {
    padding: 64px 48px;
  }
}
```

### Touch Targets

All interactive elements must meet minimum touch target sizes:

| Element   | Minimum Size  | Reasoning              |
| --------- | ------------- | ---------------------- |
| Buttons   | 44px height   | iOS HIG recommendation |
| Links     | 44px tap area | Accessible touch       |
| Inputs    | 44px height   | Prevents iOS zoom      |
| Tab items | 48px height   | Comfortable navigation |

```css
@media (max-width: 768px) {
  button,
  [role='button'] {
    min-height: 44px;
  }

  input,
  select,
  textarea {
    min-height: 44px;
    font-size: 16px; /* Prevents iOS zoom */
  }
}
```

### Mobile Typography Adjustments

```css
@media (max-width: 768px) {
  :root {
    --tracking-display: -0.03em; /* Tighter on mobile */
    --tracking-heading: 0.01em;
    --tracking-body: 0.04em;
    --tracking-label: 0.06em;
  }
}
```

### Horizontal Scrolling

For tabs and data tables on mobile:

```css
@media (max-width: 768px) {
  .aicher-tabs nav {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .data-table-wrapper {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
}
```

---

## 8. Accessibility

CIV.IQ is committed to WCAG 2.1 AA compliance.

### Focus States

All interactive elements have visible focus indicators:

```css
:focus {
  outline: none;
}

:focus-visible {
  outline: 2px solid var(--aicher-blue);
  outline-offset: 2px;
  border-radius: 4px;
}
```

### Color Contrast

All text meets minimum contrast ratios:

| Context            | Ratio Required | Our Implementation   |
| ------------------ | -------------- | -------------------- |
| Normal text        | 4.5:1          | Black on white: 21:1 |
| Large text (24px+) | 3:1            | Verified             |
| UI components      | 3:1            | Blue/white: 4.6:1    |

### ARIA Implementation

```tsx
// Button with loading state
<Button
  aria-busy={isLoading}
  aria-disabled={isDisabled}
>
  {isLoading ? 'Loading...' : 'Submit'}
</Button>

// Search input
<Input
  role="search"
  aria-label="Search representatives"
/>

// Interactive card
<Card
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={handleKeyDown}
>
  {content}
</Card>
```

### Keyboard Navigation

All interactive elements are keyboard accessible:

- **Tab** — Move between focusable elements
- **Enter/Space** — Activate buttons, links
- **Arrow keys** — Navigate within components (tabs, menus)
- **Escape** — Close modals, dropdowns

### Screen Reader Support

```tsx
// Visually hidden but screen reader accessible
<span className="sr-only">
  Loading content, please wait
</span>

// Live regions for dynamic content
<div aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>
```

### High Contrast Mode

```css
@media (prefers-contrast: high) {
  .card {
    border-width: 2px;
    border-color: #000000;
  }

  .btn-primary {
    border: 2px solid currentColor;
  }
}
```

---

## 9. Iconography

### Icon Library

CIV.IQ uses **Lucide React** for consistent, accessible icons.

### Sizing

| Size   | Pixels | Use Case                 |
| ------ | ------ | ------------------------ |
| Small  | 16px   | Inline with text, badges |
| Medium | 20px   | Buttons, list items      |
| Large  | 24px   | Section headers          |
| XL     | 32px   | Empty states, features   |

### Icon + Text Pairing

```tsx
<button className="flex items-center gap-2">
  <Search size={20} aria-hidden="true" />
  <span>Search</span>
</button>
```

### Accessibility

Icons must either:

1. Be decorative with `aria-hidden="true"`
2. Have descriptive `aria-label` for icon-only buttons

```tsx
// Decorative icon (text provides meaning)
<span aria-hidden="true"><Check /></span> Success

// Meaningful icon-only button
<button aria-label="Close dialog">
  <X aria-hidden="true" />
</button>
```

---

## 10. Implementation Reference

### File Locations

| Purpose              | File Path                             |
| -------------------- | ------------------------------------- |
| Master Design System | `src/styles/aicher-system.css`        |
| Global Styles        | `src/app/globals.css`                 |
| Tailwind Config      | `tailwind.config.ts`                  |
| Button Component     | `src/shared/components/ui/Button.tsx` |
| Card Component       | `src/shared/components/ui/Card.tsx`   |
| Badge Component      | `src/shared/components/ui/Badge.tsx`  |
| Input Component      | `src/shared/components/ui/Input.tsx`  |

### CSS Custom Properties Summary

```css
:root {
  /* Colors */
  --aicher-red: #e11d07;
  --aicher-green: #0a9338;
  --aicher-blue: #3ea2d4;

  /* Typography */
  --font-primary: 'Braun Linear', sans-serif;
  --type-base: 1rem;
  --tracking-body: 0.05em;

  /* Spacing */
  --grid: 8px;
  --section-gap: 40px;
  --card-padding: 32px;

  /* Borders */
  --border-structural: 2px;
  --border-divider: 1px;

  /* Motion */
  --timing-aicher: cubic-bezier(0.25, 0.1, 0.25, 1);
  --duration-default: 150ms;
}
```

### Tailwind Utilities

```typescript
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      'civiq-red': '#e11d07',
      'civiq-green': '#0a9338',
      'civiq-blue': '#3ea2d4',
    },
    spacing: {
      'grid-1': '8px',
      'grid-2': '16px',
      'grid-4': '32px',
      'grid-5': '40px',
    },
    fontFamily: {
      sans: ['Braun Linear', 'sans-serif'],
    },
  },
}
```

---

## Design Principles Summary

1. **Functionalism** — Every element serves a purpose
2. **8px Grid** — All spacing uses grid multiples
3. **Geometric Purity** — Rectangles, squares, circles only
4. **High Contrast** — Black/white base with signal colors
5. **Limited Palette** — Only red, green, blue + grayscale
6. **Borders Over Shadows** — 2px borders create depth
7. **Whitespace Hierarchy** — Spacing creates visual grouping
8. **Systematic Typography** — Size-dependent letter spacing
9. **Motion Discipline** — 150ms transitions, respect reduced motion
10. **Accessibility First** — WCAG 2.1 AA compliance

---

## Credits & Inspiration

- **Otl Aicher** — 1972 Munich Olympics visual identity
- **Dieter Rams** — Braun design principles, 10 principles of good design
- **Ulm School of Design** — Functionalist methodology
- **NS Dutch Railways (Tractie)** — Design system documentation approach

---

_Last updated: December 2025_
_Version: 1.0_
