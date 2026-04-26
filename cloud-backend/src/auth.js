/**
 * DroidPulse RBAC — Role-Based Access Control
 *
 * ROLES & WHAT THEY CAN DO:
 * ─────────────────────────────────────────────────────────────────────────────
 * super_admin  Full access. Manage all projects, all users, see all data.
 * admin        Full access within their project. Manage team members.
 * developer    Read all data + live debug. Cannot manage users or delete.
 * analyst      Read analytics + sessions only. No raw logs, no crashes.
 * viewer       Read-only summary dashboards. No raw events, no exports.
 * sdk          Write-only. Device SDK pushes events. Cannot read anything.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const jwt      = require('jsonwebtoken')
const bcrypt   = require('bcryptjs')
const { v4: uuid } = require('uuid')

const JWT_SECRET  = process.env.JWT_SECRET  || 'droidpulse-dev-secret-change-in-prod'
const JWT_EXPIRES = process.env.JWT_EXPIRES || '8h'

// ── Permission matrix ─────────────────────────────────────────────────────────
const PERMISSIONS = {
  super_admin: [
    'projects:read', 'projects:write', 'projects:delete',
    'users:read',    'users:write',    'users:delete',
    'sessions:read', 'sessions:delete',
    'events:read',   'events:write',
    'analytics:read','analytics:write',
    'alerts:read',
    'audit:read',
    'export:run',
    'debug:live',
    'admin:panel',
  ],
  admin: [
    'projects:read',
    'users:read',    'users:write',
    'sessions:read', 'sessions:delete',
    'events:read',   'events:write',
    'analytics:read','analytics:write',
    'alerts:read',
    'audit:read',
    'export:run',
    'debug:live',
    'admin:panel',
  ],
  developer: [
    'projects:read',
    'users:read',
    'sessions:read',
    'events:read',   'events:write',
    'analytics:read','analytics:write',
    'alerts:read',
    'export:run',
    'debug:live',
  ],
  analyst: [
    'projects:read',
    'sessions:read',
    'analytics:read',
    'alerts:read',
    'export:run',
  ],
  viewer: [
    'projects:read',
    'sessions:read',
    'analytics:read',
    'alerts:read',
  ],
  sdk: [
    'events:write',
    'analytics:write',
  ],
}

// What each role sees in the dashboard
const ROLE_DASHBOARD_ACCESS = {
  super_admin: ['overview','analytics','flow','network','heatmap','diagnostics','sessions','alerts','admin'],
  admin:       ['overview','analytics','flow','network','heatmap','diagnostics','sessions','alerts','admin'],
  developer:   ['overview','analytics','flow','network','heatmap','diagnostics','sessions','alerts'],
  analyst:     ['overview','analytics','sessions','alerts'],
  viewer:      ['overview','analytics'],
  sdk:         [],
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const can = (role, permission) =>
  (PERMISSIONS[role] || []).includes(permission)

const signToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role, projectId: user.project_id },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  )

const verifyToken = (token) => jwt.verify(token, JWT_SECRET)

// ── Middleware: authenticate via JWT (dashboard users) ────────────────────────
const requireAuth = (req, res, next) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  try {
    const payload = verifyToken(header.replace('Bearer ', ''))
    req.user = payload
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

// ── Middleware: authenticate SDK device (API key) ─────────────────────────────
const requireSdkKey = (db) => (req, res, next) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing API key' })
  }
  const apiKey = header.replace('Bearer ', '')
  const project = db.prepare('SELECT * FROM projects WHERE api_key = ?').get(apiKey)
  if (!project) return res.status(401).json({ error: 'Invalid API key' })
  req.project = project
  req.user    = { role: 'sdk', projectId: project.id }
  next()
}

// ── Middleware: check permission ──────────────────────────────────────────────
const requirePermission = (permission) => (req, res, next) => {
  if (!can(req.user?.role, permission)) {
    return res.status(403).json({
      error: 'Access denied',
      required: permission,
      yourRole: req.user?.role,
    })
  }
  next()
}

// ── Middleware: scope to project ──────────────────────────────────────────────
// super_admin can access any project; others are scoped to their own
const scopeProject = (db) => (req, res, next) => {
  if (req.user.role === 'super_admin') {
    // super_admin can pass ?projectId= or use any project
    const projectId = req.query.projectId || req.body.projectId || req.params.projectId
    if (projectId) {
      const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId)
      if (!project) return res.status(404).json({ error: 'Project not found' })
      req.project = project
    }
    return next()
  }
  // Everyone else is scoped to their assigned project
  if (!req.user.projectId) return res.status(403).json({ error: 'No project assigned' })
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.user.projectId)
  if (!project) return res.status(403).json({ error: 'Project not found' })
  req.project = project
  next()
}

// ── Auth routes factory ───────────────────────────────────────────────────────
const createAuthRoutes = (db, auditLog) => {
  const router = require('express').Router()

  // POST /auth/login
  router.post('/login', (req, res) => {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password required' })
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(email)
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })

    const valid = bcrypt.compareSync(password, user.password_hash)
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

    // Update last login
    db.prepare('UPDATE users SET last_login = ? WHERE id = ?').run(Date.now(), user.id)

    const token = signToken(user)

    auditLog(db, user.id, user.email, 'login', 'auth', null, req.ip)

    res.json({
      token,
      user: {
        id:          user.id,
        email:       user.email,
        name:        user.name,
        role:        user.role,
        projectId:   user.project_id,
        permissions: PERMISSIONS[user.role] || [],
        tabs:        ROLE_DASHBOARD_ACCESS[user.role] || [],
      }
    })
  })

  // POST /auth/logout
  router.post('/logout', requireAuth, (req, res) => {
    auditLog(db, req.user.id, req.user.email, 'logout', 'auth', null, req.ip)
    res.json({ ok: true })
  })

  // GET /auth/me — current user info
  router.get('/me', requireAuth, (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json({
      id:          user.id,
      email:       user.email,
      name:        user.name,
      role:        user.role,
      projectId:   user.project_id,
      permissions: PERMISSIONS[user.role] || [],
      tabs:        ROLE_DASHBOARD_ACCESS[user.role] || [],
      lastLogin:   user.last_login,
    })
  })

  return router
}

// ── User management routes factory ───────────────────────────────────────────
const createUserRoutes = (db, auditLog) => {
  const router = require('express').Router()

  // GET /admin/users — list all users (admin+)
  router.get('/', requireAuth, requirePermission('users:read'), (req, res) => {
    const users = db.prepare(`
      SELECT id, email, name, role, project_id, is_active, last_login, created_at
      FROM users ORDER BY created_at DESC
    `).all()
    res.json({ users })
  })

  // POST /admin/users — create user (admin+)
  router.post('/', requireAuth, requirePermission('users:write'), (req, res) => {
    const { email, name, password, role, projectId } = req.body

    if (!email || !name || !password || !role) {
      return res.status(400).json({ error: 'email, name, password, role required' })
    }

    const validRoles = ['admin','developer','analyst','viewer']
    // Only super_admin can create another super_admin
    if (role === 'super_admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Only super_admin can create super_admin users' })
    }
    if (!validRoles.includes(role) && role !== 'super_admin') {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` })
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
    if (existing) return res.status(409).json({ error: 'Email already exists' })

    const hash = bcrypt.hashSync(password, 10)
    const id   = `user-${uuid().slice(0, 8)}`

    db.prepare(`
      INSERT INTO users (id, email, name, password_hash, role, project_id, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, email, name, hash, role, projectId || null, req.user.id)

    auditLog(db, req.user.id, req.user.email, 'create_user', `user:${id}`, `role=${role}`, req.ip)

    res.status(201).json({ id, email, name, role, projectId })
  })

  // PATCH /admin/users/:id — update role or status (admin+)
  router.patch('/:id', requireAuth, requirePermission('users:write'), (req, res) => {
    const { role, isActive, projectId, name } = req.body
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id)
    if (!user) return res.status(404).json({ error: 'User not found' })

    // Prevent demoting yourself
    if (req.params.id === req.user.id && role && role !== req.user.role) {
      return res.status(400).json({ error: 'Cannot change your own role' })
    }

    if (role) {
      if (role === 'super_admin' && req.user.role !== 'super_admin') {
        return res.status(403).json({ error: 'Only super_admin can assign super_admin role' })
      }
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id)
    }
    if (isActive !== undefined) {
      db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(isActive ? 1 : 0, req.params.id)
    }
    if (projectId !== undefined) {
      db.prepare('UPDATE users SET project_id = ? WHERE id = ?').run(projectId, req.params.id)
    }
    if (name) {
      db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, req.params.id)
    }

    auditLog(db, req.user.id, req.user.email, 'update_user', `user:${req.params.id}`,
      JSON.stringify({ role, isActive, projectId }), req.ip)

    res.json({ updated: req.params.id })
  })

  // DELETE /admin/users/:id — deactivate user (admin+)
  router.delete('/:id', requireAuth, requirePermission('users:delete'), (req, res) => {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' })
    }
    db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(req.params.id)
    auditLog(db, req.user.id, req.user.email, 'deactivate_user', `user:${req.params.id}`, null, req.ip)
    res.json({ deactivated: req.params.id })
  })

  // POST /admin/users/:id/reset-password
  router.post('/:id/reset-password', requireAuth, requirePermission('users:write'), (req, res) => {
    const { newPassword } = req.body
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' })
    }
    const hash = bcrypt.hashSync(newPassword, 10)
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.params.id)
    auditLog(db, req.user.id, req.user.email, 'reset_password', `user:${req.params.id}`, null, req.ip)
    res.json({ ok: true })
  })

  return router
}

// ── Audit log helper ──────────────────────────────────────────────────────────
const auditLog = (db, userId, userEmail, action, resource, detail, ip) => {
  try {
    db.prepare(`
      INSERT INTO audit_log (user_id, user_email, action, resource, detail, ip)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId || null, userEmail || null, action, resource || null, detail || null, ip || null)
  } catch (_) {}
}

module.exports = {
  can,
  signToken,
  verifyToken,
  requireAuth,
  requireSdkKey,
  requirePermission,
  scopeProject,
  createAuthRoutes,
  createUserRoutes,
  auditLog,
  PERMISSIONS,
  ROLE_DASHBOARD_ACCESS,
}
