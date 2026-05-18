const express    = require('express')
const cors       = require('cors')
const http       = require('http')
const WebSocket  = require('ws')
const Database   = require('better-sqlite3')
const { initSchema } = require('./db/schema')
const {
  requireAuth, requireSdkKey, requirePermission,
  createAuthRoutes, createUserRoutes, auditLog,
} = require('./auth')

// ── New feature modules ───────────────────────────────────────────────────────
const { mergeSuperProperties }   = require('./routes/superProperties')
const { updateRetention }        = require('./routes/retention')
const { recordPathStep }         = require('./routes/userPaths')
const { recordExperimentResult } = require('./routes/experiments')
const { deliverAlert }           = require('./routes/alerting')

const app    = express()
const server = http.createServer(app)
const wss    = new WebSocket.Server({ server })

// ── Database ──────────────────────────────────────────────────────────────────
const db = new Database(process.env.DB_PATH || './droidpulse.db')
db.pragma('journal_mode = WAL')
initSchema(db)

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors())
app.use(express.json({ limit: '5mb' }))

// ── Auth routes ───────────────────────────────────────────────────────────────
app.use('/auth',        createAuthRoutes(db, auditLog))
app.use('/admin/users', createUserRoutes(db, auditLog))

const authenticate = requireSdkKey(db)

// ── Scope middleware: attach req.project for JWT dashboard routes ──────────────
const scopeForDashboard = (req, res, next) => {
  if (req.project) return next()
  const projectId = req.query.projectId || req.body?.projectId
  if (!projectId) return res.status(400).json({ error: 'projectId required' })
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId)
  if (!project)  return res.status(404).json({ error: 'Project not found' })
  req.project = project
  next()
}

// Combined dashboard auth middleware (JWT + project scope)
const dashboardAuthMiddleware = (req, res, next) => {
  requireAuth(req, res, (err) => {
    if (err) return next(err)
    scopeForDashboard(req, res, next)
  })
}

const noopAuth = (_req, _res, next) => next()

// ── Mount new feature routers ─────────────────────────────────────────────────
app.use('/api/super-properties', dashboardAuthMiddleware, require('./routes/superProperties').router(db, noopAuth, requirePermission))
app.use('/api/retention',        dashboardAuthMiddleware, require('./routes/retention').router(db,        noopAuth, requirePermission))
app.use('/api/paths',            dashboardAuthMiddleware, require('./routes/userPaths').router(db,        noopAuth, requirePermission))
app.use('/api/segment',          dashboardAuthMiddleware, require('./routes/segmentation').router(db,     noopAuth, requirePermission))
app.use('/api/experiments',      dashboardAuthMiddleware, require('./routes/experiments').router(db,      noopAuth, requirePermission, requireSdkKey(db)))
app.use('/api/alert-channels',   dashboardAuthMiddleware, require('./routes/alerting').router(db,         noopAuth, requirePermission))
app.use('/api/export',           dashboardAuthMiddleware, require('./routes/dataExport').router(db,       noopAuth, requirePermission))

// ── WebSocket: broadcast to dashboard clients ─────────────────────────────────
const dashboardClients = new Map()

wss.on('connection', (ws, req) => {
  const projectId = new URL(req.url, 'http://localhost').searchParams.get('projectId')
  if (!projectId) { ws.close(); return }
  if (!dashboardClients.has(projectId)) dashboardClients.set(projectId, new Set())
  dashboardClients.get(projectId).add(ws)
  console.log(`📊 Dashboard connected for project: ${projectId}`)
  ws.on('close', () => dashboardClients.get(projectId)?.delete(ws))
})

const broadcast = (projectId, data) => {
  const clients = dashboardClients.get(projectId)
  if (!clients) return
  const msg = JSON.stringify(data)
  clients.forEach(ws => { if (ws.readyState === WebSocket.OPEN) ws.send(msg) })
}

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '2.0.0', timestamp: Date.now(), features: [
    'super-properties', 'retention-cohorts', 'user-paths',
    'segmentation', 'ab-testing', 'alerting', 'data-export'
  ]})
})

