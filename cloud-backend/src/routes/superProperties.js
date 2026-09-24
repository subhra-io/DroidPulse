/**
 * FEATURE 5: Super Properties
 * Global key-value properties auto-attached to every analytics event for a project.
 * Equivalent to Mixpanel's super properties — set once, appear on all events.
 *
 * Routes:
 *   GET    /api/super-properties          — list all super properties
 *   POST   /api/super-properties          — set/update one or many
 *   DELETE /api/super-properties/:key     — remove a super property
 */

const router = require('express').Router()

module.exports = (db, requireAuth, requirePermission) => {

  // GET /api/super-properties
  router.get('/', requireAuth, requirePermission('analytics:read'), (req, res) => {
    const rows = db.prepare(
      'SELECT key, value, updated_at FROM super_properties WHERE project_id = ? ORDER BY key ASC'
    ).all(req.project.id)

    // Return as flat object for easy consumption
    const props = {}
    rows.forEach(r => {
      try { props[r.key] = JSON.parse(r.value) } catch { props[r.key] = r.value }
    })
    res.json({ superProperties: props, count: rows.length })
  })

  // POST /api/super-properties — body: { properties: { key: value, ... } }
  router.post('/', requireAuth, requirePermission('analytics:write'), (req, res) => {
    const { properties } = req.body
    if (!properties || typeof properties !== 'object') {
      return res.status(400).json({ error: 'properties object required' })
    }

    const upsert = db.prepare(`
      INSERT INTO super_properties (project_id, key, value, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(project_id, key) DO UPDATE SET
        value      = excluded.value,
        updated_at = excluded.updated_at
    `)

    const now = Date.now()
    const insertMany = db.transaction((props) => {
      for (const [key, value] of Object.entries(props)) {
        upsert.run(req.project.id, key, JSON.stringify(value), now)
      }
    })
    insertMany(properties)

    res.json({ updated: Object.keys(properties).length, properties })
  })

  // DELETE /api/super-properties/:key
  router.delete('/:key', requireAuth, requirePermission('analytics:write'), (req, res) => {
    const result = db.prepare(
      'DELETE FROM super_properties WHERE project_id = ? AND key = ?'
    ).run(req.project.id, req.params.key)

    if (result.changes === 0) {
      return res.status(404).json({ error: `Super property '${req.params.key}' not found` })
    }
    res.json({ deleted: req.params.key })
  })

  return router
}

/**
 * Helper: merge super properties into an event's properties.
 * Called by the /api/analytics/track handler before storing events.
 */
const mergeSuperProperties = (db, projectId, eventProperties) => {
  const rows = db.prepare(
    'SELECT key, value FROM super_properties WHERE project_id = ?'
  ).all(projectId)

  const superProps = {}
  rows.forEach(r => {
    try { superProps[r.key] = JSON.parse(r.value) } catch { superProps[r.key] = r.value }
  })

  // Super properties are overridden by event-level properties (event wins)
  return { ...superProps, ...eventProperties }
}

module.exports.mergeSuperProperties = mergeSuperProperties
module.exports.router = (db, requireAuth, requirePermission) => {
  const r = require('express').Router()

  r.get('/', (req, res) => {
    const rows = db.prepare(
      'SELECT key, value, updated_at FROM super_properties WHERE project_id = ? ORDER BY key ASC'
    ).all(req.project.id)
    const props = {}
    rows.forEach(row => {
      try { props[row.key] = JSON.parse(row.value) } catch { props[row.key] = row.value }
    })
    res.json({ superProperties: props, count: rows.length })
  })

  r.post('/', (req, res) => {
    const { properties } = req.body
    if (!properties || typeof properties !== 'object') {
      return res.status(400).json({ error: 'properties object required' })
    }
    const upsert = db.prepare(`
      INSERT INTO super_properties (project_id, key, value, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(project_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `)
    const now = Date.now()
    db.transaction((props) => {
      for (const [key, value] of Object.entries(props)) upsert.run(req.project.id, key, JSON.stringify(value), now)
    })(properties)
    res.json({ updated: Object.keys(properties).length, properties })
  })

  r.delete('/:key', (req, res) => {
    const result = db.prepare('DELETE FROM super_properties WHERE project_id = ? AND key = ?')
      .run(req.project.id, req.params.key)
    if (result.changes === 0) return res.status(404).json({ error: `Super property '${req.params.key}' not found` })
    res.json({ deleted: req.params.key })
  })

  return r
}
