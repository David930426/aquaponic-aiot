# CLAUDE.md

This file gives Claude Code the context and rules for working in this repository. Read it before making any changes.

---

## Project Overview

**AquaWatch** — 智慧魚菜共生 AIoT 監控儀表板 (Smart Aquaponics AIoT Monitoring Dashboard).

A device management and monitoring web app for an aquaponics farm. Operators view live sensor readings (water temperature, pH, flow rate, level), toggle hardware devices (pumps, feeders, lighting) on/off, and respond to AI-generated alerts when readings go out of safe range.

The full visual and architectural spec lives in **`design.md`** at the repo root. Always consult `design.md` before building any UI — it defines the exact layout, colors, components, and API contracts. This file (`CLAUDE.md`) defines *how to work*; `design.md` defines *what to build*.

---

## Tech Stack (Non-Negotiable)

Use exactly these. Do not introduce alternative libraries without being asked.

| Concern | Use | Do NOT use |
|---|---|---|
| Framework | **Next.js 14 (App Router)** | Pages Router, CRA, Vite |
| Language | **TypeScript** (strict) | Plain JS |
| UI components | **shadcn/ui** | MUI, Ant Design, Chakra, raw Radix |
| Styling | **Tailwind CSS** | CSS-in-JS, styled-components, Sass modules |
| Icons | **lucide-react** | react-icons, font-awesome |
| Charts | **Recharts** | Chart.js, D3 direct, Victory |
| Server state | **TanStack Query v5** | useEffect+fetch, SWR |
| Client state | **Zustand** | Redux, Context for global state |
| Forms | **React Hook Form + Zod** | Formik, uncontrolled forms |
| HTTP | **Axios** (interceptors) | bare fetch for API calls |
| Toasts | **Sonner** | react-toastify, alert() |
| Dates | **date-fns** | moment, dayjs |
| Animation | **Framer Motion** (sparingly) | GSAP, anime.js |

---

## Commands

```bash
# Install
npm install

# Dev server (http://localhost:3000)
npm run dev

# Production build — ALWAYS run before declaring a task done
npm run build

# Lint + typecheck
npm run lint
npx tsc --noEmit

# Add a shadcn component (use this, never hand-write a ui/ component)
npx shadcn-ui@latest add <component-name>
```

**Before finishing any task:** run `npm run build` and `npx tsc --noEmit`. Fix all errors. Do not hand back work that doesn't compile.

---

## The Golden Rules

1. **shadcn first, always.** Before building any UI element, check if shadcn has it. If yes, run `npx shadcn-ui@latest add <name>` and use it. Only build a custom component when shadcn genuinely has no equivalent (e.g. `DeviceCard`, `HealthSummaryCard`).

2. **Never hand-edit files in `components/ui/`** except to apply the documented color overrides for `Switch` and `Progress` (see `design.md` §4.1). Those files are shadcn-generated.

3. **Tailwind only for styling.** No inline `<style>`, no `.module.css`, no CSS-in-JS. The only hand-written CSS lives in `app/globals.css` (design tokens + keyframes).

4. **Use design tokens, not hardcoded colors.** Reference the CSS variables and Tailwind classes defined in `design.md` §3. If you're typing a hex code that isn't already a token, stop and check the token list first.

5. **Server Components by default.** Only add `'use client'` when the component needs hooks, browser APIs, or event handlers. Sidebar nav, topbar, device cards, and charts are client; layouts and static sections are server.

6. **TanStack Query owns server data. Zustand owns shared UI state. `useState` owns the rest.** Never store fetched API data in Zustand.

7. **Light theme only.** There is no dark mode. Do not add `next-themes`, `dark:` variants, or theme toggles.

---

## Project Structure

```
.
├── CLAUDE.md                 ← you are here
├── design.md                 ← the full spec — READ THIS
├── app/
│   ├── globals.css           ← design tokens + keyframes ONLY
│   ├── layout.tsx            ← root layout, fonts
│   ├── (auth)/
│   │   ├── layout.tsx        ← AuthLayout (centered, no sidebar)
│   │   └── login/page.tsx
│   └── (dashboard)/
│       ├── layout.tsx        ← Shell: Sidebar + Topbar + <main>
│       ├── dashboard/page.tsx
│       ├── devices/
│       ├── analytics/
│       ├── schedules/
│       ├── alerts/
│       └── settings/
├── components/
│   ├── ui/                   ← shadcn-generated (don't hand-edit)
│   ├── molecules/            ← DeviceCard, HealthSummaryCard, AlertCard, etc.
│   └── organisms/            ← Sidebar, Topbar, ManagedDevicesGrid, etc.
├── hooks/                    ← useSensorStream, useDeviceToggle, etc.
├── store/                    ← Zustand stores + store/types.ts
├── lib/                      ← axios.ts, queryClient.ts, utils.ts (cn helper)
└── types/                    ← api.ts (all API response shapes)
```