// ── POST /api/sessions ────────────────────────────────────────────────────────
app.post('/api/sessions', authenticate, (req, res) => {
  const { sessionId, appVersion, buildType, deviceModel, osVersion, startedAt } = req.body
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' })

  db.prepare(`
    INSERT OR REPLACE INTO sessions
    (id, project_id, app_version, build_type, device_model, os_version, started_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(sessionId, req.project.id, appVersion, buildType, deviceModel, osVersion, startedAt)

  broadcast(req.project.id, { event: 'session_started', sessionId, appVersion, buildType, deviceModel, osVersion })
  console.log(`📱 New session: ${sessionId.slice(0,8)} | ${appVersion} | ${deviceModel}`)
  res.status(201).json({ sessionId, projectId: req.project.id })
})

// ── POST /api/events ──────────────────────────────────────────────────────────
app.post('/api/events', authenticate, (req, res) => {
  const { sessionId, events } = req.body
  if (!sessionId || !Array.isArray(events)) {
    return res.status(400).json({ error: 'sessionId and events[] required' })
  }

  const existingSession = db.prepare('SELECT id FROM sessions WHERE id = ?').get(sessionId)
  if (!existingSession) {
    db.prepare(`INSERT OR IGNORE INTO sessions (id, project_id, app_version, build_type, started_at) VALUES (?, ?, ?, ?, ?)`)
      .run(sessionId, req.project.id, 'unknown', 'debug', Date.now())
  }

  const insertEvent = db.prepare(`INSERT INTO events (session_id, project_id, type, data, timestamp) VALUES (?, ?, ?, ?, ?)`)
  db.transaction((evts) => {
    for (const evt of evts) insertEvent.run(sessionId, req.project.id, evt.type, JSON.stringify(evt), evt.timestamp)
  })(events)

  db.prepare(`UPDATE sessions SET event_count = event_count + ? WHERE id = ?`).run(events.length, sessionId)

  const crashes = events.filter(e => e.type === 'crash').length
  if (crashes > 0) db.prepare(`UPDATE sessions SET crash_count = crash_count + ? WHERE id = ?`).run(crashes, sessionId)

  const startupEvent = events.find(e => e.type === 'startup')
  if (startupEvent?.totalMs) db.prepare(`UPDATE sessions SET startup_ms = ? WHERE id = ?`).run(startupEvent.totalMs, sessionId)

  // Record screen events into user_paths for flow analysis
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId)
  events.filter(e => e.type === 'screen' || e.type === 'lifecycle').forEach(e => {
    recordPathStep(db, req.project.id, sessionId, null, e.screenName || e.type, e.screenName, e.timestamp)
  })

  broadcast(req.project.id, { event: 'events', sessionId, events })
  setImmediate(() => checkRegressions(req.project.id, events))
  res.json({ received: events.length })
})

// ── GET /api/sessions ─────────────────────────────────────────────────────────
app.get('/api/sessions', authenticate, (req, res) => {
  const { version, limit = 20, offset = 0 } = req.query
  let query = `SELECT s.*, (SELECT COUNT(*) FROM events WHERE session_id = s.id AND type = 'crash') as crashes FROM sessions s WHERE s.project_id = ?`
  const params = [req.project.id]
  if (version) { query += ' AND s.app_version = ?'; params.push(version) }
  query += ' ORDER BY s.started_at DESC LIMIT ? OFFSET ?'
  params.push(parseInt(limit), parseInt(offset))
  const sessions = db.prepare(query).all(...params)
  const total = db.prepare('SELECT COUNT(*) as n FROM sessions WHERE project_id = ?').get(req.project.id).n
  res.json({ sessions, total })
})

// ── GET /api/sessions/:id/events ──────────────────────────────────────────────
app.get('/api/sessions/:id/events', authenticate, (req, res) => {
  const { type } = req.query
  let query = 'SELECT * FROM events WHERE session_id = ? AND project_id = ?'
  const params = [req.params.id, req.project.id]
  if (type) { query += ' AND type = ?'; params.push(type) }
  query += ' ORDER BY timestamp ASC'
  const events = db.prepare(query).all(...params).map(e => ({ ...JSON.parse(e.data), _id: e.id }))
  res.json({ events })
})

// ── GET /api/sessions/:id/export ──────────────────────────────────────────────
app.get('/api/sessions/:id/export', authenticate, (req, res) => {
  const { format = 'json' } = req.query
  const session = db.prepare('SELECT * FROM sessions WHERE id = ? AND project_id = ?').get(req.params.id, req.project.id)
  if (!session) return res.status(404).json({ error: 'Session not found' })
  const events = db.prepare('SELECT * FROM events WHERE session_id = ? ORDER BY timestamp ASC').all(req.params.id)
    .map(e => ({ ...JSON.parse(e.data), _id: e.id }))

  if (format === 'csv') {
    const allKeys = new Set()
    events.forEach(e => Object.keys(e).forEach(k => allKeys.add(k)))
    const keys = [...allKeys]
    const escape = v => { if (v == null) return ''; const s = String(v); return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s }
    const rows = [keys.join(','), ...events.map(e => keys.map(k => escape(e[k])).join(','))]
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="session-${req.params.id.slice(0,8)}.csv"`)
    return res.send(rows.join('\n'))
  }
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Content-Disposition', `attachment; filename="session-${req.params.id.slice(0,8)}.json"`)
  res.json({ exportedAt: new Date().toISOString(), session, eventCount: events.length, events })
})

