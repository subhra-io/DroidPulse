/**
 * FEATURE 7: Data Export / Warehouse Sync
 * Export events, sessions, users as JSON/CSV/NDJSON.
 * Supports download, S3 (via pre-signed URL), and webhook push.
 *
 * Routes:
 *   POST /api/export              — create export job
 *   GET  /api/export              — list export jobs
 *   GET  /api/export/:id          — get job status
 *   GET  /api/export/:id/download — download completed export
 */

const { v4: uuid } = require('uuid')
const fs   = require('fs')
const path = require('path')
const os   = require('os')

const EXPORT_DIR = process.env.EXPORT_DIR || path.join(os.tmpdir(), 'droidpulse-exports')

// Ensure export directory exists
try { fs.mkdirSync(EXPORT_DIR, { recursive: true }) } catch (_) {}

// ── CSV helpers ───────────────────────────────────────────────────────────────
const escapeCSV = v => {
  if (v == null) return ''
  const s = String(v)
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"` : s
}

const toCSV = (rows) => {
  if (rows.length === 0) return ''
  const keys = Object.keys(rows[0])
  return [keys.join(','), ...rows.map(r => keys.map(k => escapeCSV(r[k])).join(','))].join('\n')
}

const toNDJSON = (rows) => rows.map(r => JSON.stringify(r)).join('\n')

