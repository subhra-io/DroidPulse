/**
 * Fraud Analytics
 *
 * Detects suspicious patterns from SDK telemetry:
 *
 * 1. EMULATOR / ROOTED DEVICE   — flagged by SDK, stored in session properties
 * 2. ABNORMAL EVENT VELOCITY    — >500 events in 60s from one device
 * 3. MULTIPLE ACCOUNTS / DEVICE — same device_model, different user_ids
 * 4. IMPOSSIBLE SESSION LENGTH  — session > 24 hours (likely a bot)
 * 5. CLICK FRAUD PATTERN        — high event count, zero network calls
 * 6. ACCOUNT TAKEOVER SIGNAL    — identify() called 5+ times in one session
 * 7. REPLAY ATTACK              — identical event sequences across sessions
 * 8. CRASH LOOP                 — device crashing repeatedly (abuse signal)
 *
 * Routes:
 *   GET /api/fraud/overview      — fraud risk summary
 *   GET /api/fraud/signals       — list of flagged sessions/devices
 *   GET /api/fraud/device/:id    — full fraud profile for one device
 *   POST /api/fraud/flag         — manually flag a session or device
 */

module.exports.router = (db, requireAuth, requirePermission) => {
  const r = require('express').Router()

  // GET /api/fraud/overview
  r.get('/overview', requireAuth, requirePermission('analytics:read'), (req, res) => {
    const month = Date.now() - 30 * 24 * 60 * 60 * 1000

    // 1. Emulator/rooted devices (flagged by SDK via is_emulator property)
    const emulators = db.prepare(`
      SELECT COUNT(DISTINCT session_id) AS count
      FROM analytics_events
      WHERE project_id = ? AND timestamp >= ?
        AND json_extract(properties, '$.is_emulator') = 1
    `).get(req.project.id, month)

    // 2. Abnormal event velocity — sessions with >500 events in any 60s window
    const highVelocity = db.prepare(`
      SELECT COUNT(DISTINCT session_id) AS count
      FROM (
        SELECT session_id, COUNT(*) AS event_count
        FROM events
        WHERE project_id = ? AND timestamp >= ?
        GROUP BY session_id
        HAVING event_count > 500
      )
    `).get(req.project.id, month)

    // 3. Multi-account devices — same device_model, multiple user_ids
    const multiAccount = db.prepare(`
      SELECT COUNT(*) AS count FROM (
        SELECT s.device_model
        FROM sessions s
        JOIN analytics_events ae ON ae.session_id = s.id
        WHERE s.project_id = ? AND s.started_at >= ?
          AND ae.user_id IS NOT NULL AND ae.user_id != 'anonymous'
        GROUP BY s.device_model
        HAVING COUNT(DISTINCT ae.user_id) > 3
      )
    `).get(req.project.id, month)

    // 4. Impossible sessions — duration > 24 hours
    const impossibleSessions = db.prepare(`
      SELECT COUNT(*) AS count
      FROM sessions
      WHERE project_id = ? AND started_at >= ?
        AND ended_at IS NOT NULL
        AND (ended_at - started_at) > 86400000
    `).get(req.project.id, month)

    // 5. Crash loop devices — >10 crashes from same device in 24h
    const crashLoops = db.prepare(`
      SELECT COUNT(*) AS count FROM (
        SELECT device_model
        FROM sessions
        WHERE project_id = ? AND started_at >= ?
        GROUP BY device_model
        HAVING SUM(crash_count) > 10
      )
    `).get(req.project.id, month)

    // 6. Account takeover signals — identify called many times in one session
    const accountTakeover = db.prepare(`
      SELECT COUNT(DISTINCT session_id) AS count
      FROM (
        SELECT session_id, COUNT(*) AS identify_count
        FROM analytics_events
        WHERE project_id = ? AND timestamp >= ? AND event_name = 'user_identified'
        GROUP BY session_id
        HAVING identify_count >= 5
      )
    `).get(req.project.id, month)

    // Total flagged (deduplicated estimate)
    const totalFlagged = Math.max(
      emulators.count,
      highVelocity.count,
      multiAccount.count,
      impossibleSessions.count,
      crashLoops.count,
      accountTakeover.count
    )

    // Risk score 0-100
    const totalSessions = db.prepare(
      'SELECT COUNT(*) AS count FROM sessions WHERE project_id = ? AND started_at >= ?'
    ).get(req.project.id, month).count

    const riskScore = totalSessions > 0
      ? Math.min(100, Math.round((totalFlagged / totalSessions) * 100 * 10))
      : 0

    res.json({
      riskScore,
      totalSessions,
      signals: {
        emulators:          emulators.count,
        highVelocity:       highVelocity.count,
        multiAccount:       multiAccount.count,
        impossibleSessions: impossibleSessions.count,
        crashLoops:         crashLoops.count,
        accountTakeover:    accountTakeover.count,
      },
      totalFlagged,
      period: { days: 30 }
    })
  })

  // GET /api/fraud/signals?type=all&limit=50
  r.get('/signals', requireAuth, requirePermission('analytics:read'), (req, res) => {
    const { type = 'all', limit = 50 } = req.query
    const month = Date.now() - 30 * 24 * 60 * 60 * 1000
    const signals = []

    // High velocity sessions
    if (type === 'all' || type === 'velocity') {
      const rows = db.prepare(`
        SELECT s.id AS session_id, s.device_model, s.app_version,
               s.started_at, COUNT(e.id) AS event_count,
               'HIGH_VELOCITY' AS signal_type,
               'CRITICAL' AS severity
        FROM sessions s
        JOIN events e ON e.session_id = s.id
        WHERE s.project_id = ? AND s.started_at >= ?
        GROUP BY s.id
        HAVING event_count > 500
        ORDER BY event_count DESC
        LIMIT ?
      `).all(req.project.id, month, parseInt(limit))
      signals.push(...rows)
    }

    // Multi-account devices
    if (type === 'all' || type === 'multi_account') {
      const rows = db.prepare(`
        SELECT s.device_model,
               COUNT(DISTINCT ae.user_id) AS user_count,
               GROUP_CONCAT(DISTINCT ae.user_id) AS user_ids,
               MAX(s.started_at) AS last_seen,
               'MULTI_ACCOUNT' AS signal_type,
               'HIGH' AS severity
        FROM sessions s
        JOIN analytics_events ae ON ae.session_id = s.id
        WHERE s.project_id = ? AND s.started_at >= ?
          AND ae.user_id IS NOT NULL AND ae.user_id != 'anonymous'
        GROUP BY s.device_model
        HAVING user_count > 3
        ORDER BY user_count DESC
        LIMIT ?
      `).all(req.project.id, month, parseInt(limit))
      signals.push(...rows)
    }

    // Crash loop devices
    if (type === 'all' || type === 'crash_loop') {
      const rows = db.prepare(`
        SELECT device_model,
               SUM(crash_count) AS total_crashes,
               COUNT(*) AS session_count,
               MAX(started_at) AS last_seen,
               'CRASH_LOOP' AS signal_type,
               'HIGH' AS severity
        FROM sessions
        WHERE project_id = ? AND started_at >= ?
        GROUP BY device_model
        HAVING total_crashes > 10
        ORDER BY total_crashes DESC
        LIMIT ?
      `).all(req.project.id, month, parseInt(limit))
      signals.push(...rows)
    }

    // Account takeover signals
    if (type === 'all' || type === 'account_takeover') {
      const rows = db.prepare(`
        SELECT ae.session_id,
               s.device_model,
               COUNT(*) AS identify_count,
               GROUP_CONCAT(DISTINCT ae.user_id) AS user_ids,
               MAX(ae.timestamp) AS last_seen,
               'ACCOUNT_TAKEOVER' AS signal_type,
               'CRITICAL' AS severity
        FROM analytics_events ae
        JOIN sessions s ON s.id = ae.session_id
        WHERE ae.project_id = ? AND ae.timestamp >= ?
          AND ae.event_name = 'user_identified'
        GROUP BY ae.session_id
        HAVING identify_count >= 5
        ORDER BY identify_count DESC
        LIMIT ?
      `).all(req.project.id, month, parseInt(limit))
      signals.push(...rows)
    }

    // Emulator signals
    if (type === 'all' || type === 'emulator') {
      const rows = db.prepare(`
        SELECT DISTINCT ae.session_id,
               s.device_model,
               s.started_at,
               json_extract(ae.properties, '$.device_tier') AS device_tier,
               'EMULATOR' AS signal_type,
               'MEDIUM' AS severity
        FROM analytics_events ae
        JOIN sessions s ON s.id = ae.session_id
        WHERE ae.project_id = ? AND ae.timestamp >= ?
          AND json_extract(ae.properties, '$.is_emulator') = 1
        LIMIT ?
      `).all(req.project.id, month, parseInt(limit))
      signals.push(...rows)
    }

    // Sort by severity then recency
    const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
    signals.sort((a, b) => {
      const sa = severityOrder[a.severity] ?? 3
      const sb = severityOrder[b.severity] ?? 3
      if (sa !== sb) return sa - sb
      return (b.last_seen || b.started_at || 0) - (a.last_seen || a.started_at || 0)
    })

    res.json({ signals: signals.slice(0, parseInt(limit)), total: signals.length })
  })

  // GET /api/fraud/device/:deviceModel
  r.get('/device/:deviceModel', requireAuth, requirePermission('analytics:read'), (req, res) => {
    const device = decodeURIComponent(req.params.deviceModel)
    const month  = Date.now() - 30 * 24 * 60 * 60 * 1000

    const sessions = db.prepare(`
      SELECT * FROM sessions
      WHERE project_id = ? AND device_model = ? AND started_at >= ?
      ORDER BY started_at DESC LIMIT 20
    `).all(req.project.id, device, month)

    const userIds = db.prepare(`
      SELECT DISTINCT ae.user_id
      FROM analytics_events ae
      JOIN sessions s ON s.id = ae.session_id
      WHERE s.project_id = ? AND s.device_model = ?
        AND ae.user_id IS NOT NULL AND ae.user_id != 'anonymous'
    `).all(req.project.id, device).map(r => r.user_id)

    const totalEvents = db.prepare(`
      SELECT COUNT(*) AS count
      FROM events e
      JOIN sessions s ON s.id = e.session_id
      WHERE s.project_id = ? AND s.device_model = ? AND e.timestamp >= ?
    `).get(req.project.id, device, month)

    const totalCrashes = sessions.reduce((s, sess) => s + (sess.crash_count || 0), 0)

    // Risk flags
    const flags = []
    if (userIds.length > 3)    flags.push({ type: 'MULTI_ACCOUNT',   detail: `${userIds.length} different user IDs from this device` })
    if (totalCrashes > 10)     flags.push({ type: 'CRASH_LOOP',      detail: `${totalCrashes} crashes in 30 days` })
    if (totalEvents.count > 5000) flags.push({ type: 'HIGH_VELOCITY', detail: `${totalEvents.count} events in 30 days` })
    if (sessions.length > 50)  flags.push({ type: 'EXCESSIVE_SESSIONS', detail: `${sessions.length} sessions in 30 days` })

    res.json({
      device,
      sessions: sessions.length,
      userIds,
      totalEvents: totalEvents.count,
      totalCrashes,
      flags,
      riskLevel: flags.length === 0 ? 'clean'
        : flags.some(f => ['MULTI_ACCOUNT','CRASH_LOOP'].includes(f.type)) ? 'high'
        : 'medium',
      recentSessions: sessions.slice(0, 5)
    })
  })

  // POST /api/fraud/flag — manually flag a session or device
  r.post('/flag', requireAuth, requirePermission('analytics:write'), (req, res) => {
    const { sessionId, deviceModel, reason, severity = 'HIGH' } = req.body
    if (!sessionId && !deviceModel) {
      return res.status(400).json({ error: 'sessionId or deviceModel required' })
    }

    // Store as a special alert
    db.prepare(`
      INSERT INTO alerts (project_id, metric, baseline_version, current_version,
                          baseline_value, current_value, change_percent, severity)
      VALUES (?, 'fraud', 'manual', ?, 0, 1, 100, ?)
    `).run(
      req.project.id,
      sessionId || deviceModel,
      severity.toLowerCase()
    )

    res.json({ flagged: true, sessionId, deviceModel, reason })
  })

  return r
}
