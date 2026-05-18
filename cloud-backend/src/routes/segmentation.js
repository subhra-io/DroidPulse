/**
 * FEATURE 3: Segmentation
 * Slice any metric by arbitrary user/event properties.
 * Equivalent to Mixpanel's Insights — "show me conversion rate broken down by plan".
 *
 * Routes:
 *   POST /api/segment/events    — event count/metric broken down by a property
 *   POST /api/segment/users     — user count broken down by a property
 *   POST /api/segment/funnel    — funnel conversion broken down by a property
 *   POST /api/segment/perf      — performance metric broken down by a property
 */

module.exports.router = (db, requireAuth, requirePermission) => {
  const r = require('express').Router()

  /**
   * POST /api/segment/events
   * Body: {
   *   event: "purchase_completed",   // event to measure
   *   breakdownBy: "plan",           // property key to group by
   *   metric: "count" | "revenue" | "avg_perf",
   *   from: timestamp, to: timestamp,
   *   filters: [{ key, op, value }]  // optional filters
   * }
   */
  r.post('/events', requireAuth, requirePermission('analytics:read'), (req, res) => {
    const { event, breakdownBy, metric = 'count', from, to, filters = [] } = req.body
    if (!event || !breakdownBy) {
      return res.status(400).json({ error: 'event and breakdownBy required' })
    }

    const fromTs = from ? parseInt(from) : Date.now() - 7 * 24 * 60 * 60 * 1000
    const toTs   = to   ? parseInt(to)   : Date.now()

    // We store properties as JSON — use json_extract for the breakdown key
    const metricExpr = {
      count:    'COUNT(*)',
      revenue:  'SUM(revenue)',
      avg_perf: 'AVG(perf_score)',
      avg_startup: 'AVG(startup_time_ms)',
    }[metric] || 'COUNT(*)'

    const rows = db.prepare(`
      SELECT
        COALESCE(json_extract(properties, '$.' || ?), 'unknown') AS segment,
        ${metricExpr}                                             AS value,
        COUNT(DISTINCT user_id)                                   AS unique_users
      FROM analytics_events
      WHERE project_id = ?
        AND event_name = ?
        AND timestamp BETWEEN ? AND ?
      GROUP BY segment
      ORDER BY value DESC
      LIMIT 50
    `).all(breakdownBy, req.project.id, event, fromTs, toTs)

    res.json({
      event, breakdownBy, metric,
      segments: rows,
      period: { from: fromTs, to: toTs }
    })
  })

  /**
   * POST /api/segment/users
   * Body: { breakdownBy: "plan", from, to }
   */
  r.post('/users', requireAuth, requirePermission('analytics:read'), (req, res) => {
    const { breakdownBy, from, to } = req.body
    if (!breakdownBy) return res.status(400).json({ error: 'breakdownBy required' })

    const fromTs = from ? parseInt(from) : Date.now() - 30 * 24 * 60 * 60 * 1000
    const toTs   = to   ? parseInt(to)   : Date.now()

    const rows = db.prepare(`
      SELECT
        COALESCE(json_extract(properties, '$.' || ?), 'unknown') AS segment,
        COUNT(*)                                                  AS user_count,
        AVG(avg_perf_score)                                       AS avg_perf,
        SUM(total_revenue)                                        AS total_revenue,
        AVG(session_count)                                        AS avg_sessions
      FROM user_profiles
      WHERE project_id = ?
        AND last_seen BETWEEN ? AND ?
      GROUP BY segment
      ORDER BY user_count DESC
      LIMIT 50
    `).all(breakdownBy, req.project.id, fromTs, toTs)

    res.json({ breakdownBy, segments: rows, period: { from: fromTs, to: toTs } })
  })

  /**
   * POST /api/segment/funnel
   * Body: { funnelName: "checkout", breakdownBy: "device_tier", from, to }
   */
  r.post('/funnel', requireAuth, requirePermission('analytics:read'), (req, res) => {
    const { funnelName, breakdownBy, from, to } = req.body
    if (!funnelName || !breakdownBy) {
      return res.status(400).json({ error: 'funnelName and breakdownBy required' })
    }

    const fromTs = from ? parseInt(from) : Date.now() - 7 * 24 * 60 * 60 * 1000
    const toTs   = to   ? parseInt(to)   : Date.now()

    // Get all steps for this funnel (ordered by first occurrence)
    const steps = db.prepare(`
      SELECT step_name, MIN(timestamp) AS first_ts FROM funnel_events
      WHERE project_id = ? AND funnel_name = ? AND timestamp BETWEEN ? AND ?
      GROUP BY step_name
      ORDER BY first_ts ASC
    `).all(req.project.id, funnelName, fromTs, toTs).map(s => s.step_name)

    // For each segment value, count users per step
    const segmentData = db.prepare(`
      SELECT
        COALESCE(json_extract(
          (SELECT properties FROM analytics_events
           WHERE user_id = fe.user_id AND project_id = fe.project_id
           ORDER BY timestamp DESC LIMIT 1),
          '$.' || ?
        ), 'unknown')                       AS segment,
        fe.step_name,
        COUNT(DISTINCT fe.user_id)          AS users
      FROM funnel_events fe
      WHERE fe.project_id = ? AND fe.funnel_name = ? AND fe.timestamp BETWEEN ? AND ?
      GROUP BY segment, fe.step_name
    `).all(breakdownBy, req.project.id, funnelName, fromTs, toTs)

    // Pivot into { segment → { step → count } }
    const pivot = {}
    segmentData.forEach(row => {
      if (!pivot[row.segment]) pivot[row.segment] = {}
      pivot[row.segment][row.step_name] = row.users
    })

    const result = Object.entries(pivot).map(([segment, stepCounts]) => ({
      segment,
      steps: steps.map((step, i) => {
        const users = stepCounts[step] || 0
        const prevUsers = i > 0 ? (stepCounts[steps[i - 1]] || 0) : users
        return {
          step,
          users,
          dropoff_pct: prevUsers > 0 ? Math.round((1 - users / prevUsers) * 100) : 0
        }
      }),
      overall_conversion: steps.length > 1
        ? Math.round(((stepCounts[steps[steps.length - 1]] || 0) / (stepCounts[steps[0]] || 1)) * 100)
        : 100
    }))

    res.json({ funnelName, breakdownBy, segments: result, steps, period: { from: fromTs, to: toTs } })
  })

  /**
   * POST /api/segment/perf
   * Body: { metric: "avg_fps" | "avg_startup_ms" | "avg_memory_mb", breakdownBy: "app_version", from, to }
   */
  r.post('/perf', requireAuth, requirePermission('analytics:read'), (req, res) => {
    const { metric = 'avg_fps', breakdownBy = 'app_version', from, to } = req.body

    const fromTs = from ? parseInt(from) : Date.now() - 7 * 24 * 60 * 60 * 1000
    const toTs   = to   ? parseInt(to)   : Date.now()

    const metricCol = {
      avg_fps:        'AVG(json_extract(data, \'$.fps\'))',
      avg_startup_ms: 'AVG(json_extract(data, \'$.totalMs\'))',
      avg_memory_mb:  'AVG(json_extract(data, \'$.usedMemoryMb\'))',
      avg_api_ms:     'AVG(json_extract(data, \'$.duration\'))',
    }[metric] || 'AVG(json_extract(data, \'$.fps\'))'

    const eventType = {
      avg_fps:        'fps',
      avg_startup_ms: 'startup',
      avg_memory_mb:  'memory',
      avg_api_ms:     'network',
    }[metric] || 'fps'

    // Breakdown by session-level property (app_version, device_model, os_version, build_type)
    const sessionCol = ['app_version', 'device_model', 'os_version', 'build_type'].includes(breakdownBy)
      ? `s.${breakdownBy}`
      : `'unknown'`

    const rows = db.prepare(`
      SELECT
        ${sessionCol}          AS segment,
        ROUND(${metricCol}, 1) AS value,
        COUNT(*)               AS sample_count
      FROM events e
      JOIN sessions s ON e.session_id = s.id
      WHERE e.project_id = ?
        AND e.type = ?
        AND e.timestamp BETWEEN ? AND ?
      GROUP BY segment
      ORDER BY value DESC
      LIMIT 50
    `).all(req.project.id, eventType, fromTs, toTs)

    res.json({ metric, breakdownBy, segments: rows, period: { from: fromTs, to: toTs } })
  })

  return r
}
