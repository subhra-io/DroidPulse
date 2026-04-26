# DroidPulse — Why We Should Replace Mixpanel

## The Problem with Mixpanel

| Pain Point | Mixpanel | DroidPulse |
|---|---|---|
| Event lag | 15–60s delay after refresh | ~50ms — WebSocket push, no polling |
| Android-specific data | Generic events only | FPS, memory, startup time, ANR, crash traces built-in |
| Root cause analysis | You figure it out | Plain-English diagnosis + code fix suggestion |
| Data ownership | Their servers, their terms | Self-hosted on our own infra |
| Cost | $28–$833/mo depending on volume | $0 — runs on our own servers |
| SDK size | ~2MB + dependencies | Modular — use only what you need |
| Live debugging | Not possible | Real-time WebSocket stream to dashboard |
| Crash reproduction | Not possible | One-click trace replay |
| Device simulation | Not possible | Device Twin — simulate 2G, low memory, etc. |
| CI/CD integration | Manual | Built-in regression detection, blocks bad deploys |

---

## What DroidPulse Does That Mixpanel Cannot

### 1. Real-Time, Zero Lag
Events stream from the Android device → backend → dashboard via WebSocket in ~50ms.
No batch processing. No "refresh and wait". What happens on the device appears instantly.

### 2. Android-Native Metrics
Mixpanel tracks button clicks. DroidPulse tracks what actually makes Android apps slow:
- Frame rate (FPS) and jank detection
- Memory usage and low-memory warnings
- App startup time (cold/warm/hot)
- ANR (App Not Responding) detection
- Network call timing per endpoint
- Screen transition durations

### 3. "Why Is This Slow?" — Automated Diagnosis
The Diagnostics tab doesn't just show data — it tells you what's wrong and how to fix it:
```
🔴 LoginActivity is Very Slow to Open
   Takes 1,840ms (target: <300ms)
   Fix: Move heavy work to viewModel.init { } or use LaunchedEffect { }
```
Mixpanel shows you a number. DroidPulse tells you what to do about it.

### 4. Device Twin Simulation
Test how your app behaves on a 2G network or a low-memory device without touching hardware.
Simulate any device profile directly from the dashboard.

### 5. Crash Trace Reproduction
When a crash happens, DroidPulse records the exact sequence of events that led to it.
One click replays that sequence in the dashboard so you can see exactly what the user did.

### 6. Version Regression Detection
Every new app version is automatically compared against the previous baseline.
If FPS drops >15% or startup time increases >20%, an alert fires before users complain.

### 7. Full Data Ownership
All data stays on our servers. No third-party terms of service. No data leaving the building.
GDPR/compliance is our call, not Mixpanel's.

### 8. Role-Based Access
6 roles built in: `super_admin`, `admin`, `developer`, `analyst`, `viewer`, `sdk`.
Each role sees only what they need. Audit log tracks every action.

---

## What's Already Built

### Android SDK (7 modules — drop-in Gradle dependency)
- [x] Auto lifecycle tracking (Activity + Fragment)
- [x] OkHttp network interceptor — zero code change needed
- [x] Memory monitoring with low-memory alerts
- [x] FPS monitoring and jank detection
- [x] Crash and ANR detection
- [x] Cloud event upload with retry + offline queue
- [x] Local WebSocket server for live debugging
- [x] Device Twin simulation engine
- [x] Crash trace reproduction

### Cloud Backend (Node.js)
- [x] REST API — sessions, events, analytics, alerts, CI reports
- [x] WebSocket relay — instant push to dashboard
- [x] JWT auth with 6 roles and full permission matrix
- [x] Audit log — every action tracked
- [x] Regression detection — auto-compares versions
- [x] Funnel analysis
- [x] Performance-revenue correlation
- [x] User profiles and identification
- [x] Session export (JSON + CSV)
- [x] CI/CD report endpoint (`/api/ci-report`)

