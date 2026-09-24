/**
 * FEATURE 4: A/B Testing / Experiments
 * Create experiments, assign users to variants, track results.
 * Equivalent to Mixpanel Experiments — but with performance impact per variant.
 *
 * Routes:
 *   GET    /api/experiments                    — list experiments
 *   POST   /api/experiments                    — create experiment
 *   GET    /api/experiments/:id                — get experiment details
 *   PATCH  /api/experiments/:id                — update status (start/pause/complete)
 *   DELETE /api/experiments/:id                — delete experiment
 *   POST   /api/experiments/:id/assign         — assign user to variant (SDK call)
 *   GET    /api/experiments/:id/assignment/:uid — get user's variant
 *   GET    /api/experiments/:id/results        — results per variant with stats
 */

const { v4: uuid } = require('uuid')

module.exports.router = (db, requireAuth, requirePermission, requireSdkKey) => {
  const r = require('express').Router()

  // GET /api/experiments
  r.get('/', requireAuth, requirePermission('analytics:read'), (req, res) => {
    const experiments = db.prepare(`
      SELECT e.*,
        (SELECT COUNT(DISTINCT user_id) FROM experiment_assignments
         WHERE experiment_id = e.id AND project_id = e.project_id) AS total_assigned
      FROM experiments e
      WHERE e.project_id = ?
      ORDER BY e.created_at DESC
    `).all(req.project.id)

    res.json({
      experiments: experiments.map(e => ({
        ...e,
        variants: JSON.parse(e.variants)
      }))
    })
  })

  // POST /api/experiments
  r.post('/', requireAuth, requirePermission('analytics:write'), (req, res) => {
    const { name, description, variants } = req.body

    if (!name || !Array.isArray(variants) || variants.length < 2) {
      return res.status(400).json({ error: 'name and at least 2 variants required' })
    }

    // Validate weights sum to 100
    const totalWeight = variants.reduce((s, v) => s + (v.weight || 0), 0)
    if (Math.abs(totalWeight - 100) > 1) {
      return res.status(400).json({ error: `Variant weights must sum to 100 (got ${totalWeight})` })
    }

    const id = `exp-${uuid().slice(0, 8)}`
    db.prepare(`
      INSERT INTO experiments (id, project_id, name, description, variants, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, req.project.id, name, description || null, JSON.stringify(variants), req.user.id)

    res.status(201).json({ id, name, variants, status: 'draft' })
  })

  // GET /api/experiments/:id
  r.get('/:id', requireAuth, requirePermission('analytics:read'), (req, res) => {
    const exp = db.prepare(
      'SELECT * FROM experiments WHERE id = ? AND project_id = ?'
    ).get(req.params.id, req.project.id)

    if (!exp) return res.status(404).json({ error: 'Experiment not found' })

    const assignments = db.prepare(`
      SELECT variant, COUNT(*) AS count
      FROM experiment_assignments
      WHERE experiment_id = ? AND project_id = ?
      GROUP BY variant
    `).all(req.params.id, req.project.id)

    res.json({ ...exp, variants: JSON.parse(exp.variants), assignments })
  })

  // PATCH /api/experiments/:id — { status: 'running' | 'paused' | 'completed' }
  r.patch('/:id', requireAuth, requirePermission('analytics:write'), (req, res) => {
    const { status } = req.body
    const valid = ['draft', 'running', 'paused', 'completed']
    if (!valid.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${valid.join(', ')}` })
    }

    const updates = { status }
    if (status === 'running') updates.start_date = Date.now()
    if (status === 'completed') updates.end_date = Date.now()

    db.prepare(`
      UPDATE experiments SET status = ?, start_date = COALESCE(?, start_date), end_date = COALESCE(?, end_date)
      WHERE id = ? AND project_id = ?
    `).run(status, updates.start_date || null, updates.end_date || null, req.params.id, req.project.id)

    res.json({ updated: req.params.id, status })
  })

  // DELETE /api/experiments/:id
  r.delete('/:id', requireAuth, requirePermission('analytics:write'), (req, res) => {
    db.prepare('DELETE FROM experiment_results    WHERE experiment_id = ? AND project_id = ?').run(req.params.id, req.project.id)
    db.prepare('DELETE FROM experiment_assignments WHERE experiment_id = ? AND project_id = ?').run(req.params.id, req.project.id)
    db.prepare('DELETE FROM experiments           WHERE id = ?          AND project_id = ?').run(req.params.id, req.project.id)
    res.json({ deleted: req.params.id })
  })

  // POST /api/experiments/:id/assign — SDK assigns user to a variant
  // Body: { userId }  — returns { variant }
  r.post('/:id/assign', (req, res) => {
    // Allow both SDK key and JWT auth
    const { userId } = req.body
    if (!userId) return res.status(400).json({ error: 'userId required' })

    const exp = db.prepare(
      "SELECT * FROM experiments WHERE id = ? AND project_id = ? AND status = 'running'"
    ).get(req.params.id, req.project?.id || req.body.projectId)

    if (!exp) return res.status(404).json({ error: 'Experiment not found or not running' })

    // Check if already assigned
    const existing = db.prepare(
      'SELECT variant FROM experiment_assignments WHERE experiment_id = ? AND user_id = ? AND project_id = ?'
    ).get(req.params.id, userId, exp.project_id)

    if (existing) return res.json({ variant: existing.variant, existing: true })

    // Weighted random assignment
    const variants = JSON.parse(exp.variants)
    const rand     = Math.random() * 100
    let cumulative = 0
    let assigned   = variants[0].name

    for (const v of variants) {
      cumulative += v.weight
      if (rand <= cumulative) { assigned = v.name; break }
    }

    db.prepare(`
      INSERT INTO experiment_assignments (project_id, experiment_id, user_id, variant)
      VALUES (?, ?, ?, ?)
    `).run(exp.project_id, req.params.id, userId, assigned)

    res.json({ variant: assigned, existing: false })
  })

  // GET /api/experiments/:id/assignment/:userId
  r.get('/:id/assignment/:userId', requireAuth, requirePermission('analytics:read'), (req, res) => {
    const row = db.prepare(
      'SELECT variant, assigned_at FROM experiment_assignments WHERE experiment_id = ? AND user_id = ? AND project_id = ?'
    ).get(req.params.id, req.params.userId, req.project.id)

    if (!row) return res.status(404).json({ error: 'No assignment found' })
    res.json({ userId: req.params.userId, variant: row.variant, assignedAt: row.assigned_at })
  })

  // GET /api/experiments/:id/results — stats per variant
  r.get('/:id/results', requireAuth, requirePermission('analytics:read'), (req, res) => {
    const exp = db.prepare(
      'SELECT * FROM experiments WHERE id = ? AND project_id = ?'
    ).get(req.params.id, req.project.id)
    if (!exp) return res.status(404).json({ error: 'Experiment not found' })

    const variants = JSON.parse(exp.variants)

    // Users per variant
    const assignments = db.prepare(`
      SELECT variant, COUNT(*) AS users
      FROM experiment_assignments
      WHERE experiment_id = ? AND project_id = ?
      GROUP BY variant
    `).all(req.params.id, req.project.id)

    // Metrics per variant from analytics_events (join via assignments)
    const metrics = db.prepare(`
      SELECT
        ea.variant,
        COUNT(DISTINCT ae.user_id)          AS unique_users,
        COUNT(*)                            AS event_count,
        SUM(ae.revenue)                     AS total_revenue,
        AVG(ae.revenue)                     AS avg_revenue,
        AVG(ae.perf_score)                  AS avg_perf,
        AVG(ae.startup_time_ms)             AS avg_startup_ms,
        AVG(ae.fps_avg)                     AS avg_fps,
        SUM(CASE WHEN ae.crash_free=0 THEN 1 ELSE 0 END) AS crashes
      FROM experiment_assignments ea
      JOIN analytics_events ae ON ae.user_id = ea.user_id AND ae.project_id = ea.project_id
      WHERE ea.experiment_id = ? AND ea.project_id = ?
      GROUP BY ea.variant
    `).all(req.params.id, req.project.id)

    // Build result per variant
    const assignMap  = Object.fromEntries(assignments.map(a => [a.variant, a.users]))
    const metricsMap = Object.fromEntries(metrics.map(m => [m.variant, m]))

    const results = variants.map(v => {
      const m = metricsMap[v.name] || {}
      const users = assignMap[v.name] || 0
      return {
        variant:       v.name,
        description:   v.description,
        weight:        v.weight,
        users,
        eventCount:    m.event_count || 0,
        totalRevenue:  Math.round((m.total_revenue || 0) * 100) / 100,
        avgRevenue:    Math.round((m.avg_revenue || 0) * 100) / 100,
        avgPerfScore:  Math.round(m.avg_perf || 0),
        avgStartupMs:  Math.round(m.avg_startup_ms || 0),
        avgFps:        Math.round(m.avg_fps || 0),
        crashes:       m.crashes || 0,
        conversionRate: users > 0 ? Math.round(((m.unique_users || 0) / users) * 100) : 0,
      }
    })

    // Simple significance check (chi-square approximation)
    const control   = results[0]
    const treatment = results[1]
    let significance = null
    if (control && treatment && control.users > 30 && treatment.users > 30) {
      const p1 = control.conversionRate / 100
      const p2 = treatment.conversionRate / 100
      const pooled = ((p1 * control.users) + (p2 * treatment.users)) / (control.users + treatment.users)
      const se = Math.sqrt(pooled * (1 - pooled) * (1 / control.users + 1 / treatment.users))
      const z  = se > 0 ? Math.abs(p2 - p1) / se : 0
      significance = {
        zScore:     Math.round(z * 100) / 100,
        significant: z > 1.96,  // 95% confidence
        confidence:  z > 2.576 ? 99 : z > 1.96 ? 95 : z > 1.645 ? 90 : null,
        lift:        p1 > 0 ? Math.round(((p2 - p1) / p1) * 100) : null,
      }
    }

    res.json({
      experiment: { ...exp, variants },
      results,
      significance,
      totalUsers: assignments.reduce((s, a) => s + a.users, 0),
    })
  })

  return r
}

/**
 * Called from analytics track to record experiment result for a user.
 */
module.exports.recordExperimentResult = (db, projectId, userId, eventName, value) => {
  if (!userId) return

  // Find all running experiments this user is assigned to
  const assignments = db.prepare(`
    SELECT ea.experiment_id, ea.variant
    FROM experiment_assignments ea
    JOIN experiments e ON e.id = ea.experiment_id
    WHERE ea.project_id = ? AND ea.user_id = ? AND e.status = 'running'
  `).all(projectId, userId)

  for (const a of assignments) {
    db.prepare(`
      INSERT INTO experiment_results (project_id, experiment_id, variant, metric, value)
      VALUES (?, ?, ?, ?, ?)
    `).run(projectId, a.experiment_id, a.variant, eventName, value || 1)
  }
}
