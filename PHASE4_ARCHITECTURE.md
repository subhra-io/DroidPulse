# 🌐 Phase 4 — DroidPulse SaaS Architecture

## Overview

```
BEFORE (Phase 1-3):          AFTER (Phase 4):
─────────────────────        ──────────────────────────────────
Device → localhost            Device → Cloud API → Dashboard
One developer                 Whole team
No history                    All sessions stored
No comparison                 Version regression alerts
Manual testing                CI/CD automated
```

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        ANDROID DEVICE                           │
│                                                                 │
│  DroidPulse SDK                                                 │
│  ├── All existing trackers (Phase 1-3)                          │
│  ├── CloudUploader (NEW) ─────────────────────────────────────┐ │
│  │   ├── Batches events every 5 seconds                       │ │
│  │   ├── Retries on failure                                   │ │
│  │   └── Works offline (queues events)                        │ │
│  └── SessionManager (NEW)                                     │ │
│      ├── Unique session ID per app launch                     │ │
│      ├── App version, device info                             │ │
│      └── Build type (debug/staging/release)                   │ │
└───────────────────────────────────────────────────────────────┼─┘
                                                                │
                                                    HTTPS + API Key
                                                                │
┌───────────────────────────────────────────────────────────────▼─┐
│                      CLOUD BACKEND (Node.js)                    │
│                                                                 │
│  POST /api/events          ← Receives batched events            │
│  POST /api/sessions        ← Creates new session                │
│  GET  /api/sessions        ← Lists all sessions                 │
│  GET  /api/compare         ← Version comparison                 │
│  POST /api/alerts          ← Regression detection               │
│  GET  /api/ci-report       ← CI/CD report endpoint              │
│                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐   │
│  │  PostgreSQL  │  │    Redis     │  │   Alert Engine      │   │
│  │  (sessions, │  │  (realtime   │  │   (regression       │   │
│  │   events)   │  │   pub/sub)   │  │    detection)       │   │
│  └─────────────┘  └──────────────┘  └─────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                │
                    WebSocket (realtime)
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                   CLOUD DASHBOARD (Next.js)                     │
│                   dashboard.droidpulse.dev                      │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Team View   │  │  Sessions    │  │  Version Compare     │  │
│  │  All devices │  │  History     │  │  v1.2 vs v1.3        │  │
│  │  Live data   │  │  Replay      │  │  Regression alerts   │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │  CI/CD       │  │  Alerts      │                            │
│  │  Reports     │  │  Slack/Email │                            │
│  └──────────────┘  └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## What We're Building

### 1. SDK Changes (Minimal)
- `CloudUploader.kt` — batches and uploads events to cloud
- `CloudConfig.kt` — API key, project ID, upload interval
- `DroidPulseConfig` — add `cloudApiKey` and `projectId`

### 2. Cloud Backend (Node.js + PostgreSQL)
- REST API for receiving events
- WebSocket for real-time dashboard
- Regression detection engine
- CI/CD report generation

### 3. Cloud Dashboard (Next.js)
- Team sessions view
- Version comparison
- Regression alerts
- CI/CD integration page

### 4. CI/CD CLI Tool
- `npx droidpulse-ci report --version 1.3 --baseline 1.2`
- Returns pass/fail based on performance thresholds

---

## Data Model

```sql
-- Projects (one per app)
projects (
    id, name, api_key, team_id, created_at
)

-- Sessions (one per app launch)
sessions (
    id, project_id, app_version, build_type,
    device_model, os_version, started_at, ended_at,
    startup_ms, crash_count
)

-- Events (all SDK events)
events (
    id, session_id, type, data_json, timestamp
)

-- Alerts (regression notifications)
alerts (
    id, project_id, metric, baseline_version,
    current_version, baseline_value, current_value,
    change_percent, severity, created_at
)
```

---

## Pricing Model (SaaS)

| Plan | Price | Sessions/mo | Team | Retention |
|------|-------|-------------|------|-----------|
| Free | $0 | 1,000 | 1 dev | 7 days |
| Starter | $29/mo | 10,000 | 5 devs | 30 days |
| Pro | $99/mo | 100,000 | 20 devs | 90 days |
| Enterprise | Custom | Unlimited | Unlimited | 1 year |

---

## Build Order

1. ✅ SDK: CloudUploader + CloudConfig
2. ✅ Backend: Node.js API server
3. ✅ Dashboard: Cloud version
4. ✅ Version comparison
5. ✅ CI/CD CLI tool
6. ✅ Alerts engine
