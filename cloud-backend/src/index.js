require('dotenv').config()
const express    = require('express')
const cors       = require('cors')
const http       = require('http')
const WebSocket  = require('ws')
const Database   = require('better-sqlite3')
const { initSchema } = require('./db/schema')

const app    = express()
const server = http.createServer(app)
const wss    = new WebSocket.Server({ server })

// ── Database ──────────────────────────────────────────────────────────────────
const db = new Database(process.env.DB_PATH || './droidpulse.db')
db.pragma('journal_mode = WAL') // Better concurrent performance
initSchema(db)

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors())
app.use(express.json({ limit: '5mb' }))

// ── Auth middleware ───────────────────────────────────────────────────────────
const authenticate = (req, res, next) => {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing API key' })
  }
  const apiKey = auth.replace('Bearer ', '')
  const project = db.prepare('SELECT * FROM projects WHERE api_key = ?').get(apiKey)
  if (!project) {
    return res.status(401).json({ error: 'Invalid API key' })
  }
  req.project = project
  next()
}

// ── WebSocket: broadcast to dashboard clients ─────────────────────────────────
const dashboardClients = new Map() // projectId → Set<WebSocket>

wss.on('connection', (ws, req) => {
  const projectId = new URL(req.url, 'http://localhost').searchParams.get('projectId')
  if (!projectId) { ws.close(); return }

  if (!dashboardClients.has(projectId)) dashboardClients.set(projectId, new Set())
  dashboardClients.get(projectId).add(ws)
  console.log(`📊 Dashboard connected for project: ${projectId}`)

  ws.on('close', () => {
    dashboardClients.get(projectId)?.delete(ws)
  })
})

const broadcast = (projectId, data) => {
  const clients = dashboardClients.get(projectId)
  if (!clients) return
  const msg = JSON.stringify(data)
  clients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg)
  })
}

// ── Routes ────────────────────────────────────────────────────────────────────

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', timestamp: Date.now() })
})