### Web Dashboard (Next.js)
- [x] Login with role-based tab visibility
- [x] Overview — live health score, FPS, memory, crash-free rate
- [x] Analytics — event trends, funnel, perf correlation
- [x] Network tab — live stream, analysis, security scan
- [x] Flow Trace — screen journey visualisation
- [x] Heatmap — per-screen performance heat
- [x] Diagnostics — crash root cause + Device Twin + trace replay
- [x] Session History — historical sessions with export
- [x] Regression Alerts
- [x] Admin Panel — user and project management
- [x] Version Compare — side-by-side version metrics

---

## What Needs to Happen Before Production

### Must Do (blockers)

| # | Task | Why |
|---|---|---|
| 1 | Migrate SQLite → PostgreSQL | SQLite locks on concurrent writes — breaks at 10+ devices |
| 2 | Set `JWT_SECRET` env var | Currently falls back to a hardcoded dev string |
| 3 | Change default admin password | `admin123` is seeded in the DB on first run |
| 4 | Rotate demo API key | `dp_live_demo_key_12345` is in the codebase |
| 5 | Add CORS allowlist | Currently open (`*`) — restrict to our dashboard domain |
| 6 | TLS / HTTPS on nginx | Browsers block `ws://` on HTTPS pages — need `wss://` |
| 7 | Set `NEXT_PUBLIC_CLOUD_API` + `NEXT_PUBLIC_CLOUD_WS` env vars | Dashboard points to localhost by default |

### Should Do (before wide rollout)

| # | Task | Why |
|---|---|---|
| 8 | Add rate limiting on `/api/events` | Prevent a rogue SDK from flooding the DB |
| 9 | Tag a versioned SDK release on JitPack | So apps can pin a version instead of using `main` |
| 10 | Add ProGuard consumer rules to AAR | Ensure SDK survives minification in host apps |
| 11 | Replace `10.0.2.2` dev endpoint with build-variant config | Physical device testing needs a real IP |
| 12 | Add DB backup cron | Nightly pg_dump to object storage |

### Nice to Have (post-launch)

| # | Task | Why |
|---|---|---|
| 13 | Slack/email webhook on alerts | Notify team when crash rate spikes |
| 14 | Multi-app onboarding flow | Auto-generate API key when a new project is created via UI |
| 15 | ClickHouse migration for events table | Faster analytical queries at 1M+ events/day (already in docker-compose) |
| 16 | SDK for iOS | Expand beyond Android |

---

## Migration from Mixpanel

### Step 1 — Run both in parallel (Week 1–2)
Keep Mixpanel running. Add DroidPulse SDK alongside it.
Compare data — validate that DroidPulse is capturing the same events.

### Step 2 — Move custom events (Week 2–3)
Replace `mixpanel.track("button_click", props)` with `DroidPulse.track("button_click", props)`.
DroidPulse automatically enriches every event with performance context (FPS, memory, startup time).

### Step 3 — Validate dashboards (Week 3–4)
Confirm Analytics, Funnel, and Session History tabs show equivalent data.
Share dashboard access with the analytics team.

### Step 4 — Cut over (Week 4)
Remove Mixpanel SDK. Cancel subscription.

---

## Feature Roadmap (Post-Launch)

| Feature | Value |
|---|---|
| iOS SDK | Same monitoring for iOS apps |
| Slack / Teams alerts | Real-time crash notifications |
| Custom dashboards | Drag-and-drop metric widgets |
| A/B test performance impact | See if a feature flag affects FPS or startup |
| User session replay (UI) | Visual replay of what the user tapped |
| Automated performance budgets | Block a PR if startup time exceeds threshold |
| Public status page | Show app health to stakeholders |
| Multi-region support | Data residency compliance |

---

## One-Line Pitch

> "DroidPulse is what you get when you combine Mixpanel's analytics, Sentry's crash tracking, and Firebase Performance — built specifically for Android, running on our own servers, at zero licensing cost."
