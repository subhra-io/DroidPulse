'use client'
import { useState, useEffect, useCallback } from 'react'

const CLOUD_API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

// ── Role definitions (mirrors backend) ───────────────────────────────────────
const ROLES = {
  super_admin: {
    label: 'Super Admin',
    color: 'text-red-400 bg-red-950 border-red-800',
    dot:   'bg-red-400',
    desc:  'Full access. Manage all projects and users.',
    tabs:  ['All tabs + Admin Panel'],
  },
  admin: {
    label: 'Admin',
    color: 'text-orange-400 bg-orange-950 border-orange-800',
    dot:   'bg-orange-400',
    desc:  'Full access within project. Manage team members.',
    tabs:  ['All tabs + Admin Panel'],
  },
  developer: {
    label: 'Developer',
    color: 'text-blue-400 bg-blue-950 border-blue-800',
    dot:   'bg-blue-400',
    desc:  'Read all data + live debugging. Cannot manage users.',
    tabs:  ['Overview', 'Analytics', 'Flow', 'Network', 'Heatmap', 'Diagnostics', 'Sessions', 'Alerts'],
  },
  analyst: {
    label: 'Analyst',
    color: 'text-green-400 bg-green-950 border-green-800',
    dot:   'bg-green-400',
    desc:  'Analytics and sessions only. No raw logs or crash data.',
    tabs:  ['Overview', 'Analytics', 'Sessions', 'Alerts'],
  },
  viewer: {
    label: 'Viewer',
    color: 'text-gray-400 bg-gray-900 border-gray-700',
    dot:   'bg-gray-400',
    desc:  'Read-only summary dashboards. No raw events or exports.',
    tabs:  ['Overview', 'Analytics'],
  },
}

const PERMISSION_GROUPS = [
  {
    group: 'Data Access',
    rows: [
      { label: 'View sessions',          perm: 'sessions:read'    },
      { label: 'View raw events / logs', perm: 'events:read'      },
      { label: 'View analytics',         perm: 'analytics:read'   },
      { label: 'View alerts',            perm: 'alerts:read'      },
      { label: 'View audit log',         perm: 'audit:read'       },
    ],
  },
  {
    group: 'Actions',
    rows: [
      { label: 'Export data (CSV/JSON)', perm: 'export:run'       },
      { label: 'Live debug / replay',    perm: 'debug:live'       },
      { label: 'Delete sessions',        perm: 'sessions:delete'  },
    ],
  },
  {
    group: 'Administration',
    rows: [
      { label: 'Manage team members',    perm: 'users:write'      },
      { label: 'Manage projects',        perm: 'projects:write'   },
      { label: 'Access admin panel',     perm: 'admin:panel'      },
    ],
  },
]

const ALL_PERMISSIONS: Record<string, string[]> = {
  super_admin: ['sessions:read','events:read','analytics:read','alerts:read','audit:read','export:run','debug:live','sessions:delete','users:write','projects:write','admin:panel'],
  admin:       ['sessions:read','events:read','analytics:read','alerts:read','audit:read','export:run','debug:live','sessions:delete','users:write','admin:panel'],
  developer:   ['sessions:read','events:read','analytics:read','alerts:read','export:run','debug:live'],
  analyst:     ['sessions:read','analytics:read','alerts:read','export:run'],
  viewer:      ['sessions:read','analytics:read','alerts:read'],
}

interface User {
  id: string
  email: string
  name: string
  role: keyof typeof ROLES
  project_id: string | null
  is_active: number
  last_login: number | null
  created_at: number
}

interface AuditEntry {
  id: number
  user_email: string
  action: string
  resource: string
  detail: string
  ip: string
  timestamp: number
}

