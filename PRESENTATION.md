# AquaWatch — 智慧魚菜共生 AIoT 監控儀表板
### Presentation & Demo Guide

A smart aquaponics (魚菜共生) monitoring dashboard. Operators watch live sensor
readings, get AI repair advice when something goes wrong, and receive push alerts
on their phone. This document explains **what tools we used**, **how it works**, and
**how a user uses it** — mapped to our user story map.

---

## 1. The Toolbox (Tech Stack)

The app has three layers. Here's what each tool does, in plain language.

| Layer | Tool | What it does |
|---|---|---|
| **Framework** | Next.js 14 | The skeleton — runs the web pages *and* the backend API in one project. |
| | TypeScript | JavaScript with type-checking — catches mistakes before the app runs. |
| **Look & feel** | Tailwind CSS | Styling system (colors, spacing, layout). |
| | shadcn/ui | Ready-made UI pieces (buttons, cards, dialogs, switches). |
| | lucide-react | The icons (thermometer, flask, droplet…). |
| | Recharts | Draws the line charts (pH trend, live readings). |
| **Data handling** | TanStack Query | Fetches data and **auto-refreshes** it every few seconds. |
| | Zustand | Remembers small UI state (login, selected zone, language). |
| | React Hook Form + Zod | Builds & validates forms (e.g. Add Device). |
| | Axios | Sends the HTTP requests to the API. |
| **Server / data** | MongoDB + Prisma | The database + the tool that talks to it. |
| | Croner | A built-in timer — runs the data engine + feed schedules on a clock. |
| | Web Push | Phone/browser notifications, even when the tab is closed. |
| | Claude API (Anthropic) | The AI that writes repair suggestions for alerts. |

> **One-line summary:** *A Next.js + TypeScript web app, styled with Tailwind/shadcn,
> reading live sensor data from MongoDB, auto-refreshing with TanStack Query, with AI
> repair advice from Claude and phone push alerts.*

---

## 2. How It Works (Data Flow)

This matches the **系統 (System)** column of our story map: 感測器發送 → API 接收儲存.

```
 ┌────────────┐   sends reading   ┌──────────────┐   stores    ┌───────────┐
 │  Sensor /  │ ────────────────> │  Next.js API │ ──────────> │  MongoDB  │
 │  IoT item  │   (HTTP / JSON)   │  (ingest +   │             │ (database)│
 │            │ <──────────────── │  data engine)│ <────────── │           │
 └────────────┘   OR fetched      └──────────────┘   reads     └───────────┘
                                          │                          ▲
                                          │ every few seconds        │ TanStack Query
                                          ▼                          │ auto-refresh
                                   ┌───────────────────────────────────────┐
                                   │      Dashboard (what the user sees)     │
                                   │  KPI cards · charts · alerts · AI · push│
                                   └───────────────────────────────────────┘
```

### Two ways data gets in
1. **Push** — a sensor sends a reading *to* our API (`POST /api/ingest/...`). 「感測器發送」
2. **Pull** — the app *fetches* from each device's own API URL on a timer; if a device
   has no URL or the request fails, it **simulates** the value instead. 「資料容器」

### The alert pipeline (維護人員 / Maintenance column)
```
reading arrives → compare to safe range (閾值)
   → out of range? → create ALERT (red warning 異常警示)
       → AI generates repair steps (AI 修復建議, via Claude)
       → send phone push notification (手機推播)
       → maintenance person reads it & 確認解除 (acknowledges)
```

The timer (Croner) runs every cycle and does two jobs: generate/fetch the next round
of readings, and check the fish-feed schedules.

---

## 3. How a User Uses It (mapped to the story map)

### 👤 溫室管理員 (Administrator) — "即時數據監控"
1. **Log in** → lands on the **Dashboard**.
2. Sees **5 live KPI cards**: 水溫 · pH · 溶氧 · 水位 · 水流量. → *看到水溫/水流量即時數值*
3. Watches the **line charts** for trends. → *看到 pH 即時折線圖*
4. Data **refreshes automatically** every few seconds. → *數據每 5 秒自動更新*
5. Switches the chart to **7-day history**. → *查看 7 天歷史數據圖* (Release 2)
6. **Settings → Thresholds**: set safe min/max per sensor. → *自訂安全閾值範圍* (Release 2)

### 🔧 維護人員 (Maintenance) — "異常處理"
1. Out-of-range reading → **red alert** appears + **phone push** arrives. → *異常紅色警示 · 手機推播*
2. Opens the alert → clicks **"AI 修復建議"** → Claude streams repair steps. → *AI 在 3 秒內修復步驟*
3. Follows the steps, then **marks resolved**. → *確認解除*
4. The alert is kept as a **log** for later review. → *警報日誌紀錄* (Release 2)

### ⚙️ 系統 (System) — "資料容器"
1. A device **pushes** readings, or the app **fetches** them on a schedule. → *感測器發送*
2. The API **validates and stores** each reading as JSON in MongoDB. → *API 接收儲存 · JSON 格式儲存*
3. **Admins manage devices** (add/edit/delete + per-device API URL) on the Devices page.

---

## 4. Story Map → Status

| Release | Story | Status |
|---|---|---|
| **R1 (MVP)** | 看到水溫即時數值 | ✅ KPI card |
| | 看到 pH 即時折線圖 | ✅ Recharts chart |
| | 看到水流量即時數據 | ✅ KPI card (sensor_flow) |
| | 異常紅色警示 | ✅ red alert styling |
| | AI 在 3 秒內修復步驟 | ✅ streams instantly |
| | 數據每 5 秒自動更新 | ✅ configurable refresh |
| | 感測器每 5 秒發送 | ✅ data engine timer |
| | API 接收存入資料庫 | ✅ `/api/ingest/*` → MongoDB |
| | AI 依數據生成建議 | ✅ context-aware per sensor |
| | JSON 格式儲存 | ✅ |
| **R2** | 查看 7 天歷史數據圖 / pH 趨勢 | ✅ |
| | 自訂安全閾值範圍 | ✅ Settings → Thresholds |
| | 手機推播通知警報 | ✅ Web Push |
| | 警報日誌 / 災難紀錄 | ✅ alerts + anomalies kept |
| | 資料長期儲存 | ✅ anomalies no-expiry |
| **Unscheduled** | AI 預測異常 · 跨區警報 · 多設備建議 · 火星基地 | ⚪ not built (intended) |

---

## 5. 60-Second Demo Script

1. *"This is the dashboard — these 5 cards are live sensor readings; watch, they update on their own."*
2. *"Here's the 7-day pH trend chart."*
3. *"In Settings I can set the safe range for each sensor."* → show **Thresholds**
4. *"On the Devices page I can add a new device and give it its own data API."* → show **Add Device**
5. *"When a value goes out of range, this red alert fires — and I click here for AI repair steps."* → show **AI dialog**
6. *"And it sends a push notification to my phone."*

---

## 6. Run It Locally (for the demo)

```bash
npm install
npm run dev          # http://localhost:3000
```

- **Login:** `alex@aquawatch.dev` / `demo1234` (admin)
- **Turn on live data:** Settings → Data Source → **Live**, set a poll interval.
- **Trigger an alert to demo:** Testing page → inject an out-of-range value,
  or use the fault-injection tool.

> Tip: if you ever see odd type errors during `npm run dev`, delete the `.next`
> folder and restart — that clears a stale build cache.
