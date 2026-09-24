/**
 * FEATURE 2: User Path / Flow Analysis
 * Records ordered event sequences per session and aggregates A→B transitions.
 * Equivalent to Mixpanel Flows — shows the most common paths users take.
 *
 * Routes:
 *   GET /api/paths/top          — top N→M event transitions
 *   GET /api/paths/from/:event  — all paths starting from a given event
 *   GET /api/paths/sankey       — Sankey diagram data (nodes + links)
 *   GET /api/paths/session/:id  — full ordered path for one session
 */

const router = require('express').Router()

module.exports.router = (db, requireAuth, requirePermission) => {
  const r = require('express').Router()

  // GET /api/paths/top?limit=20&from=&to=
  r.get('/top', requireAuth, requirePermission('analytics:read'), (req, res) => {
    const { limit = 20, from, to } = req.query
    const fromTs = from ? parseInt(from) : Date.now() - 7 * 24 * 60 * 60 * 1000
    const toTs   = to   ? parseInt(to)   : Date.now()
    const fromDate = new Date(fromTs).toISOString().slice(0, 10)
    const toDate   = new Date(toTs).toISOString().slice(0, 10)

    const rows = db.prepare(`
      SELECT
        from_event,
        to_event,
        SUM(count)              AS total,
        AVG(avg_duration_ms)    AS avg_duration_ms
      FROM path_transitions
      WHERE project_id = ? AND date BETWEEN ? AND ?
      GROUP BY from_event, to_event
      ORDER BY total DESC
      LIMIT ?
    `).all(req.project.id, fromDate, toDate, parseInt(limit))

    const transitions = rows.map(r => ({
      from: r.from_event,
      to: r.to_event,
      count: r.total,
      avgMs: Math.round(r.avg_duration_ms)
    }))

    res.json({ transitions, period: { from: fromDate, to: toDate } })
  })

  // GET /api/paths/from/:event?depth=3
  r.get('/from/:event', requireAuth, requirePermission('analytics:read'), (req, res) => {
    const { depth = 3, from, to } = req.query
    const fromTs = from ? parseInt(from) : Date.now() - 7 * 24 * 60 * 60 * 1000
    const toTs   = to   ? parseInt(to)   : Date.now()
    const fromDate = new Date(fromTs).toISOString().slice(0, 10)
    const toDate   = new Date(toTs).toISOString().slice(0, 10)

    // BFS up to `depth` hops from the starting event
    const visited = new Set()
    const result  = []
    let frontier  = [req.params.event]

    for (let d = 0; d < parseInt(depth) && frontier.length > 0; d++) {
      const nextFrontier = []
      for (const event of frontier) {
        if (visited.has(event)) continue
        visited.add(event)

        const nexts = db.prepare(`
          SELECT to_event, SUM(count) AS total, AVG(avg_duration_ms) AS avg_ms
          FROM path_transitions
          WHERE project_id = ? AND from_event = ? AND date BETWEEN ? AND ?
          GROUP BY to_event
          ORDER BY total DESC
          LIMIT 5
        `).all(req.project.id, event, fromDate, toDate)

        nexts.forEach(n => {
          result.push({ from: event, to: n.to_event, count: n.total, avgMs: Math.round(n.avg_ms) })
          if (!visited.has(n.to_event)) nextFrontier.push(n.to_event)
        })
      }
      frontier = nextFrontier
    }

    res.json({ startEvent: req.params.event, paths: result, depth: parseInt(depth) })
  })

  // GET /api/paths/sankey?from=&to= — Sankey diagram data
  r.get('/sankey', requireAuth, requirePermission('analytics:read'), (req, res) => {
    const { from, to, limit = 50 } = req.query
    const fromTs = from ? parseInt(from) : Date.now() - 7 * 24 * 60 * 60 * 1000
    const toTs   = to   ? parseInt(to)   : Date.now()
    const fromDate = new Date(fromTs).toISOString().slice(0, 10)
    const toDate   = new Date(toTs).toISOString().slice(0, 10)

    const links = db.prepare(`
      SELECT from_event AS source, to_event AS target, SUM(count) AS value
      FROM path_transitions
      WHERE project_id = ? AND date BETWEEN ? AND ?
      GROUP BY from_event, to_event
      ORDER BY value DESC
      LIMIT ?
    `).all(req.project.id, fromDate, toDate, parseInt(limit))

    // Build unique node list
    const nodeSet = new Set()
    links.forEach(l => { nodeSet.add(l.source); nodeSet.add(l.target) })
    const nodes = [...nodeSet].map(name => ({ name }))

    res.json({ nodes, links, period: { from: fromDate, to: toDate } })
  })

  // GET /api/paths/session/:sessionId — full path for one session
  r.get('/session/:sessionId', requireAuth, requirePermission('analytics:read'), (req, res) => {
    const steps = db.prepare(`
      SELECT step_order, event_name, screen, timestamp
      FROM user_paths
      WHERE project_id = ? AND session_id = ?
      ORDER BY step_order ASC
    `).all(req.project.id, req.params.sessionId)

    res.json({ sessionId: req.params.sessionId, steps })
  })

  return r
}

/**
 * Called on every analytics event to record path steps and update transitions.
 */
module.exports.recordPathStep = (db, projectId, sessionId, userId, eventName, screen, timestamp) => {
  // Get current step order for this session
  const lastStep = db.prepare(`
    SELECT MAX(step_order) AS max_order FROM user_paths
    WHERE project_id = ? AND session_id = ?
  `).get(projectId, sessionId)

  const stepOrder = (lastStep?.max_order ?? -1) + 1

  db.prepare(`
    INSERT INTO user_paths (project_id, session_id, user_id, step_order, event_name, screen, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(projectId, sessionId, userId || null, stepOrder, eventName, screen || null, timestamp)

  // Update transition table if there's a previous step
  if (stepOrder > 0) {
    const prevStep = db.prepare(`
      SELECT event_name, timestamp FROM user_paths
      WHERE project_id = ? AND session_id = ? AND step_order = ?
    `).get(projectId, sessionId, stepOrder - 1)

    if (prevStep) {
      const duration = timestamp - prevStep.timestamp
      const today    = new Date().toISOString().slice(0, 10)

      db.prepare(`
        INSERT INTO path_transitions (project_id, from_event, to_event, count, avg_duration_ms, date)
        VALUES (?, ?, ?, 1, ?, ?)
        ON CONFLICT(project_id, from_event, to_event, date) DO UPDATE SET
          count           = count + 1,
          avg_duration_ms = (avg_duration_ms * count + excluded.avg_duration_ms) / (count + 1)
      `).run(projectId, prevStep.event_name, eventName, duration, today)
    }
  }
}
