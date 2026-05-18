/**
 * FEATURE 6: Alerting Delivery — Slack, Email, Webhook
 * Delivers regression alerts to configured channels.
 *
 * Routes:
 *   GET    /api/alert-channels          — list channels
 *   POST   /api/alert-channels          — create channel
 *   PATCH  /api/alert-channels/:id      — update channel
 *   DELETE /api/alert-channels/:id      — delete channel
 *   POST   /api/alert-channels/:id/test — send test notification
 */

const https = require('https')
const http  = require('http')

// ── Delivery helpers ──────────────────────────────────────────────────────────

const sendSlack = (webhookUrl, message) => new Promise((resolve, reject) => {
  const body = JSON.stringify({
    text: message.text,
    blocks: message.blocks || undefined,
  })
  const url  = new URL(webhookUrl)
  const opts = {
    hostname: url.hostname,
    path:     url.pathname + url.search,
    method:   'POST',
    headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
  }
  const req = (url.protocol === 'https:' ? https : http).request(opts, res => {
    let data = ''
    res.on('data', d => data += d)
    res.on('end', () => resolve({ status: res.statusCode, body: data }))
  })
  req.on('error', reject)
  req.write(body)
  req.end()
})

const sendWebhook = (webhookUrl, payload) => new Promise((resolve, reject) => {
  const body = JSON.stringify(payload)
  const url  = new URL(webhookUrl)
  const opts = {
    hostname: url.hostname,
    path:     url.pathname + url.search,
    method:   'POST',
    headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
  }
  const req = (url.protocol === 'https:' ? https : http).request(opts, res => {
    let data = ''
    res.on('data', d => data += d)
    res.on('end', () => resolve({ status: res.statusCode, body: data }))
  })
  req.on('error', reject)
  req.write(body)
  req.end()
})