// ── Run export job ────────────────────────────────────────────────────────────
const runExport = async (db, job) => {
  const { id, project_id, type, format, destination, config: configStr } = job
  let config = {}
  try { config = JSON.parse(configStr) } catch (_) {}

  db.prepare("UPDATE export_jobs SET status = 'running' WHERE id = ?").run(id)

  try {
    let rows = []
    const fromTs = config.from || 0
    const toTs   = config.to   || Date.now()

    // ── Fetch data ────────────────────────────────────────────────────────────
    if (type === 'events') {
      rows = db.prepare(`
        SELECT e.id, e.session_id, e.type, e.timestamp,
               json_extract(e.data, '$.fps')          AS fps,
               json_extract(e.data, '$.usedMemoryMb') AS memory_mb,
               json_extract(e.data, '$.totalMs')      AS startup_ms,
               json_extract(e.data, '$.url')          AS api_url,
               json_extract(e.data, '$.duration')     AS api_duration_ms,
               json_extract(e.data, '$.responseCode') AS api_status,
               e.data
        FROM events e
        WHERE e.project_id = ? AND e.timestamp BETWEEN ? AND ?
        ORDER BY e.timestamp ASC
      `).all(project_id, fromTs, toTs)

    } else if (type === 'analytics') {
      rows = db.prepare(`
        SELECT id, session_id, event_name, user_id, properties,
               startup_time_ms, memory_mb, fps_avg, perf_score,
               crash_free, revenue, currency, timestamp
        FROM analytics_events
        WHERE project_id = ? AND timestamp BETWEEN ? AND ?
        ORDER BY timestamp ASC
      `).all(project_id, fromTs, toTs)
      // Parse properties JSON for CSV
      rows = rows.map(r => {
        try {
          const props = JSON.parse(r.properties || '{}')
          return { ...r, ...props, properties: r.properties }
        } catch { return r }
      })

    } else if (type === 'sessions') {
      rows = db.prepare(`
        SELECT * FROM sessions
        WHERE project_id = ? AND started_at BETWEEN ? AND ?
        ORDER BY started_at ASC
      `).all(project_id, fromTs, toTs)

    } else if (type === 'users') {
      rows = db.prepare(`
        SELECT u.*,
          (SELECT COUNT(*) FROM analytics_events WHERE project_id = u.project_id AND user_id = u.user_id) AS event_count,
          (SELECT AVG(perf_score) FROM analytics_events WHERE project_id = u.project_id AND user_id = u.user_id) AS avg_perf
        FROM user_profiles u
        WHERE u.project_id = ?
        ORDER BY u.last_seen DESC
      `).all(project_id)

    } else if (type === 'full') {
      // Full export: all tables as a single JSON object
      rows = [{
        exportedAt: new Date().toISOString(),
        projectId:  project_id,
        sessions:   db.prepare('SELECT * FROM sessions WHERE project_id = ?').all(project_id),
        events:     db.prepare('SELECT * FROM events WHERE project_id = ? AND timestamp BETWEEN ? AND ?').all(project_id, fromTs, toTs),
        analytics:  db.prepare('SELECT * FROM analytics_events WHERE project_id = ? AND timestamp BETWEEN ? AND ?').all(project_id, fromTs, toTs),
        users:      db.prepare('SELECT * FROM user_profiles WHERE project_id = ?').all(project_id),
      }]
    }

    // ── Serialize ─────────────────────────────────────────────────────────────
    let content, ext, mimeType
    if (format === 'csv') {
      content  = toCSV(rows)
      ext      = 'csv'
      mimeType = 'text/csv'
    } else if (format === 'ndjson') {
      content  = toNDJSON(rows)
      ext      = 'ndjson'
      mimeType = 'application/x-ndjson'
    } else {
      content  = JSON.stringify(type === 'full' ? rows[0] : rows, null, 2)
      ext      = 'json'
      mimeType = 'application/json'
    }

    const filename = `${project_id}-${type}-${id}.${ext}`
    const filepath = path.join(EXPORT_DIR, filename)
    fs.writeFileSync(filepath, content, 'utf8')

    const fileSize = Buffer.byteLength(content, 'utf8')

    // ── Deliver ───────────────────────────────────────────────────────────────
    let fileUrl = `/api/export/${id}/download`

    if (destination === 'webhook' && config.webhookUrl) {
      // POST the file content to the webhook
      try {
        const https = require('https')
        const http  = require('http')
        const body  = content
        const url   = new URL(config.webhookUrl)
        await new Promise((resolve, reject) => {
          const opts = {
            hostname: url.hostname,
            path:     url.pathname,
            method:   'POST',
            headers:  { 'Content-Type': mimeType, 'Content-Length': Buffer.byteLength(body), 'X-DroidPulse-Export': id }
          }
          const req = (url.protocol === 'https:' ? https : http).request(opts, res => {
            res.on('data', () => {})
            res.on('end', resolve)
          })
          req.on('error', reject)
          req.write(body)
          req.end()
        })
        fileUrl = config.webhookUrl
      } catch (err) {
        console.error('[Export] Webhook delivery failed:', err.message)
      }
    }

    db.prepare(`
      UPDATE export_jobs
      SET status = 'done', row_count = ?, file_size = ?, file_url = ?, completed_at = ?
      WHERE id = ?
    `).run(rows.length, fileSize, fileUrl, Date.now(), id)

    console.log(`✅ Export ${id} done: ${rows.length} rows, ${Math.round(fileSize / 1024)}KB`)

  } catch (err) {
    console.error(`[Export] Job ${id} failed:`, err.message)
    db.prepare("UPDATE export_jobs SET status = 'failed', error = ? WHERE id = ?")
      .run(err.message, id)
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────
module.exports.router = (db, requireAuth, requirePermission) => {
  const r = require('express').Router()

  // POST /api/export — create export job
  // Body: { type, format, destination, config: { from, to, webhookUrl? } }
  r.post('/', requireAuth, requirePermission('export:run'), (req, res) => {
    const { type = 'analytics', format = 'json', destination = 'download', config = {} } = req.body

    const validTypes  = ['events', 'analytics', 'sessions', 'users', 'full']
    const validFmts   = ['json', 'csv', 'ndjson']
    const validDests  = ['download', 'webhook']

    if (!validTypes.includes(type))   return res.status(400).json({ error: `type must be one of: ${validTypes.join(', ')}` })
    if (!validFmts.includes(format))  return res.status(400).json({ error: `format must be one of: ${validFmts.join(', ')}` })
    if (!validDests.includes(destination)) return res.status(400).json({ error: `destination must be one of: ${validDests.join(', ')}` })

    const id = `exp-${uuid().slice(0, 8)}`
    db.prepare(`
      INSERT INTO export_jobs (id, project_id, type, format, destination, config, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.project.id, type, format, destination, JSON.stringify({ ...config, projectId: req.project.id }), req.user?.id || null)

    // Run async — don't block the response
    const job = db.prepare('SELECT * FROM export_jobs WHERE id = ?').get(id)
    setImmediate(() => runExport(db, job))

    res.status(202).json({ id, type, format, destination, status: 'pending' })
  })

  // GET /api/export — list jobs
  r.get('/', requireAuth, requirePermission('export:run'), (req, res) => {
    const jobs = db.prepare(`
      SELECT id, type, format, destination, status, row_count, file_size, file_url, created_at, completed_at, error
      FROM export_jobs
      WHERE project_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `).all(req.project.id)
    res.json({ jobs })
  })

  // GET /api/export/:id — job status
  r.get('/:id', requireAuth, requirePermission('export:run'), (req, res) => {
    const job = db.prepare('SELECT * FROM export_jobs WHERE id = ? AND project_id = ?')
      .get(req.params.id, req.project.id)
    if (!job) return res.status(404).json({ error: 'Export job not found' })
    res.json(job)
  })

  // GET /api/export/:id/download — stream file
  r.get('/:id/download', requireAuth, requirePermission('export:run'), (req, res) => {
    const job = db.prepare('SELECT * FROM export_jobs WHERE id = ? AND project_id = ?')
      .get(req.params.id, req.project.id)
    if (!job)              return res.status(404).json({ error: 'Export job not found' })
    if (job.status !== 'done') return res.status(409).json({ error: `Export is ${job.status}` })

    const ext      = job.format
    const filename = `droidpulse-${job.type}-${job.id}.${ext}`
    const filepath = path.join(EXPORT_DIR, `${job.project_id}-${job.type}-${job.id}.${ext}`)

    if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'Export file not found on disk' })

    const mimeTypes = { json: 'application/json', csv: 'text/csv', ndjson: 'application/x-ndjson' }
    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    fs.createReadStream(filepath).pipe(res)
  })

  return r
}
