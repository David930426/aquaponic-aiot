# design.md — 智慧魚菜共生 AIoT 監控儀表板
> **Smart Aquaponics AIoT Monitoring Dashboard**  
> Version: 2.0.0 · Next.js 14 (App Router) · TypeScript · shadcn/ui

---

## Table of Contents

1. [Architecture & Ecosystem Overview](#1-architecture--ecosystem-overview)
2. [Layout Blueprint](#2-layout-blueprint)
3. [Design Tokens & Visual Language](#3-design-tokens--visual-language)
4. [Component Library — Built on shadcn/ui](#4-component-library--built-on-shadcnui)
5. [Routing & Page Layouts](#5-routing--page-layouts)
6. [State Management & Lifecycle](#6-state-management--lifecycle)
7. [API Contract Examples](#7-api-contract-examples)
8. [Engineering Constraints](#8-engineering-constraints)

---

## 1. Architecture & Ecosystem Overview

### 1.1 What This App Is

This is a device management and monitoring dashboard for an aquaponics farm. The operator opens it to see all their hardware at a glance — pumps, sensors, feeders, lighting — and can check readings, toggle devices on/off, and respond to AI-generated alerts when something goes wrong.

The visual model is a **left sidebar + main content area** layout, similar to how tools like Linear, Vercel, or Notion look. Clean, white, professional, with a green brand accent. Not a dark-mode server terminal. Not a flashy IoT product demo. Just a well-designed working tool that a farm manager can actually use every day without squinting.

**Who uses it:**
- Farm operators toggling devices and reading live sensor data throughout the day
- Admins reviewing alerts, scheduling feedings, checking historical analytics

---

### 1.2 Tech Stack

| Layer | Choice | Version |
|---|---|---|
| Meta-Framework | Next.js 14 (App Router) | ^14.2 |
| Language | TypeScript | ^5.4 |
| UI Components | **shadcn/ui** | latest |
| Styling | Tailwind CSS | ^3.4 |
| Charts | Recharts | ^2.12 |
| Server State | TanStack Query v5 | ^5.0 |
| Client State | Zustand | ^4.5 |
| Real-time | Native WebSocket + polling fallback | — |
| AI Streaming | `fetch` + `ReadableStream` | — |
| Forms | React Hook Form + Zod | — |
| Icons | Lucide React | ^0.383 |
| Animation | Framer Motion | ^11 |
| Date/Time | date-fns | ^3.6 |
| HTTP Client | Axios (interceptors) | ^1.7 |
| Toast | Sonner | ^1.5 |

**shadcn/ui init:**
```bash
npx shadcn-ui@latest init
# Style: Default
# Base color: Zinc  ← we override with our green tokens
# CSS variables: Yes
# Tailwind config: tailwind.config.ts
# Components dir: components/ui
```

**Components to install:**
```bash
npx shadcn-ui@latest add button card badge input label
npx shadcn-ui@latest add dialog sheet tooltip
npx shadcn-ui@latest add skeleton separator progress
npx shadcn-ui@latest add select dropdown-menu
npx shadcn-ui@latest add alert scroll-area
npx shadcn-ui@latest add table tabs switch
npx shadcn-ui@latest add avatar
```

---

### 1.3 Communication Model

```
┌──────────────────────────────────────────────────────────────┐
│                  Next.js 14 App Router                       │
│   Sidebar + Navbar (Server)   │  Page Content (Client)       │
│   ── static, no data deps ──  │  ── charts, toggles, feeds ──│
└──────────────┬────────────────────────────┬──────────────────┘
               │ REST + WebSocket            │ Server fetch (RSC)
               ▼                             ▼
┌─────────────────────────┐   ┌─────────────────────────────────┐
│  IoT Gateway / MQTT     │   │  Laravel REST API               │
│  Live sensor readings   │   │  /api/devices                   │
│  Device status events   │   │  /api/sensors/live              │
│  WebSocket bridge       │   │  /api/alerts                    │
└─────────────────────────┘   │  /api/schedules                 │
                              │  /api/ai/recommend              │
                              │  /api/history                   │
                              └─────────────────────────────────┘
```

- **Live data** — WebSocket first, 5-second poll fallback
- **Device toggles** — `PATCH /api/devices/:id` mutation, optimistic UI
- **AI suggestions** — streaming SSE from `/api/ai/recommend`
- **Auth** — JWT in memory, HTTP-only refresh cookie, Axios interceptors

---

## 2. Layout Blueprint

This is the most important section. The entire app lives inside a two-column shell: a fixed sidebar on the left and a scrollable main area on the right.

### 2.1 Shell Structure

```
┌──────────────────────────────────────────────────────────────────┐
│ SIDEBAR (fixed, 220px)  │  TOP NAVBAR (sticky, h-14)            │
│                         │  [Search]          [Bell][User][Settings]│
│  [Logo + App Name]      ├──────────────────────────────────────── │
│                         │  MAIN CONTENT AREA (scrollable)        │
│  ● Dashboard            │                                        │
│    Devices              │  <page content>                        │
│    Data Analytics       │                                        │
│    Schedules            │                                        │
│    Alerts               │                                        │
│    Settings             │                                        │
│                         │                                        │
└─────────────────────────┴────────────────────────────────────────┘
```

### 2.2 Shell Component

**File:** `app/(dashboard)/layout.tsx`

```tsx
<div className="flex h-screen overflow-hidden bg-[#F4F6F8]">
  {/* Fixed sidebar */}
  <Sidebar />

  {/* Right column: navbar + scrollable content */}
  <div className="flex flex-col flex-1 overflow-hidden">
    <Topbar />
    <main className="flex-1 overflow-y-auto p-6">
      {children}
    </main>
  </div>
</div>
```

- Sidebar: `w-[220px] flex-shrink-0 bg-white border-r border-[#EAECEF] flex flex-col`
- Topbar: `h-14 bg-white border-b border-[#EAECEF] flex items-center px-6 sticky top-0 z-30`
- Main: `flex-1 overflow-y-auto p-6 bg-[#F4F6F8]`

---

### 2.3 Sidebar Anatomy

```
┌──────────────────────────┐
│  [🌿 icon]               │  ← 40×40 green rounded square icon
│  AquaWatch               │  ← 14px semibold, text-gray-900
│  Device Management       │  ← 11px, text-gray-400
│                          │
│  ─────────────────────   │  ← separator, mt-6 mb-4
│                          │
│  ██ Dashboard       ●    │  ← ACTIVE: bg-[#F0F7F1], text-[#2E7D32], rounded-lg
│     Devices              │  ← inactive: text-gray-500, hover: bg-gray-50
│     Data Analytics       │
│     Schedules            │
│     Alerts               │
│     Settings             │
└──────────────────────────┘
```

**Active nav item:**
- Background: `bg-[#F0F7F1]` (very light green)
- Text: `text-[#2E7D32]` (dark green)
- Icon: same green color
- No border — background fill is the only indicator

**Inactive nav item:**
- Text: `text-gray-500`
- Icon: `text-gray-400`
- Hover: `hover:bg-gray-50 hover:text-gray-700`

**Nav item sizing:** `h-9 px-3 rounded-lg flex items-center gap-2.5 text-sm font-medium cursor-pointer transition-colors`

---

### 2.4 Topbar Anatomy

```
[                Search devices...                    ]    [🔔]  [● Alex Chen ▾]  [⚙ Settings ▾]
       ← shadcn Input with Search icon left addon →        bell   avatar+name        dropdown
```

- Search: `max-w-[380px] w-full` — shadcn `Input` with `Search` Lucide icon as left addon, placeholder "Search devices..."
- Bell: ghost `Button size="icon"` with `Bell` icon, red dot badge for unread alerts (absolute positioned `w-2 h-2 rounded-full bg-red-500 top-1.5 right-1.5`)
- User: shadcn `DropdownMenu` — shows `Avatar` (initials) + user name + `ChevronDown` icon
- Settings: ghost `Button` with `Settings` icon + "Settings" text + `ChevronDown`

---

## 3. Design Tokens & Visual Language

### 3.1 The Look

Looking at the reference design: white cards on a very light gray background, green brand accent, clean typography, no decorative elements. It feels like a serious but friendly product. The green says "nature" and "health." The layout is structured but not rigid.

Key visual rules:
- Cards are white on a `#F4F6F8` background — the contrast is subtle, not stark
- Rounded corners everywhere — `rounded-xl` for cards, `rounded-lg` for nav items, `rounded-full` for badges and toggles
- Shadows are very light — just enough to lift cards off the background
- The green should only appear on active/positive states — don't overuse it
- Status badges use color-matched soft backgrounds (light green, light amber, light blue, light gray)

---

### 3.2 Color Tokens

**File: `app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* ── shadcn/ui required tokens ── */
    --background:             0 0% 96%;        /* #F4F6F8 — page bg */
    --foreground:             220 13% 13%;      /* #1C2128 — primary text */

    --card:                   0 0% 100%;        /* #FFFFFF */
    --card-foreground:        220 13% 13%;

    --popover:                0 0% 100%;
    --popover-foreground:     220 13% 13%;

    --primary:                123 48% 33%;      /* #2E7D32 — brand green */
    --primary-foreground:     0 0% 100%;

    --secondary:              120 8% 95%;       /* #F0F3F0 — light sage */
    --secondary-foreground:   220 13% 20%;

    --muted:                  220 9% 95%;       /* #F0F2F5 */
    --muted-foreground:       220 8% 55%;       /* #818EA0 */

    --accent:                 122 39% 92%;      /* #E8F5E9 — sidebar active bg */
    --accent-foreground:      123 48% 25%;      /* #1B5E20 */

    --destructive:            0 72% 51%;        /* #E53935 */
    --destructive-foreground: 0 0% 100%;

    --border:                 220 13% 91%;      /* #E4E7EC */
    --input:                  220 13% 91%;
    --ring:                   123 48% 33%;

    --radius:                 0.75rem;          /* 12px — card radius */

    /* ── Custom tokens beyond shadcn ── */

    /* Sidebar */
    --sidebar-bg:             #FFFFFF;
    --sidebar-border:         #EAECEF;
    --sidebar-nav-active-bg:  #F0F7F1;
    --sidebar-nav-active-text:#2E7D32;
    --sidebar-nav-idle-text:  #6B7280;
    --sidebar-nav-hover-bg:   #F9FAFB;

    /* Topbar */
    --topbar-bg:              #FFFFFF;
    --topbar-border:          #EAECEF;

    /* Health summary progress bars */
    --progress-track:         #E8F5E9;
    --progress-fill:          #4CAF50;

    /* Device status badges */
    --badge-running-bg:       #E8F5E9;
    --badge-running-text:     #2E7D32;
    --badge-active-bg:        #E8F5E9;
    --badge-active-text:      #2E7D32;
    --badge-calibrating-bg:   #FFF8E1;
    --badge-calibrating-text: #E65100;
    --badge-scheduled-bg:     #E3F2FD;
    --badge-scheduled-text:   #1565C0;
    --badge-idle-bg:          #F3F4F6;
    --badge-idle-text:        #6B7280;
    --badge-on-bg:            #E8F5E9;
    --badge-on-text:          #2E7D32;
    --badge-offline-bg:       #FEF2F2;
    --badge-offline-text:     #B91C1C;

    /* Device icon backgrounds (each sensor type has a tint) */
    --icon-bg-pump:           #E8F5E9;   /* green tint — pumps */
    --icon-bg-sensor:         #E3F2FD;   /* blue tint — sensors */
    --icon-bg-feeder:         #FFF8E1;   /* amber tint — feeders */
    --icon-bg-lighting:       #FFF9C4;   /* yellow tint — lighting */
    --icon-bg-default:        #F3F4F6;   /* gray — everything else */

    /* Toggle switch */
    --toggle-on:              #4CAF50;
    --toggle-off:             #D1D5DB;

    /* Shadows */
    --shadow-card:   0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
    --shadow-panel:  0 4px 12px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.04);
    --shadow-topbar: 0 1px 0 #EAECEF;
  }
}
```

---

### 3.3 Typography

**Fonts:** `Inter` for everything. This is a device management tool — it should feel functional and crisp. No display fonts here. One typeface, multiple weights.

```tsx
// app/layout.tsx
import { Inter } from 'next/font/google'
const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })
```

**Type scale:**

| Role | Size | Weight | Color | Usage |
|---|---|---|---|---|
| Page section title | `18px / 1.1rem` | `600` | `foreground` | "Device Health Summary", "Managed Devices" |
| Card device name | `15px / 0.9375rem` | `600` | `foreground` | "Main Pump", "pH Sensor" |
| Sidebar nav item | `14px / 0.875rem` | `500` | varies | Nav links |
| Health label | `14px / 0.875rem` | `400` | `muted-foreground` | "System Status:" |
| Health value | `14px / 0.875rem` | `600` | `primary` | "Optimal (92%)" |
| Sensor reading label | `12px / 0.75rem` | `400` | `muted-foreground` | "Current reading" |
| Sensor reading value | `20px / 1.25rem` | `600` | `foreground` | "24.5°C", "pH 6.8" |
| Status badge text | `12px / 0.75rem` | `500` | varies | "Running", "Active" |
| Topbar username | `14px / 0.875rem` | `500` | `foreground` | "Alex Chen" |
| Timestamp / caption | `12px / 0.75rem` | `400` | `muted-foreground` | "Updated 3s ago" |

---

### 3.4 Spacing Rules

8px base grid. Tailwind spacing maps directly:

| Space | px | Tailwind | Use |
|---|---|---|---|
| XS | 4px | `p-1` / `gap-1` | Inside badges |
| SM | 8px | `p-2` / `gap-2` | Between badge icon and text |
| MD | 12px | `p-3` / `gap-3` | Nav item padding |
| LG | 16px | `p-4` / `gap-4` | Card inner padding top/bottom |
| XL | 20px | `p-5` | Card inner padding (default) |
| 2XL | 24px | `p-6` | Main content padding |

**Card padding:** `p-5` (20px) uniformly. Don't mix `p-4` and `p-5` in the same row.

---

### 3.5 Animations

Keep them minimal — this is a working tool, not a portfolio site.

```css
@layer utilities {
  @keyframes toggle-on {
    from { transform: translateX(0); }
    to   { transform: translateX(20px); }
  }

  @keyframes value-update {
    0%   { opacity: 0.4; }
    100% { opacity: 1; }
  }

  @keyframes progress-fill {
    from { width: 0%; }
    to   { width: var(--progress-target); }
  }

  @keyframes shimmer {
    0%   { background-position: -200% 0; }
    100% { background-position:  200% 0; }
  }

  .animate-value-update { animation: value-update 0.3s ease-out; }
  .animate-progress-fill { animation: progress-fill 0.8s ease-out forwards; }

  @media (prefers-reduced-motion: reduce) {
    .animate-value-update,
    .animate-progress-fill { animation: none; }
  }
}
```

---

## 4. Component Library — Built on shadcn/ui

> **Rule:** shadcn component first, always. Only write custom components when you need something shadcn genuinely doesn't have — like the `DeviceCard` toggle pattern or the `HealthSummaryCard` with a progress bar.

---

### 4.1 shadcn Atoms — Usage Notes

#### `Button`

| Variant | Use case |
|---|---|
| `default` | Primary CTA — "Save Settings", "Add Device" |
| `outline` | Secondary — "Export", "Cancel" |
| `ghost` | Icon buttons in topbar (bell, settings), sidebar (if needed) |
| `destructive` | Dangerous confirms — "Delete Device" |

All icon-only buttons get `size="icon"` + `aria-label`. Never render a bare icon in a button without a label.

#### `Switch` (shadcn)

This is the device toggle in every `DeviceCard`. shadcn's `Switch` is already accessible (keyboard operable, ARIA role=switch). Style override for our brand green:

```css
/* globals.css — override shadcn Switch colors */
.switch-root[data-state="checked"] {
  background-color: var(--toggle-on);
}
.switch-root[data-state="unchecked"] {
  background-color: var(--toggle-off);
}
```

Or set directly in `components/ui/switch.tsx` (which you own after `shadcn add switch`):
```tsx
// In the Switch component, update the className:
"data-[state=checked]:bg-[#4CAF50] data-[state=unchecked]:bg-[#D1D5DB]"
```

#### `Progress` (shadcn)

Used in `HealthSummaryCard`. Style the indicator to use our green:
```tsx
// In components/ui/progress.tsx, update the indicator className:
"bg-[#4CAF50]"  // replaces default primary color
```

#### `Badge` (shadcn)

Device status badges are shadcn `Badge` with custom `className` per status. Never add new variants to the shadcn file — just override via `className`.

```tsx
const deviceStatusStyles: Record<DeviceStatus, string> = {
  running:     'bg-[#E8F5E9] text-[#2E7D32] border-transparent hover:bg-[#E8F5E9]',
  active:      'bg-[#E8F5E9] text-[#2E7D32] border-transparent hover:bg-[#E8F5E9]',
  calibrating: 'bg-[#FFF8E1] text-[#E65100] border-transparent hover:bg-[#FFF8E1]',
  scheduled:   'bg-[#E3F2FD] text-[#1565C0] border-transparent hover:bg-[#E3F2FD]',
  idle:        'bg-[#F3F4F6] text-[#6B7280] border-transparent hover:bg-[#F3F4F6]',
  on:          'bg-[#E8F5E9] text-[#2E7D32] border-transparent hover:bg-[#E8F5E9]',
  offline:     'bg-[#FEF2F2] text-[#B91C1C] border-transparent hover:bg-[#FEF2F2]',
}

<Badge className={cn('text-xs font-medium px-2 py-0.5 rounded-full', deviceStatusStyles[device.status])}>
  {deviceStatusLabel[device.status]}
</Badge>
```

#### `Skeleton` (shadcn)

Works out of the box with our `--muted` token. Use everywhere data is loading.

#### `Avatar` (shadcn)

Topbar user avatar. Shows initials (`AvatarFallback`) when no image. Size `h-8 w-8`.

---

### 4.2 Molecules (Our Custom Composites)

#### `HealthSummaryCard`
**File:** `components/molecules/HealthSummaryCard.tsx`

The three cards in the "Device Health Summary" row. Each shows a metric name, a value with color, and a progress bar.

```tsx
interface HealthSummaryCardProps {
  label:      string   // "System Status"
  value:      string   // "Optimal (92%)"
  percent:    number   // 92 — drives the progress bar width
  isLoading?: boolean
}
```

**Layout (matches reference image exactly):**
```
┌──────────────────────────────────────────────────────┐
│                                                      │
│  System Status:             Optimal (92%)            │
│                                                      │
│  ████████████████████████████████░░░░░░░░            │  ← Progress bar
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Implementation:**
```tsx
<Card className="shadow-[var(--shadow-card)] border-border">
  <CardContent className="p-5">
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm text-muted-foreground">{label}:</span>
      <span className="text-sm font-semibold text-[#2E7D32]">{value}</span>
    </div>
    <Progress
      value={percent}
      className="h-1.5 bg-[#E8F5E9]"
      // indicator color overridden to #4CAF50 in components/ui/progress.tsx
    />
  </CardContent>
</Card>
```

- Progress bar height: `h-1.5` (6px). Same as reference.
- Label text: `text-sm text-muted-foreground`
- Value text: `text-sm font-semibold text-[#2E7D32]`
- On mount, animate from 0% → `percent` using `animate-progress-fill`

**Skeleton state:**
```tsx
<Card className="shadow-[var(--shadow-card)] border-border">
  <CardContent className="p-5">
    <div className="flex justify-between mb-3">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-4 w-20" />
    </div>
    <Skeleton className="h-1.5 w-full rounded-full" />
  </CardContent>
</Card>
```

---

#### `DeviceCard`
**File:** `components/molecules/DeviceCard.tsx`

This is the main card in the "Managed Devices" grid. Each device gets one. Built on shadcn `Card`.

```tsx
type DeviceStatus = 'running' | 'active' | 'calibrating' | 'scheduled' | 'idle' | 'on' | 'offline'
type DeviceType = 'pump' | 'sensor_temp' | 'sensor_ph' | 'sensor_level' | 'feeder' | 'lighting' | 'aeration'

interface DeviceCardProps {
  id:          string
  name:        string         // "Water Temp Sensor", "Main Pump"
  deviceType:  DeviceType
  status:      DeviceStatus
  isEnabled:   boolean        // drives the Toggle switch
  reading?: {
    label: string             // "Current reading", "Level", "Next Feed time", "Brightness"
    value: string             // "24.5°C", "85%", "14:00", "70%"
  }
  isLoading?:  boolean
  onToggle:    (id: string, enabled: boolean) => void
}
```

**Layout (matches reference image exactly):**
```
┌───────────────────────────────────────┐
│                                       │
│  [  icon  ]                           │  ← 40×40 rounded-xl icon bg
│                                       │
│  Water Temp Sensor                    │  ← 15px semibold
│  [Active]                             │  ← status badge
│                                       │
│  Current reading                      │  ← 12px muted (only if reading exists)
│  24.5°C                               │  ← 20px semibold
│                                 [⬤━━]│  ← Toggle, bottom right, shadcn Switch
└───────────────────────────────────────┘
```

**Device icon system:** Each `deviceType` gets a specific Lucide icon and a background tint color:

| deviceType | Lucide Icon | Icon bg token |
|---|---|---|
| `pump` | `Gauge` | `--icon-bg-pump` (#E8F5E9) |
| `aeration` | `Wind` | `--icon-bg-pump` (#E8F5E9) |
| `sensor_temp` | `Thermometer` | `--icon-bg-sensor` (#E3F2FD) |
| `sensor_ph` | `FlaskConical` | `--icon-bg-sensor` (#E3F2FD) |
| `sensor_level` | `Droplets` | `--icon-bg-sensor` (#E3F2FD) |
| `feeder` | `UtensilsCrossed` | `--icon-bg-feeder` (#FFF8E1) |
| `lighting` | `Sun` | `--icon-bg-lighting` (#FFF9C4) |

**Implementation:**
```tsx
export function DeviceCard({ id, name, deviceType, status, isEnabled, reading, isLoading, onToggle }: DeviceCardProps) {
  if (isLoading) return <DeviceCardSkeleton />

  const { icon: Icon, iconBg, iconColor } = deviceIconMap[deviceType]

  return (
    <Card className="shadow-[var(--shadow-card)] border-border hover:shadow-[var(--shadow-panel)] transition-shadow duration-200">
      <CardContent className="p-5">
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
          style={{ backgroundColor: iconBg }}
        >
          <Icon className="w-5 h-5" style={{ color: iconColor }} />
        </div>

        {/* Name */}
        <p className="text-[15px] font-semibold text-foreground leading-tight mb-1.5">
          {name}
        </p>

        {/* Status badge */}
        <Badge className={cn('text-xs font-medium px-2 py-0.5 rounded-full mb-3', deviceStatusStyles[status])}>
          {deviceStatusLabel[status]}
        </Badge>

        {/* Reading (if provided) */}
        {reading && (
          <div className="mb-3">
            <p className="text-xs text-muted-foreground mb-0.5">{reading.label}</p>
            <p className="text-[20px] font-semibold text-foreground leading-none" key={reading.value}>
              {reading.value}
            </p>
          </div>
        )}

        {/* Toggle — flush to bottom right */}
        <div className="flex justify-end mt-auto pt-1">
          <Switch
            checked={isEnabled}
            onCheckedChange={(checked) => onToggle(id, checked)}
            aria-label={`${isEnabled ? '關閉' : '開啟'} ${name}`}
          />
        </div>
      </CardContent>
    </Card>
  )
}
```

**When `reading` is absent** (e.g., Main Pump just shows status), the card is shorter. That's fine — the grid handles variable height cards with `items-start`.

**Toggle behavior:**
- Calling `onToggle` triggers an optimistic update: immediately flip `isEnabled` in local state, fire `PATCH /api/devices/:id` mutation, revert on error + show a Sonner `toast.error()`.
- While the mutation is in flight, disable the Switch (`disabled` prop) to prevent double-tapping.

**Skeleton state:**
```tsx
function DeviceCardSkeleton() {
  return (
    <Card className="shadow-[var(--shadow-card)] border-border">
      <CardContent className="p-5">
        <Skeleton className="w-10 h-10 rounded-xl mb-3" />
        <Skeleton className="h-4 w-32 mb-1.5" />
        <Skeleton className="h-5 w-16 rounded-full mb-3" />
        <Skeleton className="h-3 w-24 mb-1" />
        <Skeleton className="h-6 w-20 mb-3" />
        <div className="flex justify-end">
          <Skeleton className="h-5 w-9 rounded-full" />
        </div>
      </CardContent>
    </Card>
  )
}
```

---

#### `SidebarNavItem`
**File:** `components/molecules/SidebarNavItem.tsx`

```tsx
interface SidebarNavItemProps {
  label:    string
  href:     string
  icon:     LucideIcon
  isActive: boolean
}
```

```tsx
<Link
  href={href}
  className={cn(
    'h-9 px-3 rounded-lg flex items-center gap-2.5 text-sm font-medium transition-colors',
    isActive
      ? 'bg-[var(--sidebar-nav-active-bg)] text-[var(--sidebar-nav-active-text)]'
      : 'text-[var(--sidebar-nav-idle-text)] hover:bg-[var(--sidebar-nav-hover-bg)] hover:text-gray-700'
  )}
>
  <Icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-[#2E7D32]' : 'text-gray-400')} />
  <span>{label}</span>
</Link>
```

Active state is determined by comparing `href` to `usePathname()` from `next/navigation`. Exact match for `/dashboard`, prefix match for everything else (e.g., `/devices/123` → Devices is active).

---

#### `AlertCard`
**File:** `components/molecules/AlertCard.tsx`

Used on the `/alerts` page and in the `AlertSheet`. Built on shadcn `Card` with a colored left border.

```tsx
interface AlertCardProps {
  id:          string
  deviceName:  string
  severity:    'warning' | 'critical'
  message:     string       // "水溫超出安全上限 (26.7°C > 25.0°C)"
  triggeredAt: Date
  isNew?:      boolean
  onDismiss?:  (id: string) => void
  onGetAIHelp?: (id: string) => void
}
```

```
┌─── left border: amber (warning) or red (critical) ───────────────┐
│                                                                   │
│  🌡 Water Temp Sensor     [Critical]              [✕]            │
│                                                                   │
│  水溫超出安全上限 (26.7°C > 25.0°C)                                │
│                                                                   │
│  5 分鐘前                               [🤖 Get AI Suggestion]   │
└───────────────────────────────────────────────────────────────────┘
```

`border-l-[3px]` + `border-l-[#F59E0B]` (warning) or `border-l-[#EF4444]` (critical).

---

#### `AIResponseDialog`
**File:** `components/molecules/AIResponseDialog.tsx`

Opens from the "Get AI Suggestion" button on an `AlertCard`. Uses shadcn `Dialog`.

States:
1. **Loading** — 3 lines of `Skeleton` + "AI 正在分析…" text below
2. **Streaming** — text renders word by word. Monospaced font not needed here; use regular `text-sm leading-relaxed`. A blinking `|` cursor via CSS `@keyframes blink` is appended.
3. **Done** — cursor gone. Footer shows shadcn `Button variant="outline" size="sm"` "複製建議"
4. **Error** — shadcn `Alert variant="destructive"` + "重試" button

---

### 4.3 Organisms (Page Sections)

#### `Sidebar`
**File:** `components/organisms/Sidebar.tsx`

```tsx
// 'use client' — needs usePathname

const navItems = [
  { label: '儀表板',     href: '/dashboard',        icon: LayoutDashboard },
  { label: '設備管理',   href: '/devices',           icon: Cpu },
  { label: '數據分析',   href: '/analytics',         icon: TrendingUp },
  { label: '排程管理',   href: '/schedules',         icon: CalendarDays },
  { label: '警報記錄',   href: '/alerts',            icon: Bell },
  { label: '系統設定',   href: '/settings',          icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-[220px] flex-shrink-0 bg-white border-r border-[#EAECEF] flex flex-col h-screen sticky top-0">
      {/* Logo block */}
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#2E7D32] flex items-center justify-center flex-shrink-0">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-gray-900 leading-tight">AquaWatch</p>
            <p className="text-[11px] text-gray-400 leading-tight">Device Management</p>
          </div>
        </div>
      </div>

      <Separator className="mx-4 w-auto" />

      {/* Nav items */}
      <nav className="flex flex-col gap-1 px-3 pt-4 flex-1">
        {navItems.map(item => (
          <SidebarNavItem
            key={item.href}
            {...item}
            isActive={
              item.href === '/dashboard'
                ? pathname === item.href
                : pathname.startsWith(item.href)
            }
          />
        ))}
      </nav>
    </aside>
  )
}
```

---

#### `Topbar`
**File:** `components/organisms/Topbar.tsx`

```tsx
// 'use client'

export function Topbar() {
  const { user }       = useAuthStore()
  const { unreadCount, toggleSheet } = useAlertStore()

  return (
    <header className="h-14 bg-white border-b border-[#EAECEF] flex items-center px-6 gap-4 sticky top-0 z-30">
      {/* Search */}
      <div className="flex-1 max-w-[380px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Search devices..." className="pl-9 h-9 bg-gray-50 border-gray-200 text-sm" />
        </div>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Bell */}
        <Button variant="ghost" size="icon" className="relative" onClick={toggleSheet} aria-label={`警報，${unreadCount} 則未讀`}>
          <Bell className="h-4.5 w-4.5 text-gray-500" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
          )}
        </Button>

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 px-2 gap-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs bg-[#E8F5E9] text-[#2E7D32]">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-gray-700">{user?.name}</span>
              <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem>個人資料</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">登出</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Settings */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 px-2 gap-1.5 text-sm text-gray-600">
              <Settings className="h-4 w-4" />
              Settings
              <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push('/settings/thresholds')}>閾值設定</DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/settings/zones')}>區域管理</DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/settings/notifications')}>通知設定</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
```

---

#### `DeviceHealthSummary`
**File:** `components/organisms/DeviceHealthSummary.tsx`

The three `HealthSummaryCard` cards side by side, fetched from `/api/devices/health-summary`.

```tsx
<section>
  <h2 className="text-[18px] font-semibold text-foreground mb-4">Device Health Summary</h2>
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    {isLoading ? (
      Array.from({ length: 3 }).map((_, i) => <HealthSummaryCardSkeleton key={i} />)
    ) : (
      summary.map(item => <HealthSummaryCard key={item.key} {...item} />)
    )}
  </div>
</section>
```

---

#### `ManagedDevicesGrid`
**File:** `components/organisms/ManagedDevicesGrid.tsx`

The grid of `DeviceCard` components. Fetches from `/api/devices?zoneId=`. The toggle action calls `useMutation` → `PATCH /api/devices/:id`.

```tsx
<section className="mt-6">
  <h2 className="text-[18px] font-semibold text-foreground mb-4">Managed Devices</h2>
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
    {isLoading
      ? Array.from({ length: 7 }).map((_, i) => <DeviceCardSkeleton key={i} />)
      : devices.map(device => (
          <DeviceCard
            key={device.id}
            {...device}
            onToggle={handleToggle}
          />
        ))
    }
  </div>
</section>
```

Grid: `grid-cols-4` on desktop (1280px+), `grid-cols-3` on tablet, `grid-cols-2` on mobile. `items-start` so different-height cards don't stretch to match each other.

---

#### `AlertSheet`
**File:** `components/organisms/AlertSheet.tsx`

shadcn `Sheet` from the right side — triggered by clicking the bell in `Topbar`.

```tsx
<Sheet open={isOpen} onOpenChange={onClose}>
  <SheetContent side="right" className="w-[400px] sm:max-w-[400px] p-0 flex flex-col">
    <SheetHeader className="px-5 py-4 border-b border-border">
      <div className="flex items-center justify-between">
        <SheetTitle className="text-base font-semibold">警報記錄</SheetTitle>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllRead}>
            全部已讀
          </Button>
          <Badge variant="secondary">{alerts.length}</Badge>
        </div>
      </div>
    </SheetHeader>
    <ScrollArea className="flex-1 px-4 py-3">
      {alerts.length === 0
        ? <EmptyAlerts />
        : alerts.map(a => <AlertCard key={a.id} {...a} className="mb-3" />)
      }
    </ScrollArea>
  </SheetContent>
</Sheet>
```

---

## 5. Routing & Page Layouts

### 5.1 Route Map

```
app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx          → /login
│   └── layout.tsx            → AuthLayout (centered card, no sidebar)
│
├── (dashboard)/
│   ├── layout.tsx            → DashboardLayout (sidebar + topbar shell)
│   ├── dashboard/
│   │   └── page.tsx          → /dashboard  ← main page
│   ├── devices/
│   │   ├── page.tsx          → /devices    (full device list + filters)
│   │   └── [id]/
│   │       └── page.tsx      → /devices/:id (single device detail + history chart)
│   ├── analytics/
│   │   └── page.tsx          → /analytics  (7-day charts, sensor trends)
│   ├── schedules/
│   │   └── page.tsx          → /schedules  (feeding schedules, timers)
│   ├── alerts/
│   │   └── page.tsx          → /alerts     (full alert log with table)
│   └── settings/
│       ├── page.tsx          → /settings   → redirect /settings/thresholds
│       ├── thresholds/page.tsx
│       ├── zones/page.tsx
│       └── notifications/page.tsx
│
└── not-found.tsx
```

---

### 5.2 `/dashboard` Page — Full Layout

```
/dashboard
│
├── <DeviceHealthSummary>
│   ├── HealthSummaryCard "System Status: Optimal (92%)"
│   ├── HealthSummaryCard "Sensor Health: Good (88%)"
│   └── HealthSummaryCard "Connection Stability: Strong (98%)"
│
└── <ManagedDevicesGrid>
    ├── DeviceCard — Main Pump          (status: Running, toggle ON)
    ├── DeviceCard — Water Temp Sensor  (status: Active, reading: 24.5°C, toggle ON)
    ├── DeviceCard — pH Sensor          (status: Calibrating, reading: pH 6.8, toggle ON)
    ├── DeviceCard — Nutrient Feeder 1  (status: Scheduled, next: 14:00, toggle ON)
    ├── DeviceCard — Aeration Pump      (status: Idle, toggle OFF)
    ├── DeviceCard — Water Level Sensor (status: Active, reading: 85%, toggle ON)
    └── DeviceCard — Lighting Controller(status: On, reading: 70%, toggle ON)
```

---

### 5.3 Auth Layout

**File:** `app/(auth)/layout.tsx`

```tsx
// Server Component
export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#F4F6F8] flex items-center justify-center p-4">
      <div className="w-full max-w-[360px]">
        <div className="text-center mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#2E7D32] flex items-center justify-center mx-auto mb-3">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900">AquaWatch</h1>
          <p className="text-sm text-gray-500 mt-0.5">Device Management</p>
        </div>
        <Card className="shadow-[var(--shadow-panel)] border-border">
          <CardContent className="p-6">{children}</CardContent>
        </Card>
      </div>
    </div>
  )
}
```

---

## 6. State Management & Lifecycle

### 6.1 What Lives Where

| State | Tool | Examples |
|---|---|---|
| Server / async data | TanStack Query | Device list, health summary, alert log, schedules |
| Live sensor readings | WebSocket hook + local `useState` | Current temp/pH/flow, 300-pt buffer |
| Device toggle state | TanStack Query mutation (optimistic) | `isEnabled` per device |
| Auth | Zustand `useAuthStore` | `accessToken`, `user`, `isAuthenticated` |
| Alert sheet | Zustand `useAlertStore` | `alerts[]`, `unreadCount`, `isSheetOpen` |
| Selected zone | Zustand `useZoneStore` (persisted) | `selectedZoneId` |
| AI dialog state | Local `useState` in `AIResponseDialog` | `content`, `isStreaming`, `error` |
| Forms | React Hook Form | Field values, validation errors |

---

### 6.2 Device Toggle Mutation

**File:** `hooks/useDeviceToggle.ts`

```ts
export function useDeviceToggle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      api.patch(`/api/devices/${id}`, { enabled }).then(r => r.data),

    // Optimistic update — flip the switch immediately
    onMutate: async ({ id, enabled }) => {
      await queryClient.cancelQueries({ queryKey: ['devices'] })
      const prev = queryClient.getQueryData(['devices'])

      queryClient.setQueryData(['devices'], (old: Device[]) =>
        old.map(d => d.id === id ? { ...d, isEnabled: enabled } : d)
      )

      return { prev }  // snapshot for rollback
    },

    // Rollback on error
    onError: (_, __, context) => {
      if (context?.prev) queryClient.setQueryData(['devices'], context.prev)
      toast.error('設備切換失敗，請重試')
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] })
    },
  })
}
```

---

### 6.3 Auth Flow (Axios interceptors)

**File:** `lib/axios.ts`

```ts
const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL, withCredentials: true })

api.interceptors.request.use(config => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let isRefreshing = false
let queue: Array<(t: string) => void> = []

api.interceptors.response.use(
  r => r,
  async error => {
    const orig = error.config
    if (error.response?.status === 401 && !orig._retry) {
      orig._retry = true
      if (isRefreshing) return new Promise(res => queue.push(t => { orig.headers.Authorization = `Bearer ${t}`; res(api(orig)) }))
      isRefreshing = true
      try {
        const { data } = await axios.post('/api/auth/refresh', {}, { withCredentials: true })
        useAuthStore.getState().setAccessToken(data.access_token)
        queue.forEach(cb => cb(data.access_token))
        queue = []
        return api(orig)
      } catch {
        useAuthStore.getState().logout()
        window.location.href = '/login'
      } finally { isRefreshing = false }
    }
    return Promise.reject(error)
  }
)
```

---

### 6.4 TanStack Query Config

**File:** `lib/queryClient.ts`

```ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 2,
      retryDelay: attempt => Math.min(1000 * 2 ** attempt, 10_000),
      refetchOnWindowFocus: true,
    },
  },
})
```

| Query key | `staleTime` | `refetchInterval` |
|---|---|---|
| `['devices', zoneId]` | `15s` | `15000` |
| `['health-summary', zoneId]` | `30s` | `30000` |
| `['alerts', zoneId]` | `30s` | `30000` |
| `['sensor-poll', zoneId]` | `0` | `5000` (WS fallback) |
| `['analytics', zoneId, range]` | `5min` | false |
| `['schedules']` | `5min` | false |

---

## 7. API Contract Examples

### 7.1 Device List Response

**Endpoint:** `GET /api/devices?zoneId=zone-001`

```json
{
  "zoneId": "zone-001",
  "zoneName": "溫室 A — 魚菜共生區",
  "devices": [
    {
      "id": "dev-001",
      "name": "Main Pump",
      "deviceType": "pump",
      "status": "running",
      "isEnabled": true,
      "reading": null
    },
    {
      "id": "dev-002",
      "name": "Water Temp Sensor",
      "deviceType": "sensor_temp",
      "status": "active",
      "isEnabled": true,
      "reading": {
        "label": "Current reading",
        "value": "24.5°C",
        "raw": 24.5,
        "unit": "°C"
      }
    },
    {
      "id": "dev-003",
      "name": "pH Sensor",
      "deviceType": "sensor_ph",
      "status": "calibrating",
      "isEnabled": true,
      "reading": {
        "label": "Current reading",
        "value": "pH 6.8",
        "raw": 6.8,
        "unit": ""
      }
    },
    {
      "id": "dev-004",
      "name": "Nutrient Feeder 1",
      "deviceType": "feeder",
      "status": "scheduled",
      "isEnabled": true,
      "reading": {
        "label": "Next Feed time",
        "value": "14:00",
        "raw": "14:00",
        "unit": ""
      }
    },
    {
      "id": "dev-005",
      "name": "Aeration Pump",
      "deviceType": "aeration",
      "status": "idle",
      "isEnabled": false,
      "reading": null
    },
    {
      "id": "dev-006",
      "name": "Water Level Sensor",
      "deviceType": "sensor_level",
      "status": "active",
      "isEnabled": true,
      "reading": {
        "label": "Level",
        "value": "85%",
        "raw": 85,
        "unit": "%"
      }
    },
    {
      "id": "dev-007",
      "name": "Lighting Controller",
      "deviceType": "lighting",
      "status": "on",
      "isEnabled": true,
      "reading": {
        "label": "Brightness",
        "value": "70%",
        "raw": 70,
        "unit": "%"
      }
    }
  ]
}
```

---

### 7.2 Health Summary Response

**Endpoint:** `GET /api/devices/health-summary?zoneId=zone-001`

```json
{
  "zoneId": "zone-001",
  "updatedAt": 1716800400000,
  "summary": [
    {
      "key": "system_status",
      "label": "System Status",
      "value": "Optimal (92%)",
      "percent": 92,
      "state": "optimal"
    },
    {
      "key": "sensor_health",
      "label": "Sensor Health",
      "value": "Good (88%)",
      "percent": 88,
      "state": "good"
    },
    {
      "key": "connection_stability",
      "label": "Connection Stability",
      "value": "Strong (98%)",
      "percent": 98,
      "state": "strong"
    }
  ]
}
```

---

### 7.3 Device Toggle Request & Response

**Endpoint:** `PATCH /api/devices/:id`

**Request:**
```json
{ "enabled": false }
```

**Response 200:**
```json
{
  "id": "dev-005",
  "name": "Aeration Pump",
  "isEnabled": false,
  "status": "idle",
  "updatedAt": 1716800460000
}
```

**Response 422:**
```json
{
  "error": "DEVICE_LOCKED",
  "message": "此設備目前正在排程中，無法手動關閉"
}
```

---

### 7.4 AI Repair Recommendation (Streaming)

**Endpoint:** `POST /api/ai/recommend`

**Request:**
```json
{
  "alertId": "anomaly-20240527-001",
  "deviceId": "dev-002",
  "context": {
    "deviceName": "Water Temp Sensor",
    "sensorType": "temperature",
    "severity": "critical",
    "currentValue": 26.7,
    "safeMax": 25.0,
    "unit": "°C",
    "trend": "up",
    "locale": "zh-TW"
  }
}
```

**Streaming SSE Response:**
```
Content-Type: text/event-stream

data: {"type":"start"}
data: {"type":"chunk","content":"**水溫異常處理建議**\n\n"}
data: {"type":"chunk","content":"目前水溫 26.7°C 已超過安全上限。建議步驟：\n\n"}
data: {"type":"chunk","content":"1. 立即確認循環泵浦是否正常運作\n"}
data: {"type":"chunk","content":"2. 拉上遮陽網，減少直射陽光\n"}
data: {"type":"chunk","content":"3. 補充新鮮水源，稀釋升溫水體\n"}
data: {"type":"chunk","content":"4. 密切觀察魚群是否出現浮頭現象\n"}
data: {"type":"done","durationMs":2310}
```

---

## 8. Engineering Constraints

### 8.1 Accessibility

shadcn/ui covers most of this automatically. Things to verify on top:

- All icon-only `Button` elements must have `aria-label`. Check every icon in the topbar.
- The `Switch` component already has `role="switch"` and announces its state. The `aria-label` we add (`開啟/關閉 {deviceName}`) gives it context.
- `Progress` bar needs `aria-label="System Status: 92%"` since it's just a visual bar.
- Color is never the only indicator of status — the badge text always says the status name.
- Tab order: sidebar nav → topbar → main content. Don't interrupt this with `tabIndex` overrides.
- All modals (Dialog, Sheet) trap focus automatically via shadcn's Radix primitives — don't wrap them in extra `div`s that break this.

### 8.2 Loading Skeletons

Every data-dependent section shows a skeleton. Use shadcn `Skeleton`.

| Section | Skeleton |
|---|---|
| `HealthSummaryCard` (×3) | Label + value + progress bar — match the card dimensions |
| `DeviceCard` (×7) | Icon square + name + badge + reading + toggle |
| `AlertCard` | Two text lines + badge + button |
| `Topbar` user area | `Skeleton className="h-7 w-7 rounded-full"` + `Skeleton className="h-4 w-20"` |

Pattern every time:
```tsx
if (isLoading) return <XxxSkeleton />
if (error)     return <XxxError onRetry={refetch} />
if (!data?.length) return <XxxEmpty />
return <Xxx data={data} />
```

### 8.3 Error Boundaries

Wrap each organism:
```tsx
<ErrorBoundary fallback={<SectionError />}>
  <ManagedDevicesGrid />
</ErrorBoundary>
```

Don't use one root error boundary — partial failures should be isolated so the health summary still works when the device grid crashes.

### 8.4 Empty States

| Component | Empty copy |
|---|---|
| Alert sheet | Lucide `CheckCircle` (green), "목前無警報", "所有設備運作正常" |
| Alerts page | Same as above but centered in the full page |
| Schedules list | Lucide `CalendarPlus`, "尚無排程", "新增排程" button |
| Devices list (after filter) | Lucide `SearchX`, "找不到符合的設備", "清除篩選" link |

### 8.5 Performance

- `DeviceCard` grid: 7 cards is fine without virtualization. If `/devices` page shows all devices ever, virtualize with `react-window` beyond 50 items.
- `Progress` animation: use CSS `transition-all duration-700` on the `width` — no JS animation needed.
- Dynamic import for Recharts (used on `/analytics` page only): `const Chart = dynamic(() => import('...'), { ssr: false })`
- Device toggle: disable the `Switch` for the duration of the mutation to prevent double-firing.
- No `img` tags — `next/image` everywhere.

### 8.6 TypeScript

- `strict: true` in `tsconfig.json`
- No `any`. Use `unknown` + narrowing.
- All API shapes in `types/api.ts`
- All Zustand store interfaces in `store/types.ts`
- Zod validation on auth responses and device mutations

### 8.7 Environment Variables

```
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com/ws
NEXT_PUBLIC_APP_NAME=AquaWatch
```

AI API keys go in server-only env vars (no `NEXT_PUBLIC_` prefix). Only accessible in Route Handlers.

### 8.8 File Naming

| Thing | Convention |
|---|---|
| Components | PascalCase — `DeviceCard.tsx` |
| shadcn components | Leave as-is — `button.tsx`, `switch.tsx` |
| Hooks | `use` prefix — `useDeviceToggle.ts` |
| Stores | `use` prefix — `useAlertStore.ts` |
| Types | PascalCase — `Device`, `AlertItem` |
| Routes | kebab-case — `settings/thresholds/` |

---

*AquaWatch — 智慧魚菜共生 AIoT 監控儀表板 · design.md v2.0.0*
