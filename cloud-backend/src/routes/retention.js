/**
 * FEATURE 1: Retention Cohorts
 * Day 1 / Day 7 / Day 14 / Day 30 retention analysis — Mixpanel-style.
 *
 * How it works:
 *   - On every analytics event, we upsert the user into retention_cohorts
 *     with their first-seen date as the cohort_date.
 *   - We then check if today is Day 1/7/14/30 relative to cohort_date and
 *     flip the corresponding flag.
 *   - The /api/retention endpoint aggregates these flags into a cohort table.
 *
 * Routes:
 *   GET /api/retention              — cohort table (day 1/7/14/30 retention %)
 *   GET /api/retention/trend        — weekly retention trend over time
 *   GET /api/retention/user/:userId — individual user retention status
 */

const router = require('express').Router()

module.exports = (db, requireAuth, requirePermission) => {

  // GET /api/retention?from=&to=&granularity=week
  router.get('/', requireAuth, requirePermission('analytics:read'), (req, res) => {
    const { from, to, limit = 12 } = req.query
    const fromTs = from ? parseInt(from) : Date.now() - 90 * 24 * 60 * 60 * 1000
    const toTs   = to   ? parseInt(to)   : Date.now()

    const fromDate = new Date(fromTs).toISOString().slice(0, 10)
    const toDate   = new Date(toTs).toISOString().slice(0, 10)

    // Cohort rows: one row per cohort_date
    const cohorts = db.prepare(`
      SELECT
        cohort_date,
        COUNT(*)                                          AS cohort_size,
        SUM(day_1_returned)                               AS day_1,
        SUM(day_7_returned)                               AS day_7,
        SUM(day_14_returned)                              AS day_14,
        SUM(day_30_returned)                              AS day_30,
        ROUND(SUM(day_1_returned)  * 100.0 / COUNT(*), 1) AS day_1_pct,
        ROUND(SUM(day_7_returned)  * 100.0 / COUNT(*), 1) AS day_7_pct,
        ROUND(SUM(day_14_returned) * 100.0 / COUNT(*), 1) AS day_14_pct,
        ROUND(SUM(day_30_returned) * 100.0 / COUNT(*), 1) AS day_30_pct
      FROM retention_cohorts
      WHERE project_id = ?
        AND cohort_date BETWEEN ? AND ?
      GROUP BY cohort_date
      ORDER BY cohort_date DESC
      LIMIT ?
    `).all(req.project.id, fromDate, toDate, parseInt(limit))

    // Overall averages
    const overall = db.prepare(`
      SELECT
        COUNT(*)                                          AS total_users,
        ROUND(AVG(day_1_returned)  * 100.0, 1)           AS avg_day_1_pct,
        ROUND(AVG(day_7_returned)  * 100.0, 1)           AS avg_day_7_pct,
        ROUND(AVG(day_14_returned) * 100.0, 1)           AS avg_day_14_pct,
        ROUND(AVG(day_30_returned) * 100.0, 1)           AS avg_day_30_pct
      FROM retention_cohorts
      WHERE project_id = ?
        AND cohort_date BETWEEN ? AND ?
    `).get(req.project.id, fromDate, toDate)

    res.json({ cohorts, overall, period: { from: fromDate, to: toDate } })
  })

  // GET /api/retention/trend — weekly retention rates over time
  router.get('/trend', requireAuth, requirePermission('analytics:read'), (req, res) => {
    const { weeks = 12 } = req.query

    const trend = db.prepare(`
      SELECT
        strftime('%Y-W%W', cohort_date)                   AS week,
        COUNT(*)                                          AS cohort_size,
        ROUND(AVG(day_1_returned)  * 100.0, 1)           AS day_1_pct,
        ROUND(AVG(day_7_returned)  * 100.0, 1)           AS day_7_pct,
        ROUND(AVG(day_30_returned) * 100.0, 1)           AS day_30_pct
      FROM retention_cohorts
      WHERE project_id = ?
        AND cohort_date >= date('now', ?)
      GROUP BY week
      ORDER BY week ASC
    `).all(req.project.id, `-${parseInt(weeks) * 7} days`)

    res.json({ trend, weeks: parseInt(weeks) })
  })

  // GET /api/retention/user/:userId
  router.get('/user/:userId', requireAuth, requirePermission('analytics:read'), (req, res) => {
    const row = db.prepare(
      'SELECT * FROM retention_cohorts WHERE project_id = ? AND user_id = ?'
    ).get(req.project.id, req.params.userId)

    if (!row) return res.status(404).json({ error: 'User not found in retention data' })

    const cohortDate = new Date(row.cohort_date)
    const today      = new Date()
    const daysSince  = Math.floor((today - cohortDate) / (1000 * 60 * 60 * 24))

    res.json({
      userId:       req.params.userId,
      cohortDate:   row.cohort_date,
      daysSinceFirst: daysSince,
      lastSeenDate: row.last_seen_date,
      returned: {
        day1:  !!row.day_1_returned,
        day7:  !!row.day_7_returned,
        day14: !!row.day_14_returned,
        day30: !!row.day_30_returned,
      }
    })
  })

  return router
}

/**
 * Called on every analytics event to update retention cohort data.
 * Upserts the user's first-seen date and checks day milestones.
 */