// ── DELETE /api/sessions/:id ──────────────────────────────────────────────────
app.delete('/api/sessions/:id', authenticate, (req, res) => {
  const session = db.prepare('SELECT id FROM sessions WHERE id = ? AND project_id = ?').get(req.params.id, req.project.id)
  if (!session) return res.status(404).json({ error: 'Session not found' })
  db.prepare('DELETE FROM events WHERE session_id = ?').run(req.params.id)
  db.prepare('DELETE FROM sessions WHERE id = ?').run(req.params.id)
  res.json({ deleted: req.params.id })
})

// ── POST /api/analytics/track ─────────────────────────────────────────────────
app.post('/api/analytics/track', authenticate, (req, res) => {
  const { sessionId, events: analyticsEvents } = req.body
  if (!sessionId || !Array.isArray(analyticsEvents)) {
    return res.status(400).json({ error: 'sessionId and events[] required' })
  }

  const insert = db.prepare(`
    INSERT INTO analytics_events
      (session_id, project_id, event_name, user_id, properties,
       startup_time_ms, memory_mb, fps_avg, perf_score, crash_free, revenue, currency, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertFunnel = db.prepare(`
    INSERT INTO funnel_events (session_id, project_id, user_id, funnel_name, step_name, perf_score, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  db.transaction(() => {
    for (const evt of analyticsEvents) {
      // FEATURE 5: Merge super properties (project-level globals)
      const rawProps    = evt.properties || {}
      const mergedProps = mergeSuperProperties(db, req.project.id, rawProps)

      insert.run(
        sessionId, req.project.id,
        evt.event_name,
        mergedProps.user_id || null,
        JSON.stringify(mergedProps),
        evt.startup_time_ms || 0,
        evt.memory_mb || 0,
        evt.fps_avg || 0,
        evt.perf_score || 0,
        evt.crash_free ? 1 : 0,
        evt.revenue || 0,
        evt.currency || 'USD',
        evt.timestamp || Date.now()
      )

      // Auto-track funnel steps
      if (evt.event_name === 'funnel_step' && mergedProps.funnel_name && mergedProps.step_name) {
        insertFunnel.run(sessionId, req.project.id, mergedProps.user_id || null,
          mergedProps.funnel_name, mergedProps.step_name, evt.perf_score || 0, evt.timestamp || Date.now())
      }

      // FEATURE 1: Update retention cohort
      if (mergedProps.user_id) {
        updateRetention(db, req.project.id, mergedProps.user_id)
      }

      // FEATURE 2: Record path step for flow analysis
      recordPathStep(db, req.project.id, sessionId, mergedProps.user_id || null,
        evt.event_name, mergedProps.screen || null, evt.timestamp || Date.now())

      // FEATURE 4: Record experiment result
      if (mergedProps.user_id) {
        recordExperimentResult(db, req.project.id, mergedProps.user_id, evt.event_name, evt.revenue || 1)
      }
    }
  })()

  broadcast(req.project.id, { event: 'analytics', sessionId, events: analyticsEvents })
  res.json({ received: analyticsEvents.length })
})

// ── POST /api/analytics/identify ─────────────────────────────────────────────
app.post('/api/analytics/identify', authenticate, (req, res) => {
  const { userId, properties = {} } = req.body
  if (!userId) return res.status(400).json({ error: 'userId required' })

  const now = Date.now()
  db.prepare(`
    INSERT INTO user_profiles (project_id, user_id, properties, first_seen, last_seen)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(project_id, user_id) DO UPDATE SET
      properties = excluded.properties,
      last_seen  = excluded.last_seen
  `).run(req.project.id, userId, JSON.stringify(properties), now, now)

  // FEATURE 1: Seed retention cohort on identify
  updateRetention(db, req.project.id, userId)

  res.json({ userId, updated: true })
})

// ── GET /api/analytics/events ─────────────────────────────────────────────────
app.get('/api/analytics/events', authenticate, (req, res) => {
  const { from, to, limit = 20 } = req.query
  const fromTs = from ? parseInt(from) : Date.now() - 7 * 24 * 60 * 60 * 1000
  const toTs   = to   ? parseInt(to)   : Date.now()

  const topEvents = db.prepare(`
    SELECT event_name, COUNT(*) AS total, AVG(perf_score) AS avg_perf,
           AVG(startup_time_ms) AS avg_startup, SUM(revenue) AS total_revenue,
           SUM(CASE WHEN crash_free=0 THEN 1 ELSE 0 END) AS crash_sessions
    FROM analytics_events
    WHERE project_id = ? AND timestamp BETWEEN ? AND ?
    GROUP BY event_name ORDER BY total DESC LIMIT ?
  `).all(req.project.id, fromTs, toTs, parseInt(limit))

  const hourly = db.prepare(`
    SELECT (timestamp / 3600000) * 3600000 AS hour, COUNT(*) AS count
    FROM analytics_events
    WHERE project_id = ? AND timestamp >= ?
    GROUP BY hour ORDER BY hour ASC
  `).all(req.project.id, Date.now() - 24 * 60 * 60 * 1000)

  res.json({ topEvents, hourly })
})

// ── GET /api/analytics/funnel/:name ──────────────────────────────────────────
app.get('/api/analytics/funnel/:name', authenticate, (req, res) => {
  const { from, to } = req.query
  const fromTs = from ? parseInt(from) : Date.now() - 7 * 24 * 60 * 60 * 1000
  const toTs   = to   ? parseInt(to)   : Date.now()

  const steps = db.prepare(`
    SELECT step_name, COUNT(DISTINCT user_id) AS users, AVG(perf_score) AS avg_perf, MIN(timestamp) AS first_seen
    FROM funnel_events
    WHERE project_id = ? AND funnel_name = ? AND timestamp BETWEEN ? AND ?
    GROUP BY step_name ORDER BY first_seen ASC
  `).all(req.project.id, req.params.name, fromTs, toTs)

  const withDropoff = steps.map((step, i) => {
    const prev = steps[i - 1]
    return { ...step, dropoff_pct: prev ? Math.round((1 - step.users / prev.users) * 100) : 0 }
  })

  res.json({ funnel: req.params.name, steps: withDropoff })
})

// ── GET /api/analytics/perf-correlation ──────────────────────────────────────
app.get('/api/analytics/perf-correlation', authenticate, (req, res) => {
  const { event, from, to } = req.query
  const fromTs = from ? parseInt(from) : Date.now() - 7 * 24 * 60 * 60 * 1000
  const toTs   = to   ? parseInt(to)   : Date.now()

  const rows = db.prepare(`
    SELECT
      CASE WHEN perf_score >= 85 THEN 'excellent' WHEN perf_score >= 70 THEN 'good'
           WHEN perf_score >= 50 THEN 'poor' ELSE 'critical' END AS tier,
      COUNT(*) AS event_count, AVG(startup_time_ms) AS avg_startup
    FROM analytics_events
    WHERE project_id = ? AND (? IS NULL OR event_name = ?) AND timestamp BETWEEN ? AND ?
    GROUP BY tier ORDER BY event_count DESC
  `).all(req.project.id, event || null, event || null, fromTs, toTs)

  res.json({ correlation: rows })
})

// ── GET /api/analytics/users ──────────────────────────────────────────────────
app.get('/api/analytics/users', authenticate, (req, res) => {
  const { limit = 50 } = req.query
  const users = db.prepare(`
    SELECT u.*,
      (SELECT COUNT(*) FROM analytics_events WHERE project_id = u.project_id AND user_id = u.user_id) AS event_count,
      (SELECT AVG(perf_score) FROM analytics_events WHERE project_id = u.project_id AND user_id = u.user_id) AS avg_perf,
      (SELECT SUM(revenue) FROM analytics_events WHERE project_id = u.project_id AND user_id = u.user_id) AS total_revenue
    FROM user_profiles u WHERE u.project_id = ?
    ORDER BY u.last_seen DESC LIMIT ?
  `).all(req.project.id, parseInt(limit))

  res.json({ users: users.map(u => ({ ...u, properties: JSON.parse(u.properties || '{}') })) })
})

// ── GET /api/compare ──────────────────────────────────────────────────────────
app.get('/api/compare', authenticate, (req, res) => {
  const { v1, v2 } = req.query
  if (!v1 || !v2) return res.status(400).json({ error: 'v1 and v2 required' })

  const getMetrics = (version) => {
    const sessions = db.prepare(`SELECT id FROM sessions WHERE project_id = ? AND app_version = ?`)
      .all(req.project.id, version).map(s => s.id)
    if (sessions.length === 0) return null
    const ph = sessions.map(() => '?').join(',')
    const fps     = db.prepare(`SELECT AVG(json_extract(data,'$.fps')) as v FROM events WHERE session_id IN (${ph}) AND type='fps'`).get(...sessions)
    const startup = db.prepare(`SELECT AVG(json_extract(data,'$.totalMs')) as v FROM events WHERE session_id IN (${ph}) AND type='startup'`).get(...sessions)
    const memory  = db.prepare(`SELECT AVG(json_extract(data,'$.usedMemoryMb')) as v FROM events WHERE session_id IN (${ph}) AND type='memory'`).get(...sessions)
    const network = db.prepare(`SELECT AVG(json_extract(data,'$.duration')) as v FROM events WHERE session_id IN (${ph}) AND type='network'`).get(...sessions)
    const crashes = db.prepare(`SELECT COUNT(*) as v FROM events WHERE session_id IN (${ph}) AND type='crash'`).get(...sessions)
    return { version, sessions: sessions.length, avgFps: Math.round(fps?.v ?? 0), avgStartupMs: Math.round(startup?.v ?? 0), avgMemoryMb: Math.round(memory?.v ?? 0), avgApiMs: Math.round(network?.v ?? 0), crashCount: crashes?.v ?? 0 }
  }

  const metrics1 = getMetrics(v1)
  const metrics2 = getMetrics(v2)
  if (!metrics1) return res.status(404).json({ error: `No data for version ${v1}` })
  if (!metrics2) return res.status(404).json({ error: `No data for version ${v2}` })

  const regressions = [], improvements = []
  const check = (metric, label, v1val, v2val, higherIsBetter) => {
    if (!v1val || !v2val) return
    const change = ((v2val - v1val) / v1val) * 100
    if (higherIsBetter ? change < -10 : change > 10) regressions.push({ metric: label, v1: v1val, v2: v2val, change: Math.round(change) })
    if (higherIsBetter ? change > 5  : change < -5)  improvements.push({ metric: label, v1: v1val, v2: v2val, change: Math.round(change) })
  }
  check('fps', 'FPS', metrics1.avgFps, metrics2.avgFps, true)
  check('startup', 'Startup Time', metrics1.avgStartupMs, metrics2.avgStartupMs, false)
  check('memory', 'Memory Usage', metrics1.avgMemoryMb, metrics2.avgMemoryMb, false)
  check('api', 'API Speed', metrics1.avgApiMs, metrics2.avgApiMs, false)
  check('crashes', 'Crashes', metrics1.crashCount, metrics2.crashCount, false)
  res.json({ v1: metrics1, v2: metrics2, regressions, improvements })
})

// ── GET /api/ci-report ────────────────────────────────────────────────────────
app.get('/api/ci-report', authenticate, (req, res) => {
  const { version, baseline, format = 'json' } = req.query
  if (!version || !baseline) return res.status(400).json({ error: 'version and baseline required' })

  const getMetrics = (ver) => {
    const sessions = db.prepare(`SELECT id FROM sessions WHERE project_id = ? AND app_version = ?`).all(req.project.id, ver).map(s => s.id)
    if (sessions.length === 0) return null
    const ph = sessions.map(() => '?').join(',')
    const fps     = db.prepare(`SELECT AVG(json_extract(data,'$.fps')) as v FROM events WHERE session_id IN (${ph}) AND type='fps'`).get(...sessions)
    const startup = db.prepare(`SELECT AVG(json_extract(data,'$.totalMs')) as v FROM events WHERE session_id IN (${ph}) AND type='startup'`).get(...sessions)
    const crashes = db.prepare(`SELECT COUNT(*) as v FROM events WHERE session_id IN (${ph}) AND type='crash'`).get(...sessions)
    return { version: ver, avgFps: Math.round(fps?.v ?? 0), avgStartupMs: Math.round(startup?.v ?? 0), crashCount: crashes?.v ?? 0 }
  }

  const base = getMetrics(baseline)
  const curr = getMetrics(version)
  if (!base || !curr) return res.status(404).json({ error: 'Insufficient data for comparison' })

  const checks = [
    { name: 'FPS',     pass: curr.avgFps >= base.avgFps * 0.9,            baseline: base.avgFps,       current: curr.avgFps,       unit: 'fps' },
    { name: 'Startup', pass: curr.avgStartupMs <= base.avgStartupMs * 1.1, baseline: base.avgStartupMs, current: curr.avgStartupMs, unit: 'ms' },
    { name: 'Crashes', pass: curr.crashCount <= base.crashCount + 1,       baseline: base.crashCount,   current: curr.crashCount,   unit: 'crashes' },
  ]
  const passed = checks.every(c => c.pass)

  if (format === 'text') {
    let out = `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n  DroidPulse CI Report\n  ${baseline} → ${version}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    checks.forEach(c => { out += `  ${c.pass ? '✅' : '❌'} ${c.name}: ${c.baseline}${c.unit} → ${c.current}${c.unit}\n` })
    out += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n  Result: ${passed ? '✅ PASSED' : '❌ FAILED'}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    return res.type('text').send(out)
  }
  res.json({ passed, exitCode: passed ? 0 : 1, baseline, version, checks })
})

// ── GET /api/alerts ───────────────────────────────────────────────────────────
app.get('/api/alerts', authenticate, (req, res) => {
  const alerts = db.prepare(`SELECT * FROM alerts WHERE project_id = ? ORDER BY created_at DESC LIMIT 50`).all(req.project.id)
  res.json({ alerts })
})

// ── Admin routes ──────────────────────────────────────────────────────────────
app.get('/admin/audit', requireAuth, requirePermission('audit:read'), (req, res) => {
  const { limit = 100 } = req.query
  const logs = db.prepare(`SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT ?`).all(parseInt(limit))
  res.json({ logs })
})

app.get('/admin/projects', requireAuth, requirePermission('projects:write'), (req, res) => {
  const projects = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all()
  res.json({ projects })
})

app.post('/admin/projects', requireAuth, requirePermission('projects:write'), (req, res) => {
  const { name } = req.body
  if (!name) return res.status(400).json({ error: 'name required' })
  const { v4: uuid } = require('uuid')
  const id     = `proj-${uuid().slice(0, 8)}`
  const apiKey = `dp_${uuid().replace(/-/g, '').slice(0, 32)}`
  db.prepare('INSERT INTO projects (id, name, api_key) VALUES (?, ?, ?)').run(id, name, apiKey)
  auditLog(db, req.user.id, req.user.email, 'create_project', `project:${id}`, `name=${name}`, req.ip)
  res.status(201).json({ id, name, apiKey })
})

// ── Regression detection + alert delivery ────────────────────────────────────
const checkRegressions = (projectId, events) => {
  const fpsEvents     = events.filter(e => e.type === 'fps')
  const startupEvents = events.filter(e => e.type === 'startup')
  const crashEvents   = events.filter(e => e.type === 'crash')

  if (fpsEvents.length === 0 && startupEvents.length === 0 && crashEvents.length === 0) return

  const sessionId = events[0]?.sessionId
  if (!sessionId) return
  const session = db.prepare('SELECT app_version FROM sessions WHERE id = ?').get(sessionId)
  if (!session?.app_version) return
  const version = session.app_version

  const baseline = db.prepare(`
    SELECT avg_fps, avg_startup_ms, crash_rate FROM version_metrics
    WHERE project_id = ? AND app_version != ? ORDER BY computed_at DESC LIMIT 1
  `).get(projectId, version)

  if (!baseline) return

  const insertAlert = (metric, baselineVal, currentVal, severity) => {
    const change = Math.round(((currentVal - baselineVal) / baselineVal) * 100)
    const result = db.prepare(`
      INSERT INTO alerts (project_id, metric, baseline_version, current_version, baseline_value, current_value, change_percent, severity)
      VALUES (?, ?, 'baseline', ?, ?, ?, ?, ?)
    `).run(projectId, metric, version, baselineVal, currentVal, change, severity)

    // FEATURE 6: Deliver alert to configured channels
    const alert = db.prepare('SELECT * FROM alerts WHERE id = ?').get(result.lastInsertRowid)
    if (alert) setImmediate(() => deliverAlert(db, projectId, alert))
  }

  if (fpsEvents.length > 0) {
    const avgFps = fpsEvents.reduce((s, e) => s + (e.fps || 0), 0) / fpsEvents.length
    if (baseline.avg_fps && avgFps < baseline.avg_fps * 0.85) insertAlert('fps', baseline.avg_fps, avgFps, 'warning')
  }

  if (startupEvents.length > 0) {
    const avgStartup = startupEvents.reduce((s, e) => s + (e.totalMs || 0), 0) / startupEvents.length
    if (baseline.avg_startup_ms && avgStartup > baseline.avg_startup_ms * 1.2) insertAlert('startup', baseline.avg_startup_ms, avgStartup, 'critical')
  }

  if (crashEvents.length > 0) insertAlert('crash', 0, crashEvents.length, 'critical')

  db.prepare(`
    INSERT INTO version_metrics (project_id, app_version, avg_fps, avg_startup_ms, session_count)
    VALUES (?, ?, ?, ?, 1)
    ON CONFLICT(project_id, app_version) DO UPDATE SET
      avg_fps        = (avg_fps * session_count + excluded.avg_fps) / (session_count + 1),
      avg_startup_ms = (avg_startup_ms * session_count + excluded.avg_startup_ms) / (session_count + 1),
      session_count  = session_count + 1,
      computed_at    = strftime('%s','now') * 1000
  `).run(
    projectId, version,
    fpsEvents.length > 0 ? fpsEvents.reduce((s, e) => s + (e.fps || 0), 0) / fpsEvents.length : 0,
    startupEvents.length > 0 ? startupEvents[0].totalMs || 0 : 0
  )
}

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`  ⚡ DroidPulse Cloud Backend v2.0`)
  console.log(`  🌐 HTTP:  http://localhost:${PORT}`)
  console.log(`  📡 WS:    ws://localhost:${PORT}`)
  console.log(`  🔑 Demo API key: dp_live_demo_key_12345`)
  console.log(`  ✅ Features: super-props | retention | paths | segments | a/b | alerts | export`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)
})

module.exports = { app, db }