---

## Component Conventions

- **Naming:** PascalCase files for components (`DeviceCard.tsx`), `use` prefix for hooks (`useDeviceToggle.ts`), kebab-case route folders (`settings/thresholds/`).
- **Composition:** molecules compose shadcn atoms; organisms compose molecules. Pages compose organisms. Keep this hierarchy.
- **Props:** define a typed `interface XxxProps` for every component. No inline prop types on the function signature for anything non-trivial.
- **The `cn()` helper:** use `lib/utils.ts`'s `cn()` (clsx + tailwind-merge) for all conditional class names. Never template-string classNames together manually.
- **Badges/status:** use the documented `deviceStatusStyles` map from `design.md` §4.1. Don't invent new status colors.

---

## State & Data Rules

- **Fetching:** always through TanStack Query with a `queryKey` array. See `design.md` §6.4 for the exact keys and stale times.
- **Mutations:** device toggles and settings updates use `useMutation` with optimistic updates and rollback (pattern in `design.md` §6.2).
- **Auth:** JWT access token in `useAuthStore` (memory only, never persisted). Refresh handled by the Axios interceptor in `lib/axios.ts` — don't reimplement auth logic in components.
- **Live data:** `useSensorStream(zoneId)` hook handles WebSocket + polling fallback. Don't open raw WebSockets in components.
- **Errors:** mutations show a Sonner `toast.error()`. Queries render an inline error state with a retry button. Never swallow errors silently.

---

## Accessibility (Required)

- Every icon-only button needs `aria-label`.
- `Switch` toggles need `aria-label` describing the device.
- `Progress` bars need `aria-label` with the metric and value.
- Color is never the only status indicator — always pair with text.
- Don't break shadcn/Radix focus trapping by wrapping modals in extra interactive elements.
- All animations respect `prefers-reduced-motion` (handled in `globals.css`).

---

## Loading, Empty & Error States

Every data-driven section must handle all four states. Use this exact pattern:

```tsx
if (isLoading)      return <XxxSkeleton />
if (error)          return <XxxError onRetry={refetch} />
if (!data?.length)  return <XxxEmpty />
return <Xxx data={data} />
```

Skeletons use shadcn `<Skeleton>` and must match the real component's dimensions. Empty states are friendly, not alarming (see `design.md` §8.4).

---

## What NOT to Do

- ❌ Don't add dependencies outside the approved stack without asking.
- ❌ Don't use `localStorage`/`sessionStorage` except in the documented Zustand `persist` for `selectedZoneId`.
- ❌ Don't hardcode colors — use tokens.
- ❌ Don't write components over ~150 lines — split them.
- ❌ Don't use `any` or `@ts-ignore` without a comment explaining why.
- ❌ Don't add a dark mode.
- ❌ Don't put server data in Zustand.
- ❌ Don't skip `npm run build` before finishing.

---

## When Building a New Feature

1. Read the relevant section of `design.md` first.
2. Check what shadcn components you need; `add` them.
3. Build molecules, then organisms, then wire into the page.
4. Add loading/empty/error states.
5. Add accessibility attributes.
6. Run `npm run build` and `npx tsc --noEmit`.
7. Verify it matches the layout described in `design.md`.

---

## Domain Glossary

| Term | Meaning |
|---|---|
| Zone (區域) | One greenhouse / monitoring area. The app supports multiple. |
| Device (設備) | A physical piece of hardware: pump, sensor, feeder, light. |
| Reading | A live value from a sensor device (e.g. 24.5°C). |
| Threshold (閾值) | The safe min/max range for a sensor. Out of range → alert. |
| Anomaly / Alert (警報) | A triggered event when a reading breaches its threshold. |
| AI Recommendation | Streamed natural-language repair guidance for an alert. |

---

*Keep this file updated as the project evolves. If a convention changes, change it here.*