export function AdminPanel({ token }: { token: string }) {
  const [section, setSection]     = useState<'roles' | 'users' | 'audit'>('roles')
  const [users, setUsers]         = useState<User[]>([])
  const [audit, setAudit]         = useState<AuditEntry[]>([])
  const [loading, setLoading]     = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm]           = useState({ email: '', name: '', password: '', role: 'developer', projectId: '' })
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState('')

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${CLOUD_API}/admin/users`, { headers })
      if (res.ok) setUsers((await res.json()).users || [])
    } catch (_) {}
    setLoading(false)
  }, [token])

  const loadAudit = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${CLOUD_API}/admin/audit?limit=100`, { headers })
      if (res.ok) setAudit((await res.json()).logs || [])
    } catch (_) {}
    setLoading(false)
  }, [token])

  useEffect(() => {
    if (section === 'users') loadUsers()
    if (section === 'audit') loadAudit()
  }, [section])

  const createUser = async () => {
    setError('')
    if (!form.email || !form.name || !form.password) {
      setError('All fields required')
      return
    }
    const res = await fetch(`${CLOUD_API}/admin/users`, {
      method: 'POST', headers,
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); return }
    setSuccess(`User ${form.email} created`)
    setShowCreate(false)
    setForm({ email: '', name: '', password: '', role: 'developer', projectId: '' })
    loadUsers()
  }

  const toggleActive = async (user: User) => {
    await fetch(`${CLOUD_API}/admin/users/${user.id}`, {
      method: 'PATCH', headers,
      body: JSON.stringify({ isActive: !user.is_active }),
    })
    loadUsers()
  }

  const changeRole = async (user: User, role: string) => {
    await fetch(`${CLOUD_API}/admin/users/${user.id}`, {
      method: 'PATCH', headers,
      body: JSON.stringify({ role }),
    })
    loadUsers()
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-mono font-bold text-white tracking-widest">ADMIN PANEL</div>
          <div className="text-[10px] font-mono text-gray-500 mt-0.5">
            User management, roles, and audit log
          </div>
        </div>
        <div className="flex bg-[#1a1a1a] border border-[#2a2a2a] rounded overflow-hidden">
          {(['roles','users','audit'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSection(s)}
              className={`px-4 py-1.5 text-[10px] font-mono tracking-widest transition-colors ${
                section === s ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {s.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {success && (
        <div className="bg-green-950 border border-green-800 rounded px-4 py-2 text-[10px] font-mono text-green-400">
          ✓ {success}
        </div>
      )}

      {/* ── ROLES SECTION ── */}
      {section === 'roles' && (
        <div className="space-y-4">
          {/* Role cards */}
          <div className="grid grid-cols-1 gap-3">
            {(Object.entries(ROLES) as [keyof typeof ROLES, typeof ROLES[keyof typeof ROLES]][]).map(([key, role]) => (
              <div key={key} className="bg-[#111] border border-[#1e1e1e] rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${role.dot}`} />
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${role.color}`}>
                      {role.label.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-gray-500 text-right max-w-xs">
                    {role.desc}
                  </div>
                </div>

                {/* Dashboard tabs */}
                <div className="mb-3">
                  <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-1.5">DASHBOARD TABS</div>
                  <div className="flex flex-wrap gap-1">
                    {role.tabs.map(tab => (
                      <span key={tab} className="text-[9px] font-mono px-1.5 py-0.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-gray-400">
                        {tab}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Permission matrix */}
                <div className="grid grid-cols-3 gap-x-4 gap-y-1">
                  {PERMISSION_GROUPS.map(group => (
                    <div key={group.group}>
                      <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-1">{group.group.toUpperCase()}</div>
                      {group.rows.map(row => {
                        const has = ALL_PERMISSIONS[key]?.includes(row.perm)
                        return (
                          <div key={row.perm} className="flex items-center gap-1.5 mb-0.5">
                            <span className={`text-[10px] ${has ? 'text-green-400' : 'text-gray-700'}`}>
                              {has ? '✓' : '✗'}
                            </span>
                            <span className={`text-[9px] font-mono ${has ? 'text-gray-400' : 'text-gray-700'}`}>
                              {row.label}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── USERS SECTION ── */}
      {section === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="text-[10px] font-mono text-blue-400 border border-blue-800 px-3 py-1.5 rounded hover:bg-blue-950 transition-colors"
            >
              + ADD USER
            </button>
          </div>

          {/* Create user form */}
          {showCreate && (
            <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-4 space-y-3">
              <div className="text-[10px] font-mono text-gray-400 tracking-widest">NEW USER</div>
              {error && (
                <div className="text-[10px] font-mono text-red-400 bg-red-950 border border-red-800 rounded px-3 py-2">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'name',     label: 'Full Name',    type: 'text'     },
                  { key: 'email',    label: 'Email',        type: 'email'    },
                  { key: 'password', label: 'Password',     type: 'password' },
                  { key: 'projectId',label: 'Project ID',   type: 'text'     },
                ].map(f => (
                  <div key={f.key}>
                    <div className="text-[9px] font-mono text-gray-600 mb-1">{f.label.toUpperCase()}</div>
                    <input
                      type={f.type}
                      value={(form as any)[f.key]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-[10px] font-mono text-gray-300 outline-none focus:border-blue-700"
                    />
                  </div>
                ))}
              </div>
              <div>
                <div className="text-[9px] font-mono text-gray-600 mb-1">ROLE</div>
                <select
                  value={form.role}
                  onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                  className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-[10px] font-mono text-gray-300 outline-none"
                >
                  {Object.entries(ROLES).filter(([k]) => k !== 'super_admin').map(([k, v]) => (
                    <option key={k} value={k}>{v.label} — {v.desc}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={createUser} className="text-[10px] font-mono bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded transition-colors">
                  CREATE
                </button>
                <button onClick={() => { setShowCreate(false); setError('') }} className="text-[10px] font-mono text-gray-500 border border-[#2a2a2a] px-4 py-1.5 rounded hover:text-gray-300 transition-colors">
                  CANCEL
                </button>
              </div>
            </div>
          )}

          {/* Users table */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-[#0d0d0d] border-b border-[#1e1e1e]">
                <tr>
                  {['NAME / EMAIL','ROLE','PROJECT','LAST LOGIN','STATUS','ACTIONS'].map(h => (
                    <th key={h} className="text-left p-3 font-mono text-[9px] text-gray-500 tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a]">
                {loading ? (
                  <tr><td colSpan={6} className="p-6 text-center text-[10px] font-mono text-gray-600">LOADING...</td></tr>
                ) : users.map(user => {
                  const roleInfo = ROLES[user.role] || ROLES.viewer
                  return (
                    <tr key={user.id} className={`hover:bg-[#0d0d0d] ${!user.is_active ? 'opacity-40' : ''}`}>
                      <td className="p-3">
                        <div className="font-mono text-white text-[10px]">{user.name}</div>
                        <div className="font-mono text-gray-500 text-[9px]">{user.email}</div>
                      </td>
                      <td className="p-3">
                        <select
                          value={user.role}
                          onChange={e => changeRole(user, e.target.value)}
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded border bg-transparent cursor-pointer ${roleInfo.color}`}
                        >
                          {Object.entries(ROLES).map(([k, v]) => (
                            <option key={k} value={k} className="bg-[#111] text-white">{v.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3 font-mono text-[10px] text-gray-500">
                        {user.project_id || <span className="text-gray-700">all</span>}
                      </td>
                      <td className="p-3 font-mono text-[10px] text-gray-500">
                        {user.last_login
                          ? new Date(user.last_login).toLocaleDateString()
                          : <span className="text-gray-700">never</span>}
                      </td>
                      <td className="p-3">
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                          user.is_active ? 'bg-green-950 text-green-400' : 'bg-gray-900 text-gray-600'
                        }`}>
                          {user.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => toggleActive(user)}
                          className="text-[9px] font-mono text-gray-500 hover:text-gray-300 border border-[#2a2a2a] px-2 py-0.5 rounded transition-colors"
                        >
                          {user.is_active ? 'DEACTIVATE' : 'ACTIVATE'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── AUDIT LOG SECTION ── */}
      {section === 'audit' && (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1e1e1e] text-[10px] font-mono text-gray-400 tracking-widest">
            AUDIT LOG — last 100 actions
          </div>
          <div className="max-h-[600px] overflow-y-auto divide-y divide-[#1a1a1a]">
            {loading ? (
              <div className="p-6 text-center text-[10px] font-mono text-gray-600">LOADING...</div>
            ) : audit.length === 0 ? (
              <div className="p-6 text-center text-[10px] font-mono text-gray-600">NO AUDIT ENTRIES YET</div>
            ) : audit.map(entry => (
              <div key={entry.id} className="flex items-start justify-between px-4 py-2.5 hover:bg-[#0d0d0d]">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    entry.action.includes('delete') || entry.action.includes('deactivate') ? 'bg-red-400' :
                    entry.action.includes('create') || entry.action.includes('login')      ? 'bg-green-400' :
                    entry.action.includes('update') || entry.action.includes('reset')      ? 'bg-yellow-400' :
                    'bg-gray-600'
                  }`} />
                  <div>
                    <div className="text-[10px] font-mono text-white">
                      <span className="text-gray-400">{entry.user_email}</span>
                      {' → '}
                      <span className="text-blue-400">{entry.action}</span>
                      {entry.resource && <span className="text-gray-500"> on {entry.resource}</span>}
                    </div>
                    {entry.detail && (
                      <div className="text-[9px] font-mono text-gray-600 mt-0.5">{entry.detail}</div>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <div className="text-[9px] font-mono text-gray-600">
                    {new Date(entry.timestamp).toLocaleString()}
                  </div>
                  {entry.ip && (
                    <div className="text-[9px] font-mono text-gray-700">{entry.ip}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