const updateRetention = (db, projectId, userId) => {
  if (!userId || userId === 'anonymous') return

  const today     = new Date().toISOString().slice(0, 10)
  const now       = Date.now()

  // Upsert: set cohort_date only on first insert
  db.prepare(`
    INSERT INTO retention_cohorts (project_id, user_id, cohort_date, last_seen_date)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(project_id, user_id) DO UPDATE SET
      last_seen_date = excluded.last_seen_date
  `).run(projectId, userId, today, today)

  // Read back to check day milestones
  const row = db.prepare(
    'SELECT * FROM retention_cohorts WHERE project_id = ? AND user_id = ?'
  ).get(projectId, userId)

  if (!row) return

  const cohortDate = new Date(row.cohort_date)
  const daysSince  = Math.floor((now - cohortDate.getTime()) / (1000 * 60 * 60 * 24))

  // Flip milestone flags (only ever goes 0→1, never back)
  if (daysSince >= 1  && !row.day_1_returned) {
    db.prepare('UPDATE retention_cohorts SET day_1_returned = 1 WHERE project_id = ? AND user_id = ?')
      .run(projectId, userId)
  }
  if (daysSince >= 7  && !row.day_7_returned) {
    db.prepare('UPDATE retention_cohorts SET day_7_returned = 1 WHERE project_id = ? AND user_id = ?')
      .run(projectId, userId)
  }
  if (daysSince >= 14 && !row.day_14_returned) {
    db.prepare('UPDATE retention_cohorts SET day_14_returned = 1 WHERE project_id = ? AND user_id = ?')
      .run(projectId, userId)
  }
  if (daysSince >= 30 && !row.day_30_returned) {
    db.prepare('UPDATE retention_cohorts SET day_30_returned = 1 WHERE project_id = ? AND user_id = ?')
      .run(projectId, userId)
  }
}

module.exports.updateRetention = updateRetention
module.exports.router = (db, requireAuth, requirePermission) => {
  const r = require('express').Router()

  r.get('/', requireAuth, requirePermission('analytics:read'), (req, res) => {
    const { from, to, limit = 12 } = req.query
    const fromTs = from ? parseInt(from) : Date.now() - 90 * 24 * 60 * 60 * 1000
    const toTs   = to   ? parseInt(to)   : Date.now()
    const fromDate = new Date(fromTs).toISOString().slice(0, 10)
    const toDate   = new Date(toTs).toISOString().slice(0, 10)

    const cohorts = db.prepare(`
      SELECT
        cohort_date,
        COUNT(*)                                          AS cohort_size,
        SUM(day_1_returned)                               AS day_1,
        SUM(day_7_returned)                               AS day_7,
        SUM(day_14_returned)                              AS day_14,
        SUM(day_30_returned)                              AS day_30,
        ROUND(SUM(day_1_returned)  * 100.0 / COUNT(*), 1) AS day_1_pct,
        ROUND(SUM(day_7_returned)  * 100.0 / COUNT(*), 1) AS day_7_pct,
        ROUND(SUM(day_14_returned) * 100.0 / COUNT(*), 1) AS day_14_pct,
        ROUND(SUM(day_30_returned) * 100.0 / COUNT(*), 1) AS day_30_pct
      FROM retention_cohorts
      WHERE project_id = ? AND cohort_date BETWEEN ? AND ?
      GROUP BY cohort_date
      ORDER BY cohort_date DESC
      LIMIT ?
    `).all(req.project.id, fromDate, toDate, parseInt(limit))

    const overall = db.prepare(`
      SELECT
        COUNT(*)                                AS total_users,
        ROUND(AVG(day_1_returned)  * 100.0, 1) AS avg_day_1_pct,
        ROUND(AVG(day_7_returned)  * 100.0, 1) AS avg_day_7_pct,
        ROUND(AVG(day_14_returned) * 100.0, 1) AS avg_day_14_pct,
        ROUND(AVG(day_30_returned) * 100.0, 1) AS avg_day_30_pct
      FROM retention_cohorts
      WHERE project_id = ? AND cohort_date BETWEEN ? AND ?
    `).get(req.project.id, fromDate, toDate)

    res.json({ cohorts, overall, period: { from: fromDate, to: toDate } })
  })

  r.get('/trend', requireAuth, requirePermission('analytics:read'), (req, res) => {
    const { weeks = 12 } = req.query
    const trend = db.prepare(`
      SELECT
        strftime('%Y-W%W', cohort_date)        AS week,
        COUNT(*)                               AS cohort_size,
        ROUND(AVG(day_1_returned)  * 100.0, 1) AS day_1_pct,
        ROUND(AVG(day_7_returned)  * 100.0, 1) AS day_7_pct,
        ROUND(AVG(day_30_returned) * 100.0, 1) AS day_30_pct
      FROM retention_cohorts
      WHERE project_id = ? AND cohort_date >= date('now', ?)
      GROUP BY week ORDER BY week ASC
    `).all(req.project.id, `-${parseInt(weeks) * 7} days`)
    res.json({ trend, weeks: parseInt(weeks) })
  })

  r.get('/user/:userId', requireAuth, requirePermission('analytics:read'), (req, res) => {
    const row = db.prepare(
      'SELECT * FROM retention_cohorts WHERE project_id = ? AND user_id = ?'
    ).get(req.project.id, req.params.userId)
    if (!row) return res.status(404).json({ error: 'User not found in retention data' })
    const daysSince = Math.floor((Date.now() - new Date(row.cohort_date).getTime()) / 86400000)
    res.json({
      userId: req.params.userId, cohortDate: row.cohort_date,
      daysSinceFirst: daysSince, lastSeenDate: row.last_seen_date,
      returned: { day1: !!row.day_1_returned, day7: !!row.day_7_returned, day14: !!row.day_14_returned, day30: !!row.day_30_returned }
    })
  })

  return r
}