// Build a Slack Block Kit message for an alert
const buildSlackAlert = (alert, projectName) => {
  const emoji   = alert.severity === 'critical' ? '🔴' : '🟡'
  const sign    = alert.change_percent > 0 ? '+' : ''
  const metricLabels = { fps: 'FPS', startup: 'Startup Time', memory: 'Memory', crash: 'Crashes', api: 'API Latency' }
  const label   = metricLabels[alert.metric] || alert.metric

  return {
    text: `${emoji} DroidPulse Alert: ${label} regression in ${projectName}`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `${emoji} Performance Regression Detected` }
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Project:*\n${projectName}` },
          { type: 'mrkdwn', text: `*Metric:*\n${label}` },
          { type: 'mrkdwn', text: `*Severity:*\n${alert.severity.toUpperCase()}` },
          { type: 'mrkdwn', text: `*Change:*\n${sign}${alert.change_percent}%` },
          { type: 'mrkdwn', text: `*Baseline (${alert.baseline_version}):*\n${alert.baseline_value}` },
          { type: 'mrkdwn', text: `*Current (${alert.current_version}):*\n${alert.current_value}` },
        ]
      },
      {
        type: 'context',
        elements: [{ type: 'mrkdwn', text: `Detected at ${new Date(alert.created_at).toISOString()}` }]
      }
    ]
  }
}

// ── Deliver an alert to all enabled channels for a project ────────────────────
const deliverAlert = async (db, projectId, alert) => {
  const channels = db.prepare(
    "SELECT * FROM alert_channels WHERE project_id = ? AND enabled = 1"
  ).all(projectId)

  if (channels.length === 0) return

  const project = db.prepare('SELECT name FROM projects WHERE id = ?').get(projectId)
  const projectName = project?.name || projectId

  for (const channel of channels) {
    let config
    try { config = JSON.parse(channel.config) } catch { continue }

    let status = 'sent'
    let error  = null

    try {
      if (channel.type === 'slack') {
        const msg = buildSlackAlert(alert, projectName)
        await sendSlack(config.webhookUrl, msg)

      } else if (channel.type === 'webhook') {
        await sendWebhook(config.url, {
          source:    'droidpulse',
          projectId, projectName,
          alert: {
            metric:          alert.metric,
            severity:        alert.severity,
            changePercent:   alert.change_percent,
            baselineVersion: alert.baseline_version,
            currentVersion:  alert.current_version,
            baselineValue:   alert.baseline_value,
            currentValue:    alert.current_value,
            createdAt:       alert.created_at,
          }
        })

      } else if (channel.type === 'email') {
        // Email via SMTP requires nodemailer — log for now, implement when SMTP config present
        console.log(`📧 [Email alert] To: ${(config.emails || []).join(', ')} | ${alert.metric} ${alert.change_percent}%`)
        // TODO: integrate nodemailer when SMTP_HOST env is set
      }
    } catch (err) {
      status = 'failed'
      error  = err.message
      console.error(`[AlertDelivery] Channel ${channel.id} (${channel.type}) failed:`, err.message)
    }

    // Record delivery attempt
    db.prepare(`
      INSERT INTO alert_deliveries (alert_id, channel_id, status, sent_at, error)
      VALUES (?, ?, ?, ?, ?)
    `).run(alert.id, channel.id, status, Date.now(), error)
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────
module.exports.router = (db, requireAuth, requirePermission) => {
  const r = require('express').Router()

  // GET /api/alert-channels
  r.get('/', requireAuth, requirePermission('alerts:read'), (req, res) => {
    const channels = db.prepare(
      'SELECT id, type, name, enabled, created_at FROM alert_channels WHERE project_id = ? ORDER BY created_at DESC'
    ).all(req.project.id)
    // Don't expose raw config (may contain tokens)
    res.json({ channels })
  })

  // POST /api/alert-channels
  // Body: { type: 'slack'|'email'|'webhook', name, config: { webhookUrl | emails | url } }
  r.post('/', requireAuth, requirePermission('analytics:write'), (req, res) => {
    const { type, name, config } = req.body
    if (!type || !name || !config) {
      return res.status(400).json({ error: 'type, name, config required' })
    }
    if (!['slack', 'email', 'webhook'].includes(type)) {
      return res.status(400).json({ error: 'type must be slack, email, or webhook' })
    }

    // Validate config shape
    if (type === 'slack'   && !config.webhookUrl) return res.status(400).json({ error: 'config.webhookUrl required for slack' })
    if (type === 'webhook' && !config.url)        return res.status(400).json({ error: 'config.url required for webhook' })
    if (type === 'email'   && !Array.isArray(config.emails)) return res.status(400).json({ error: 'config.emails[] required for email' })

    const result = db.prepare(`
      INSERT INTO alert_channels (project_id, type, name, config)
      VALUES (?, ?, ?, ?)
    `).run(req.project.id, type, name, JSON.stringify(config))

    res.status(201).json({ id: result.lastInsertRowid, type, name, enabled: true })
  })

  // PATCH /api/alert-channels/:id
  r.patch('/:id', requireAuth, requirePermission('analytics:write'), (req, res) => {
    const { name, enabled, config } = req.body
    const channel = db.prepare('SELECT * FROM alert_channels WHERE id = ? AND project_id = ?')
      .get(req.params.id, req.project.id)
    if (!channel) return res.status(404).json({ error: 'Channel not found' })

    if (name    !== undefined) db.prepare('UPDATE alert_channels SET name    = ? WHERE id = ?').run(name, req.params.id)
    if (enabled !== undefined) db.prepare('UPDATE alert_channels SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, req.params.id)
    if (config  !== undefined) db.prepare('UPDATE alert_channels SET config  = ? WHERE id = ?').run(JSON.stringify(config), req.params.id)

    res.json({ updated: parseInt(req.params.id) })
  })

  // DELETE /api/alert-channels/:id
  r.delete('/:id', requireAuth, requirePermission('analytics:write'), (req, res) => {
    db.prepare('DELETE FROM alert_channels WHERE id = ? AND project_id = ?').run(req.params.id, req.project.id)
    res.json({ deleted: parseInt(req.params.id) })
  })

  // POST /api/alert-channels/:id/test — send a test notification
  r.post('/:id/test', requireAuth, requirePermission('analytics:write'), async (req, res) => {
    const channel = db.prepare('SELECT * FROM alert_channels WHERE id = ? AND project_id = ?')
      .get(req.params.id, req.project.id)
    if (!channel) return res.status(404).json({ error: 'Channel not found' })

    const fakeAlert = {
      id: 0, metric: 'startup', severity: 'warning',
      baseline_version: '1.0.0', current_version: '1.1.0',
      baseline_value: 1200, current_value: 1800, change_percent: 50,
      created_at: Date.now()
    }

    try {
      await deliverAlert(db, req.project.id, fakeAlert)
      res.json({ ok: true, message: 'Test notification sent' })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // GET /api/alert-channels/deliveries — recent delivery log
  r.get('/deliveries', requireAuth, requirePermission('alerts:read'), (req, res) => {
    const deliveries = db.prepare(`
      SELECT d.*, c.type, c.name AS channel_name
      FROM alert_deliveries d
      JOIN alert_channels c ON c.id = d.channel_id
      WHERE c.project_id = ?
      ORDER BY d.sent_at DESC
      LIMIT 100
    `).all(req.project.id)
    res.json({ deliveries })
  })

  return r
}

module.exports.deliverAlert = deliverAlert
