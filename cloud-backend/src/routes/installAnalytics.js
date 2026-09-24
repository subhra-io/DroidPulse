/**
 * Install & User Growth Analytics
 *
 * Tracks:
 * - New users (first session ever from a device)
 * - Daily / Weekly / Monthly Active Users (DAU/WAU/MAU)
 * - Install-to-open rate (first_open event)
 * - Active installs (devices active in last 30 days)
 * - Uninstall signals (device not seen for 30+ days)
 * - Growth rate (new users this period vs last period)
 * - Geographic distribution (from device locale)
 * - OS version distribution
 * - App version adoption
 *
 * NOTE: Actual Play Store / App Store download counts require
 * connecting the respective store APIs separately. This tracks
 * users who have OPENED the app (which is more useful for
 * product decisions than raw download counts).
 *
 * Routes:
 *   GET /api/installs/overview     — DAU/WAU/MAU + growth
 *   GET /api/installs/new-users    — new user trend over time
 *   GET /api/installs/active       — active installs count
 *   GET /api/installs/versions     — app version adoption
 *   GET /api/installs/devices      — OS + device breakdown
 *   GET /api/installs/geography    — locale/region breakdown
 */

module.exports.router = (db, requireAuth, requirePermission) => {
  const r = require('express').Router()

  // GET /api/installs/overview
  r.get('/overview', requireAuth, requirePermission('analytics:read'), (req, res) => {
    const now   = Date.now()
    const day   = 24 * 60 * 60 * 1000
    const today = now - day
    const week  = now - 7  * day
    const month = now - 30 * day
    const prev  = now - 60 * day  // previous 30-day window for growth calc

    // DAU — unique devices with a session today
    const dau = db.prepare(`
      SELECT COUNT(DISTINCT device_model) AS count
      FROM sessions WHERE project_id = ? AND started_at >= ?
    `).get(req.project.id, today)

    // WAU
    const wau = db.prepare(`
      SELECT COUNT(DISTINCT device_model) AS count
      FROM sessions WHERE project_id = ? AND started_at >= ?
    `).get(req.project.id, week)

    // MAU
    const mau = db.prepare(`
      SELECT COUNT(DISTINCT device_model) AS count
      FROM sessions WHERE project_id = ? AND started_at >= ?
    `).get(req.project.id, month)

    // Total unique devices ever (proxy for total installs)
    const totalInstalls = db.prepare(`
      SELECT COUNT(DISTINCT device_model) AS count
      FROM sessions WHERE project_id = ?
    `).get(req.project.id)

    // New users this month (first session in last 30 days)
    const newThisMonth = db.prepare(`
      SELECT COUNT(*) AS count FROM (
        SELECT device_model, MIN(started_at) AS first_seen
        FROM sessions WHERE project_id = ?
        GROUP BY device_model
        HAVING first_seen >= ?
      )
    `).get(req.project.id, month)

    // New users previous month (for growth rate)
    const newPrevMonth = db.prepare(`
      SELECT COUNT(*) AS count FROM (
        SELECT device_model, MIN(started_at) AS first_seen
        FROM sessions WHERE project_id = ?
        GROUP BY device_model
        HAVING first_seen >= ? AND first_seen < ?
      )
    `).get(req.project.id, prev, month)

    const growthRate = newPrevMonth.count > 0
      ? Math.round(((newThisMonth.count - newPrevMonth.count) / newPrevMonth.count) * 100)
      : 100

    // Avg sessions per user (engagement)
    const avgSessions = db.prepare(`
      SELECT AVG(session_count) AS avg FROM (
        SELECT device_model, COUNT(*) AS session_count
        FROM sessions WHERE project_id = ? AND started_at >= ?
        GROUP BY device_model
      )
    `).get(req.project.id, month)

    // Crash-free users this month
    const crashFreeUsers = db.prepare(`
      SELECT COUNT(DISTINCT device_model) AS count
      FROM sessions
      WHERE project_id = ? AND started_at >= ? AND crash_count = 0
    `).get(req.project.id, month)

    const crashFreeRate = mau.count > 0
      ? Math.round((crashFreeUsers.count / mau.count) * 100)
      : 100

    res.json({
      dau:           dau.count,
      wau:           wau.count,
      mau:           mau.count,
      totalInstalls: totalInstalls.count,
      newThisMonth:  newThisMonth.count,
      newPrevMonth:  newPrevMonth.count,
      growthRate,
      avgSessionsPerUser: Math.round((avgSessions.avg || 0) * 10) / 10,
      crashFreeRate,
      period: { from: new Date(month).toISOString(), to: new Date(now).toISOString() }
    })
  })

  // GET /api/installs/new-users?days=30
  r.get('/new-users', requireAuth, requirePermission('analytics:read'), (req, res) => {
    const { days = 30 } = req.query
    const d = parseInt(days)
    const from = Date.now() - d * 24 * 60 * 60 * 1000

    // New users per day (first session per device per day)
    const trend = db.prepare(`
      SELECT
        date(started_at / 1000, 'unixepoch') AS day,
        COUNT(*) AS new_users
      FROM (
        SELECT device_model, MIN(started_at) AS started_at
        FROM sessions WHERE project_id = ?
        GROUP BY device_model
        HAVING started_at >= ?
      )
      GROUP BY day
      ORDER BY day ASC
    `).all(req.project.id, from)

    // Returning users per day (sessions from devices seen before)
    const returning = db.prepare(`
      SELECT
        date(s.started_at / 1000, 'unixepoch') AS day,
        COUNT(DISTINCT s.device_model) AS returning_users
      FROM sessions s
      WHERE s.project_id = ? AND s.started_at >= ?
        AND EXISTS (
          SELECT 1 FROM sessions s2
          WHERE s2.device_model = s.device_model
            AND s2.project_id = s.project_id
            AND s2.started_at < s.started_at
        )
      GROUP BY day
      ORDER BY day ASC
    `).all(req.project.id, from)

    // Merge into one array
    const returningMap = Object.fromEntries(returning.map(r => [r.day, r.returning_users]))
    const merged = trend.map(t => ({
      day:             t.day,
      new_users:       t.new_users,
      returning_users: returningMap[t.day] || 0,
      total:           t.new_users + (returningMap[t.day] || 0)
    }))

    res.json({ trend: merged, days: d })
  })

  // GET /api/installs/active
  r.get('/active', requireAuth, requirePermission('analytics:read'), (req, res) => {
    const day   = 24 * 60 * 60 * 1000
    const now   = Date.now()

    const buckets = [1, 7, 14, 30, 60, 90].map(d => {
      const from = now - d * day
      const count = db.prepare(`
        SELECT COUNT(DISTINCT device_model) AS count
        FROM sessions WHERE project_id = ? AND started_at >= ?
      `).get(req.project.id, from)
      return { days: d, label: d === 1 ? 'Today' : `Last ${d}d`, active: count.count }
    })

    // Churned devices (no session in 30+ days but had one before)
    const churned = db.prepare(`
      SELECT COUNT(DISTINCT device_model) AS count FROM (
        SELECT device_model, MAX(started_at) AS last_seen
        FROM sessions WHERE project_id = ?
        GROUP BY device_model
        HAVING last_seen < ?
      )
    `).get(req.project.id, now - 30 * day)

    res.json({ buckets, churned: churned.count })
  })

  // GET /api/installs/versions
  r.get('/versions', requireAuth, requirePermission('analytics:read'), (req, res) => {
    const month = Date.now() - 30 * 24 * 60 * 60 * 1000

    const versions = db.prepare(`
      SELECT
        app_version,
        COUNT(DISTINCT device_model) AS devices,
        COUNT(*) AS sessions,
        AVG(startup_ms) AS avg_startup,
        SUM(crash_count) AS total_crashes,
        ROUND(SUM(crash_count) * 100.0 / COUNT(*), 1) AS crash_rate
      FROM sessions
      WHERE project_id = ? AND started_at >= ? AND app_version IS NOT NULL
      GROUP BY app_version
      ORDER BY devices DESC
      LIMIT 20
    `).all(req.project.id, month)

    const total = versions.reduce((s, v) => s + v.devices, 0)
    const result = versions.map(v => ({
      ...v,
      adoption_pct: total > 0 ? Math.round((v.devices / total) * 100) : 0
    }))

    res.json({ versions: result, totalDevices: total })
  })

  // GET /api/installs/devices
  r.get('/devices', requireAuth, requirePermission('analytics:read'), (req, res) => {
    const month = Date.now() - 30 * 24 * 60 * 60 * 1000

    const osVersions = db.prepare(`
      SELECT os_version, COUNT(DISTINCT device_model) AS devices
      FROM sessions
      WHERE project_id = ? AND started_at >= ? AND os_version IS NOT NULL
      GROUP BY os_version ORDER BY devices DESC LIMIT 10
    `).all(req.project.id, month)

    const deviceModels = db.prepare(`
      SELECT device_model, COUNT(*) AS sessions, AVG(startup_ms) AS avg_startup
      FROM sessions
      WHERE project_id = ? AND started_at >= ? AND device_model IS NOT NULL
      GROUP BY device_model ORDER BY sessions DESC LIMIT 15
    `).all(req.project.id, month)

    const buildTypes = db.prepare(`
      SELECT build_type, COUNT(DISTINCT device_model) AS devices
      FROM sessions WHERE project_id = ? AND started_at >= ?
      GROUP BY build_type
    `).all(req.project.id, month)

    res.json({ osVersions, deviceModels, buildTypes })
  })

  return r
}