// ── POST /api/sessions — Create new session ───────────────────────────────────
app.post('/api/sessions', authenticate, (req, res) => {
  const { sessionId, appVersion, buildType, deviceModel, osVersion, startedAt } = req.body

  if (!sessionId) return res.status(400).json({ error: 'sessionId required' })

  db.prepare(`
    INSERT OR REPLACE INTO sessions
    (id, project_id, app_version, build_type, device_model, os_version, started_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(sessionId, req.project.id, appVersion, buildType, deviceModel, osVersion, startedAt)

  // Broadcast new session to dashboard
  broadcast(req.project.id, {
    event: 'session_started',
    sessionId, appVersion, buildType, deviceModel, osVersion
  })

  console.log(`📱 New session: ${sessionId.slice(0,8)} | ${appVersion} | ${deviceModel}`)
  res.status(201).json({ sessionId, projectId: req.project.id })
})

// ── POST /api/events — Receive batched events ─────────────────────────────────
app.post('/api/events', authenticate, (req, res) => {
  const { sessionId, events } = req.body

  if (!sessionId || !Array.isArray(events)) {
    return res.status(400).json({ error: 'sessionId and events[] required' })
  }

  // Auto-create session if it doesn't exist (device may have restarted)
  const existingSession = db.prepare('SELECT id FROM sessions WHERE id = ?').get(sessionId)
  if (!existingSession) {
    db.prepare(`
      INSERT OR IGNORE INTO sessions (id, project_id, app_version, build_type, started_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(sessionId, req.project.id, 'unknown', 'debug', Date.now())
  }

  const insertEvent = db.prepare(`
    INSERT INTO events (session_id, project_id, type, data, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `)

  // Insert all events in a transaction (fast)
  const insertMany = db.transaction((evts) => {
    for (const evt of evts) {
      insertEvent.run(sessionId, req.project.id, evt.type, JSON.stringify(evt), evt.timestamp)
    }
  })

  insertMany(events)

  // Update session event count
  db.prepare(`
    UPDATE sessions SET event_count = event_count + ? WHERE id = ?
  `).run(events.length, sessionId)

  // Update crash count if any crash events
  const crashes = events.filter(e => e.type === 'crash').length
  if (crashes > 0) {
    db.prepare(`UPDATE sessions SET crash_count = crash_count + ? WHERE id = ?`)
      .run(crashes, sessionId)
  }

  // Update startup time if startup event present
  const startupEvent = events.find(e => e.type === 'startup')
  if (startupEvent?.totalMs) {
    db.prepare(`UPDATE sessions SET startup_ms = ? WHERE id = ?`)
      .run(startupEvent.totalMs, sessionId)
  }

  // Broadcast events to live dashboard
  broadcast(req.project.id, { event: 'events', sessionId, events })

  // Trigger regression check (async, don't block response)
  setImmediate(() => checkRegressions(req.project.id, events))

  res.json({ received: events.length })
})

// ── GET /api/sessions — List sessions ────────────────────────────────────────
app.get('/api/sessions', authenticate, (req, res) => {
  const { version, limit = 20, offset = 0 } = req.query

  let query = `
    SELECT s.*,
      (SELECT COUNT(*) FROM events WHERE session_id = s.id AND type = 'crash') as crashes
    FROM sessions s
    WHERE s.project_id = ?
  `
  const params = [req.project.id]

  if (version) { query += ' AND s.app_version = ?'; params.push(version) }
  query += ' ORDER BY s.started_at DESC LIMIT ? OFFSET ?'
  params.push(parseInt(limit), parseInt(offset))

  const sessions = db.prepare(query).all(...params)
  const total = db.prepare('SELECT COUNT(*) as n FROM sessions WHERE project_id = ?')
    .get(req.project.id).n

  res.json({ sessions, total })
})

// ── GET /api/sessions/:id/events — Get events for a session ──────────────────
app.get('/api/sessions/:id/events', authenticate, (req, res) => {
  const { type } = req.query
  let query = 'SELECT * FROM events WHERE session_id = ? AND project_id = ?'
  const params = [req.params.id, req.project.id]
  if (type) { query += ' AND type = ?'; params.push(type) }
  query += ' ORDER BY timestamp ASC'

  const events = db.prepare(query).all(...params)
    .map(e => ({ ...JSON.parse(e.data), _id: e.id }))

  res.json({ events })
})

// ── GET /api/sessions/:id/export — Export session as JSON or CSV ──────────────
app.get('/api/sessions/:id/export', authenticate, (req, res) => {
  const { format = 'json' } = req.query

  const session = db.prepare('SELECT * FROM sessions WHERE id = ? AND project_id = ?')
    .get(req.params.id, req.project.id)
  if (!session) return res.status(404).json({ error: 'Session not found' })

  const events = db.prepare(
    'SELECT * FROM events WHERE session_id = ? ORDER BY timestamp ASC'
  ).all(req.params.id).map(e => ({ ...JSON.parse(e.data), _id: e.id }))

  if (format === 'csv') {
    // Flatten events to CSV
    const allKeys = new Set()
    events.forEach(e => Object.keys(e).forEach(k => allKeys.add(k)))
    const keys = [...allKeys]
    const escape = v => {
      if (v == null) return ''
      const s = String(v)
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"` : s
    }
    const rows = [
      keys.join(','),
      ...events.map(e => keys.map(k => escape(e[k])).join(','))
    ]
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="session-${req.params.id.slice(0,8)}.csv"`)
    return res.send(rows.join('\n'))
  }

  // JSON export
  const payload = {
    exportedAt:  new Date().toISOString(),
    session,
    eventCount:  events.length,
    events,
  }
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Content-Disposition', `attachment; filename="session-${req.params.id.slice(0,8)}.json"`)
  res.json(payload)
})

// ── DELETE /api/sessions/:id — Delete a session ───────────────────────────────
app.delete('/api/sessions/:id', authenticate, (req, res) => {
  const session = db.prepare('SELECT id FROM sessions WHERE id = ? AND project_id = ?')
    .get(req.params.id, req.project.id)
  if (!session) return res.status(404).json({ error: 'Session not found' })

  db.prepare('DELETE FROM events WHERE session_id = ?').run(req.params.id)
  db.prepare('DELETE FROM sessions WHERE id = ?').run(req.params.id)
  res.json({ deleted: req.params.id })
})

// ── GET /api/compare — Version comparison ────────────────────────────────────
app.get('/api/compare', authenticate, (req, res) => {
  const { v1, v2 } = req.query
  if (!v1 || !v2) return res.status(400).json({ error: 'v1 and v2 required' })

  const getMetrics = (version) => {
    const sessions = db.prepare(`
      SELECT id FROM sessions WHERE project_id = ? AND app_version = ?
    `).all(req.project.id, version).map(s => s.id)

    if (sessions.length === 0) return null

    const placeholders = sessions.map(() => '?').join(',')

    const fps = db.prepare(`
      SELECT AVG(json_extract(data, '$.fps')) as avg_fps
      FROM events WHERE session_id IN (${placeholders}) AND type = 'fps'
    `).get(...sessions)

    const startup = db.prepare(`
      SELECT AVG(json_extract(data, '$.totalMs')) as avg_startup
      FROM events WHERE session_id IN (${placeholders}) AND type = 'startup'
    `).get(...sessions)

    const memory = db.prepare(`
      SELECT AVG(json_extract(data, '$.usedMemoryMb')) as avg_memory
      FROM events WHERE session_id IN (${placeholders}) AND type = 'memory'
    `).get(...sessions)

    const network = db.prepare(`
      SELECT AVG(json_extract(data, '$.duration')) as avg_api_ms
      FROM events WHERE session_id IN (${placeholders}) AND type = 'network'
    `).get(...sessions)

    const crashes = db.prepare(`
      SELECT COUNT(*) as total FROM events
      WHERE session_id IN (${placeholders}) AND type = 'crash'
    `).get(...sessions)

    return {
      version,
      sessions: sessions.length,
      avgFps:       Math.round(fps?.avg_fps ?? 0),
      avgStartupMs: Math.round(startup?.avg_startup ?? 0),
      avgMemoryMb:  Math.round(memory?.avg_memory ?? 0),
      avgApiMs:     Math.round(network?.avg_api_ms ?? 0),
      crashCount:   crashes?.total ?? 0
    }
  }

  const metrics1 = getMetrics(v1)
  const metrics2 = getMetrics(v2)

  if (!metrics1) return res.status(404).json({ error: `No data for version ${v1}` })
  if (!metrics2) return res.status(404).json({ error: `No data for version ${v2}` })

  // Calculate regressions
  const regressions = []
  const improvements = []

  const check = (metric, label, v1val, v2val, higherIsBetter) => {
    if (!v1val || !v2val) return
    const change = ((v2val - v1val) / v1val) * 100
    const isRegression = higherIsBetter ? change < -10 : change > 10
    const isImprovement = higherIsBetter ? change > 5 : change < -5

    if (isRegression) regressions.push({ metric: label, v1: v1val, v2: v2val, change: Math.round(change) })
    if (isImprovement) improvements.push({ metric: label, v1: v1val, v2: v2val, change: Math.round(change) })
  }

  check('fps',       'FPS',          metrics1.avgFps,       metrics2.avgFps,       true)
  check('startup',   'Startup Time', metrics1.avgStartupMs, metrics2.avgStartupMs, false)
  check('memory',    'Memory Usage', metrics1.avgMemoryMb,  metrics2.avgMemoryMb,  false)
  check('api',       'API Speed',    metrics1.avgApiMs,     metrics2.avgApiMs,     false)
  check('crashes',   'Crashes',      metrics1.crashCount,   metrics2.crashCount,   false)

  res.json({ v1: metrics1, v2: metrics2, regressions, improvements })
})

// ── GET /api/ci-report — CI/CD report ────────────────────────────────────────
app.get('/api/ci-report', authenticate, (req, res) => {
  const { version, baseline, format = 'json' } = req.query
  if (!version || !baseline) {
    return res.status(400).json({ error: 'version and baseline required' })
  }

  // Reuse compare logic
  req.query.v1 = baseline
  req.query.v2 = version

  // Get comparison data inline
  const getMetrics = (ver) => {
    const sessions = db.prepare(`
      SELECT id FROM sessions WHERE project_id = ? AND app_version = ?
    `).all(req.project.id, ver).map(s => s.id)
    if (sessions.length === 0) return null
    const ph = sessions.map(() => '?').join(',')
    const fps = db.prepare(`SELECT AVG(json_extract(data,'$.fps')) as v FROM events WHERE session_id IN (${ph}) AND type='fps'`).get(...sessions)
    const startup = db.prepare(`SELECT AVG(json_extract(data,'$.totalMs')) as v FROM events WHERE session_id IN (${ph}) AND type='startup'`).get(...sessions)
    const crashes = db.prepare(`SELECT COUNT(*) as v FROM events WHERE session_id IN (${ph}) AND type='crash'`).get(...sessions)
    return { version: ver, avgFps: Math.round(fps?.v ?? 0), avgStartupMs: Math.round(startup?.v ?? 0), crashCount: crashes?.v ?? 0 }
  }

  const base = getMetrics(baseline)
  const curr = getMetrics(version)

  if (!base || !curr) {
    return res.status(404).json({ error: 'Insufficient data for comparison' })
  }

  // Determine pass/fail
  const checks = [
    { name: 'FPS',     pass: curr.avgFps >= base.avgFps * 0.9,       baseline: base.avgFps,       current: curr.avgFps,       unit: 'fps' },
    { name: 'Startup', pass: curr.avgStartupMs <= base.avgStartupMs * 1.1, baseline: base.avgStartupMs, current: curr.avgStartupMs, unit: 'ms' },
    { name: 'Crashes', pass: curr.crashCount <= base.crashCount + 1,  baseline: base.crashCount,   current: curr.crashCount,   unit: 'crashes' }
  ]

  const passed = checks.every(c => c.pass)
  const exitCode = passed ? 0 : 1

  if (format === 'text') {
    // Text format for CI logs
    let output = `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    output += `  DroidPulse CI Report\n`
    output += `  ${baseline} → ${version}\n`
    output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    checks.forEach(c => {
      output += `  ${c.pass ? '✅' : '❌'} ${c.name}: ${c.baseline}${c.unit} → ${c.current}${c.unit}\n`
    })
    output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    output += `  Result: ${passed ? '✅ PASSED' : '❌ FAILED'}\n`
    output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    return res.type('text').send(output)
  }

  res.json({ passed, exitCode, baseline, version, checks })
})

// ── GET /api/alerts — Get regression alerts ───────────────────────────────────
app.get('/api/alerts', authenticate, (req, res) => {
  const alerts = db.prepare(`
    SELECT * FROM alerts WHERE project_id = ?
    ORDER BY created_at DESC LIMIT 50
  `).all(req.project.id)
  res.json({ alerts })
})

// ── Regression detection ──────────────────────────────────────────────────────
const checkRegressions = (projectId, events) => {
  // Get current session's version
  const fpsEvent = events.find(e => e.type === 'fps')
  if (!fpsEvent) return

  // Simple regression check — compare to previous version average
  // Full implementation would compare rolling averages
}

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`  ⚡ DroidPulse Cloud Backend`)
  console.log(`  🌐 HTTP:  http://localhost:${PORT}`)
  console.log(`  📡 WS:    ws://localhost:${PORT}`)
  console.log(`  🔑 Demo API key: dp_live_demo_key_12345`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)
})

module.exports = { app, db }
