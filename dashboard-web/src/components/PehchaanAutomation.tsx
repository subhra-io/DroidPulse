'use client'
import { useState, useEffect, useCallback } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
const PROJECT = 'demo-project'

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('dp_token') || '' : ''}`,
  }
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, sub, children, accent = 'blue' }: {
  title: string; sub?: string; children: React.ReactNode; accent?: string
}) {
  const border = accent === 'red' ? 'border-red-900' : accent === 'green' ? 'border-green-900' : 'border-[#1e1e1e]'
  return (
    <div className={`bg-[#111] border ${border} rounded-lg overflow-hidden`}>
      <div className="px-5 py-3 border-b border-[#1e1e1e]">
        <div className="text-[10px] font-mono font-bold text-white tracking-widest">{title}</div>
        {sub && <div className="text-[9px] font-mono text-gray-600 mt-0.5">{sub}</div>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ── Pill badge ────────────────────────────────────────────────────────────────
function Pill({ label, color }: { label: string; color: string }) {
  const cls: Record<string, string> = {
    green:  'bg-green-950 text-green-400 border-green-900',
    red:    'bg-red-950 text-red-400 border-red-900',
    yellow: 'bg-yellow-950 text-yellow-400 border-yellow-900',
    blue:   'bg-blue-950 text-blue-400 border-blue-900',
    gray:   'bg-[#1a1a1a] text-gray-500 border-[#2a2a2a]',
  }
  return (
    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${cls[color] || cls.gray}`}>
      {label}
    </span>
  )
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function useToast() {
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const toast = (text: string, ok = true) => {
    setMsg({ text, ok })
    setTimeout(() => setMsg(null), 3000)
  }
  return { msg, toast }
}

// ── 1. EXPERIMENT CONTROL PANEL ───────────────────────────────────────────────
function ExperimentControl() {
  const [exps, setExps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const { msg, toast } = useToast()
  const [form, setForm] = useState({
    name: '', description: '',
    variants: [{ name: 'control', weight: 50 }, { name: 'treatment', weight: 50 }]
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/experiments?projectId=${PROJECT}`, { headers: authHeaders() })
      const d = await r.json()
      setExps(d.experiments || [])
    } catch { toast('Failed to load experiments', false) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const setStatus = async (id: string, status: string) => {
    await fetch(`${API}/api/experiments/${id}?projectId=${PROJECT}`, {
      method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ status })
    })
    toast(`Experiment ${status}`)
    load()
  }

  const create = async () => {
    const total = form.variants.reduce((s, v) => s + v.weight, 0)
    if (total !== 100) { toast('Weights must sum to 100', false); return }
    if (!form.name.trim()) { toast('Name required', false); return }
    const r = await fetch(`${API}/api/experiments?projectId=${PROJECT}`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ ...form, projectId: PROJECT })
    })
    if (r.ok) { toast('Experiment created'); setCreating(false); load() }
    else toast('Create failed', false)
  }

  const del = async (id: string) => {
    await fetch(`${API}/api/experiments/${id}?projectId=${PROJECT}`, {
      method: 'DELETE', headers: authHeaders()
    })
    toast('Deleted'); load()
  }

  const STATUS_COLOR: Record<string, string> = {
    running: 'green', draft: 'gray', paused: 'yellow', completed: 'blue'
  }

  // Pehchaan preset experiments
  const PRESETS = [
    { name: 'onboarding_flow', description: '4-slide pager vs single CTA — registration conversion', variants: [{ name: 'control', weight: 50 }, { name: 'treatment', weight: 50 }] },
    { name: 'face_auth_guidance', description: 'Static vs animated guidance — reduce face auth retries', variants: [{ name: 'control', weight: 50 }, { name: 'treatment', weight: 50 }] },
    { name: 'pin_vs_biometric_default', description: 'PIN-first vs biometric-first — login success rate', variants: [{ name: 'control', weight: 50 }, { name: 'treatment', weight: 50 }] },
    { name: 'payment_gateway_default', description: 'Razorpay vs PayU default — payment completion', variants: [{ name: 'control', weight: 50 }, { name: 'treatment', weight: 50 }] },
    { name: 'consent_ui_complexity', description: 'Full fields vs summary card — credential share rate', variants: [{ name: 'control', weight: 50 }, { name: 'treatment', weight: 50 }] },
    { name: 'aadhaar_input_hint', description: 'No hint vs profile hint — reduce input errors', variants: [{ name: 'control', weight: 50 }, { name: 'treatment', weight: 50 }] },
    { name: 'update_payment_cta', description: '"Pay Now" vs "Proceed to Payment" CTA copy', variants: [{ name: 'control', weight: 50 }, { name: 'treatment', weight: 50 }] },
    { name: 'qr_scan_entry_point', description: 'Toolbar icon vs FAB — QR scan discoverability', variants: [{ name: 'control', weight: 50 }, { name: 'treatment', weight: 50 }] },
  ]

  const applyPreset = (p: typeof PRESETS[0]) => {
    setForm({ name: p.name, description: p.description, variants: p.variants })
    setCreating(true)
  }

  return (
    <Section title="A/B EXPERIMENT CONTROL" sub="Create, start, pause, and complete experiments from here — app reads variants automatically">
      {msg && (
        <div className={`mb-4 px-3 py-2 rounded text-[10px] font-mono ${msg.ok ? 'bg-green-950 text-green-400' : 'bg-red-950 text-red-400'}`}>
          {msg.text}
        </div>
      )}

      {/* Pehchaan presets */}
      <div className="mb-5">
        <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-2">PEHCHAAN PRESETS — click to pre-fill</div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button key={p.name} onClick={() => applyPreset(p)}
              className="text-[9px] font-mono px-2.5 py-1 rounded border border-[#2a2a2a] text-gray-500 hover:text-blue-400 hover:border-blue-800 transition-colors">
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Create form */}
      {creating && (
        <div className="mb-5 p-4 border border-blue-900 rounded-lg bg-[#0d0d0d] space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[9px] font-mono text-gray-600 mb-1">NAME</div>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-[#111] border border-[#2a2a2a] rounded px-3 py-1.5 text-[10px] font-mono text-gray-300 outline-none focus:border-blue-800"
                placeholder="experiment_name" />
            </div>
            <div>
              <div className="text-[9px] font-mono text-gray-600 mb-1">DESCRIPTION</div>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full bg-[#111] border border-[#2a2a2a] rounded px-3 py-1.5 text-[10px] font-mono text-gray-300 outline-none focus:border-blue-800"
                placeholder="What are you testing?" />
            </div>
          </div>
          <div>
            <div className="text-[9px] font-mono text-gray-600 mb-1">VARIANTS (weights must sum to 100)</div>
            <div className="space-y-2">
              {form.variants.map((v, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={v.name} onChange={e => setForm(f => { const vs = [...f.variants]; vs[i] = { ...vs[i], name: e.target.value }; return { ...f, variants: vs } })}
                    className="flex-1 bg-[#111] border border-[#2a2a2a] rounded px-3 py-1.5 text-[10px] font-mono text-gray-300 outline-none" placeholder="variant name" />
                  <input type="number" value={v.weight} min={1} max={99} onChange={e => setForm(f => { const vs = [...f.variants]; vs[i] = { ...vs[i], weight: Number(e.target.value) }; return { ...f, variants: vs } })}
                    className="w-16 bg-[#111] border border-[#2a2a2a] rounded px-2 py-1.5 text-[10px] font-mono text-gray-300 outline-none text-center" />
                  <span className="text-[9px] font-mono text-gray-600">%</span>
                  {form.variants.length > 2 && <button onClick={() => setForm(f => ({ ...f, variants: f.variants.filter((_, j) => j !== i) }))} className="text-gray-700 hover:text-red-400 text-xs">✕</button>}
                </div>
              ))}
            </div>
            <button onClick={() => setForm(f => ({ ...f, variants: [...f.variants, { name: '', weight: 0 }] }))}
              className="mt-2 text-[9px] font-mono text-blue-400 hover:text-blue-300">+ ADD VARIANT</button>
          </div>
          <div className="flex gap-2">
            <button onClick={create} className="px-4 py-1.5 text-[10px] font-mono font-bold text-blue-400 border border-blue-800 rounded hover:bg-blue-950 transition-colors">CREATE</button>
            <button onClick={() => setCreating(false)} className="px-4 py-1.5 text-[10px] font-mono text-gray-500 border border-[#2a2a2a] rounded hover:text-gray-300 transition-colors">CANCEL</button>
          </div>
        </div>
      )}
      {!creating && (
        <button onClick={() => setCreating(true)} className="mb-4 px-4 py-1.5 text-[10px] font-mono font-bold text-blue-400 border border-blue-800 rounded hover:bg-blue-950 transition-colors">
          + NEW EXPERIMENT
        </button>
      )}

      {/* Experiment list */}
      {loading ? <div className="text-[10px] font-mono text-gray-700">LOADING...</div> : (
        <div className="space-y-2">
          {exps.length === 0 && <div className="text-[10px] font-mono text-gray-700">No experiments yet — use a preset above</div>}
          {exps.map(exp => (
            <div key={exp.id} className="border border-[#1e1e1e] rounded-lg p-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <Pill label={exp.status.toUpperCase()} color={STATUS_COLOR[exp.status] || 'gray'} />
                  <span className="text-[10px] font-mono text-white truncate">{exp.name}</span>
                </div>
                {exp.description && <div className="text-[9px] font-mono text-gray-600 truncate">{exp.description}</div>}
                <div className="flex gap-1 mt-1 flex-wrap">
                  {(exp.variants || []).map((v: any) => (
                    <span key={v.name} className="text-[9px] font-mono text-gray-700 bg-[#0d0d0d] border border-[#1e1e1e] px-1.5 py-0.5 rounded">
                      {v.name} {v.weight}%
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {exp.status === 'draft'     && <button onClick={() => setStatus(exp.id, 'running')}   className="px-2 py-1 text-[9px] font-mono font-bold text-green-400 border border-green-900 rounded hover:bg-green-950 transition-colors">▶ START</button>}
                {exp.status === 'running'   && <button onClick={() => setStatus(exp.id, 'paused')}    className="px-2 py-1 text-[9px] font-mono font-bold text-yellow-400 border border-yellow-900 rounded hover:bg-yellow-950 transition-colors">⏸ PAUSE</button>}
                {exp.status === 'paused'    && <button onClick={() => setStatus(exp.id, 'running')}   className="px-2 py-1 text-[9px] font-mono font-bold text-green-400 border border-green-900 rounded hover:bg-green-950 transition-colors">▶ RESUME</button>}
                {exp.status !== 'completed' && <button onClick={() => setStatus(exp.id, 'completed')} className="px-2 py-1 text-[9px] font-mono font-bold text-blue-400 border border-blue-900 rounded hover:bg-blue-950 transition-colors">✓ DONE</button>}
                <button onClick={() => del(exp.id)} className="px-2 py-1 text-[9px] font-mono text-gray-700 border border-[#2a2a2a] rounded hover:text-red-400 hover:border-red-900 transition-colors">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}

// ── 2. FRAUD RULE CONTROL ─────────────────────────────────────────────────────
function FraudControl() {
  const [overview, setOverview] = useState<any>(null)
  const [signals, setSignals]   = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const { msg, toast } = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ov, sig] = await Promise.all([
        fetch(`${API}/api/fraud/overview?projectId=${PROJECT}`, { headers: authHeaders() }).then(r => r.json()),
        fetch(`${API}/api/fraud/signals?projectId=${PROJECT}&limit=20`, { headers: authHeaders() }).then(r => r.json()),
      ])
      setOverview(ov)
      setSignals(sig.signals || [])
    } catch { toast('Failed to load fraud data', false) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const flagSession = async (sessionId: string, reason: string) => {
    await fetch(`${API}/api/fraud/flag`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ sessionId, reason, severity: 'HIGH', projectId: PROJECT })
    })
    toast('Session flagged as fraud')
    load()
  }

  const SIGNAL_LABEL: Record<string, string> = {
    HIGH_VELOCITY: 'Bot / High Velocity', MULTI_ACCOUNT: 'Multi-Account Device',
    CRASH_LOOP: 'Crash Loop', ACCOUNT_TAKEOVER: 'Account Takeover',
    EMULATOR: 'Emulator / Rooted', IMPOSSIBLE_SESSION: 'Impossible Session',
  }
  const SEV_COLOR: Record<string, string> = { CRITICAL: 'red', HIGH: 'red', MEDIUM: 'yellow', LOW: 'blue' }

  // Pehchaan-specific fraud rules explanation
  const RULES = [
    { signal: 'EMULATOR', trigger: 'SDK detects emulator/root/Xposed/Frida at app launch', action: 'Block Aadhaar auth, flag session', severity: 'CRITICAL' },
    { signal: 'ACCOUNT_TAKEOVER', trigger: 'identify() called 5+ times in one session', action: 'Invalidate session, require re-auth', severity: 'CRITICAL' },
    { signal: 'MULTI_ACCOUNT', trigger: '3+ different Aadhaar profiles on same device', action: 'Flag for manual review', severity: 'HIGH' },
    { signal: 'HIGH_VELOCITY', trigger: 'Session generates >500 events (bot scripting)', action: 'Rate limit, block registration', severity: 'CRITICAL' },
    { signal: 'CRASH_LOOP', trigger: '>10 crashes from same device in 30 days', action: 'Flag device, alert security team', severity: 'HIGH' },
    { signal: 'IMPOSSIBLE_SESSION', trigger: 'Session active >24 hours', action: 'Force logout, invalidate token', severity: 'HIGH' },
  ]

  return (
    <Section title="FRAUD DETECTION CONTROL" sub="Pehchaan-specific fraud rules — all auto-detected from SDK telemetry" accent="red">
      {msg && <div className={`mb-4 px-3 py-2 rounded text-[10px] font-mono ${msg.ok ? 'bg-green-950 text-green-400' : 'bg-red-950 text-red-400'}`}>{msg.text}</div>}

      {/* Risk score */}
      {overview && (
        <div className="grid grid-cols-4 gap-3 mb-5">
          <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-3">
            <div className="text-[9px] font-mono text-gray-600 mb-1">FRAUD RISK SCORE</div>
            <div className={`text-2xl font-black ${overview.riskScore >= 50 ? 'text-red-400' : overview.riskScore >= 20 ? 'text-yellow-400' : 'text-green-400'}`}>
              {overview.riskScore}/100
            </div>
          </div>
          {[
            { label: 'EMULATORS',    value: overview.signals?.emulators },
            { label: 'MULTI-ACCT',   value: overview.signals?.multiAccount },
            { label: 'ACCT TAKEOVER',value: overview.signals?.accountTakeover },
          ].map(m => (
            <div key={m.label} className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-3">
              <div className="text-[9px] font-mono text-gray-600 mb-1">{m.label}</div>
              <div className={`text-2xl font-black ${(m.value || 0) > 0 ? 'text-red-400' : 'text-green-400'}`}>{m.value ?? 0}</div>
            </div>
          ))}
        </div>
      )}

      {/* Fraud rules reference */}
      <div className="mb-5">
        <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-2">ACTIVE DETECTION RULES</div>
        <div className="space-y-1.5">
          {RULES.map(r => (
            <div key={r.signal} className="flex items-start gap-3 p-2.5 bg-[#0d0d0d] border border-[#1e1e1e] rounded">
              <Pill label={r.severity} color={SEV_COLOR[r.severity] || 'gray'} />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-mono text-white">{SIGNAL_LABEL[r.signal] || r.signal}</div>
                <div className="text-[9px] font-mono text-gray-600 mt-0.5">Trigger: {r.trigger}</div>
                <div className="text-[9px] font-mono text-yellow-600 mt-0.5">Action: {r.action}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live signals */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[9px] font-mono text-gray-600 tracking-widest">LIVE SIGNALS ({signals.length})</div>
          <button onClick={load} className="text-[9px] font-mono text-gray-600 hover:text-gray-300 border border-[#2a2a2a] px-2 py-1 rounded transition-colors">
            {loading ? '...' : 'REFRESH'}
          </button>
        </div>
        {signals.length === 0 ? (
          <div className="text-[10px] font-mono text-gray-700 p-4 text-center border border-[#1e1e1e] rounded">
            {loading ? 'LOADING...' : 'No fraud signals detected — system clean ✓'}
          </div>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {signals.map((s, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 bg-[#0d0d0d] border border-[#1e1e1e] rounded gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Pill label={s.severity || 'HIGH'} color={SEV_COLOR[s.severity] || 'red'} />
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono text-white">{SIGNAL_LABEL[s.signal_type] || s.signal_type}</div>
                    <div className="text-[9px] font-mono text-gray-600 truncate">
                      {s.device_model && `Device: ${s.device_model}`}
                      {s.session_id && ` · Session: ${s.session_id?.slice(0, 8)}…`}
                      {s.event_count && ` · ${s.event_count} events`}
                    </div>
                  </div>
                </div>
                {s.session_id && (
                  <button onClick={() => flagSession(s.session_id, s.signal_type)}
                    className="flex-shrink-0 px-2 py-1 text-[9px] font-mono text-red-400 border border-red-900 rounded hover:bg-red-950 transition-colors">
                    FLAG
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Section>
  )
}

// ── 3. FUNNEL BUILDER ─────────────────────────────────────────────────────────
function FunnelBuilder() {
  const [funnelName, setFunnelName] = useState('')
  const [steps, setSteps] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const { msg, toast } = useToast()

  const PEHCHAAN_FUNNELS = [
    { name: 'registration', label: 'KYC Registration', steps: ['registration_started','aadhaar_input','sim_selected','sms_sent','face_auth_success','vc_downloaded','registration_complete'] },
    { name: 'app_unlock',   label: 'Daily App Unlock', steps: ['app_opened','biometric_success','login_success','home_screen'] },
    { name: 'consent_share',label: 'Consent & Share',  steps: ['consent_screen_viewed','share_initiated','credential_shared'] },
    { name: 'mobile_update',label: 'Mobile Update',    steps: ['update_screen_opened','srn_created','otp_verified','payment_initiated','payment_success','update_complete'] },
  ]

  const load = async (name: string) => {
    setFunnelName(name)
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/analytics/funnel/${encodeURIComponent(name)}?projectId=${PROJECT}`, { headers: authHeaders() })
      const d = await r.json()
      setSteps(d.steps || [])
    } catch { toast('Failed to load funnel', false) }
    setLoading(false)
  }

  const maxUsers = steps.length > 0 ? Math.max(...steps.map(s => s.users), 1) : 1

  return (
    <Section title="FUNNEL ANALYSIS" sub="Pre-built Pehchaan funnels — click to load live data">
      {msg && <div className={`mb-3 px-3 py-2 rounded text-[10px] font-mono ${msg.ok ? 'bg-green-950 text-green-400' : 'bg-red-950 text-red-400'}`}>{msg.text}</div>}

      <div className="flex flex-wrap gap-2 mb-4">
        {PEHCHAAN_FUNNELS.map(f => (
          <button key={f.name} onClick={() => load(f.name)}
            className={`px-3 py-1.5 text-[10px] font-mono font-bold rounded border transition-colors ${
              funnelName === f.name ? 'bg-[#1a2a3a] text-blue-400 border-blue-900' : 'text-gray-500 border-[#2a2a2a] hover:text-gray-300 hover:border-gray-600'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {funnelName && (
        <div className="mb-3 flex items-center gap-2">
          <input value={funnelName} onChange={e => setFunnelName(e.target.value)}
            className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-[10px] font-mono text-gray-300 outline-none focus:border-blue-800"
            placeholder="funnel_name" />
          <button onClick={() => load(funnelName)}
            className="px-3 py-1.5 text-[10px] font-mono font-bold text-blue-400 border border-blue-800 rounded hover:bg-blue-950 transition-colors">
            {loading ? '...' : 'LOAD'}
          </button>
        </div>
      )}

      {steps.length > 0 && (
        <div className="space-y-2">
          {steps.map((step, i) => {
            const pct = Math.round((step.users / maxUsers) * 100)
            return (
              <div key={i} className="flex items-center gap-3">
                <div className="w-36 text-[10px] font-mono text-gray-300 truncate flex-shrink-0">{step.step_name}</div>
                <div className="flex-1 h-6 bg-[#0d0d0d] border border-[#1e1e1e] rounded overflow-hidden relative">
                  <div className="h-full bg-blue-700 transition-all duration-500" style={{ width: `${pct}%` }} />
                  <span className="absolute inset-0 flex items-center px-2 text-[9px] font-mono text-white">{step.users} users</span>
                </div>
                <div className="w-16 text-right text-[10px] font-mono flex-shrink-0">
                  {i === 0 ? <span className="text-gray-600">—</span> : <span className="text-red-400">−{step.dropoff_pct}%</span>}
                </div>
                <div className="w-12 text-right text-[10px] font-mono flex-shrink-0">
                  <span className={step.avg_perf >= 70 ? 'text-green-400' : step.avg_perf >= 50 ? 'text-yellow-400' : 'text-red-400'}>
                    {Math.round(step.avg_perf || 0)}
                  </span>
                </div>
              </div>
            )
          })}
          <div className="flex items-center gap-3 text-[9px] font-mono text-gray-700 pt-1 border-t border-[#1e1e1e]">
            <div className="w-36" /><div className="flex-1">USERS</div>
            <div className="w-16 text-right">DROP-OFF</div>
            <div className="w-12 text-right">PERF</div>
          </div>
        </div>
      )}

      {!funnelName && (
        <div className="text-[10px] font-mono text-gray-700 text-center py-4">Select a funnel above to see live drop-off data</div>
      )}
    </Section>
  )
}

// ── 4. SUPER PROPERTIES MANAGER ───────────────────────────────────────────────
function SuperPropsManager() {
  const [props, setProps] = useState<any[]>([])
  const [key, setKey]     = useState('')
  const [val, setVal]     = useState('')
  const [loading, setLoading] = useState(true)
  const { msg, toast } = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/super-properties?projectId=${PROJECT}`, { headers: authHeaders() })
      const d = await r.json()
      setProps(d.properties || [])
    } catch { toast('Failed to load', false) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const set = async () => {
    if (!key.trim() || !val.trim()) { toast('Key and value required', false); return }
    await fetch(`${API}/api/super-properties?projectId=${PROJECT}`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ key, value: val, projectId: PROJECT })
    })
    toast(`Set ${key}`)
    setKey(''); setVal(''); load()
  }

  const del = async (k: string) => {
    await fetch(`${API}/api/super-properties/${encodeURIComponent(k)}?projectId=${PROJECT}`, {
      method: 'DELETE', headers: authHeaders()
    })
    toast(`Deleted ${k}`); load()
  }

  const PEHCHAAN_PROPS = [
    { key: 'app_name', value: 'Pehchaan' },
    { key: 'app_version', value: '1.3.4' },
    { key: 'environment', value: 'staging' },
    { key: 'feature_flag_new_consent_ui', value: 'true' },
    { key: 'feature_flag_animated_face_auth', value: 'false' },
  ]

  return (
    <Section title="SUPER PROPERTIES" sub="Auto-attached to every event from every device — use for feature flags and global context" accent="green">
      {msg && <div className={`mb-3 px-3 py-2 rounded text-[10px] font-mono ${msg.ok ? 'bg-green-950 text-green-400' : 'bg-red-950 text-red-400'}`}>{msg.text}</div>}

      <div className="mb-4">
        <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-2">PEHCHAAN QUICK-SET</div>
        <div className="flex flex-wrap gap-2">
          {PEHCHAAN_PROPS.map(p => (
            <button key={p.key} onClick={() => { setKey(p.key); setVal(p.value) }}
              className="text-[9px] font-mono px-2 py-1 rounded border border-[#2a2a2a] text-gray-500 hover:text-green-400 hover:border-green-900 transition-colors">
              {p.key}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <input value={key} onChange={e => setKey(e.target.value)} placeholder="property_key"
          className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-[10px] font-mono text-gray-300 outline-none focus:border-green-800" />
        <input value={val} onChange={e => setVal(e.target.value)} placeholder="value"
          className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-[10px] font-mono text-gray-300 outline-none focus:border-green-800" />
        <button onClick={set} className="px-3 py-1.5 text-[10px] font-mono font-bold text-green-400 border border-green-900 rounded hover:bg-green-950 transition-colors">SET</button>
      </div>

      {loading ? <div className="text-[10px] font-mono text-gray-700">LOADING...</div> : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {props.length === 0 && <div className="text-[10px] font-mono text-gray-700">No super properties set yet</div>}
          {props.map((p: any) => (
            <div key={p.key} className="flex items-center justify-between p-2 bg-[#0d0d0d] border border-[#1e1e1e] rounded">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-[10px] font-mono text-green-400 flex-shrink-0">{p.key}</span>
                <span className="text-[10px] font-mono text-gray-400 truncate">{p.value}</span>
              </div>
              <button onClick={() => del(p.key)} className="text-gray-700 hover:text-red-400 text-xs flex-shrink-0 ml-2">✕</button>
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}

// ── 5. SEGMENTATION QUICK-RUN ─────────────────────────────────────────────────
function SegmentQuickRun() {
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [active, setActive]   = useState('')
  const { msg, toast } = useToast()

  const QUERIES = [
    { id: 'events_by_version',  label: 'Events by App Version',    body: { mode: 'events', event: 'Button Clicked', breakdownBy: 'app_version', metric: 'count' } },
    { id: 'perf_by_device',     label: 'FPS by Device Model',      body: { mode: 'perf',   breakdownBy: 'device_model', metric: 'avg_fps' } },
    { id: 'events_by_flavor',   label: 'Events by Build Flavor',   body: { mode: 'events', event: 'App Opened', breakdownBy: 'flavor', metric: 'count' } },
    { id: 'startup_by_os',      label: 'Startup by Android OS',    body: { mode: 'perf',   breakdownBy: 'os_version', metric: 'avg_startup_ms' } },
    { id: 'face_auth_by_device',label: 'Face Auth by Device Tier', body: { mode: 'events', event: 'Face Verified', breakdownBy: 'device_performance_tier', metric: 'count' } },
    { id: 'payment_by_gateway', label: 'Payment by Gateway',       body: { mode: 'events', event: 'Payment Initiate Request Success', breakdownBy: 'flavor', metric: 'count' } },
    { id: 'reg_by_locale',      label: 'Registration by Locale',   body: { mode: 'events', event: 'Registration Completed', breakdownBy: 'locale', metric: 'count' } },
    { id: 'crash_by_version',   label: 'Crashes by Version',       body: { mode: 'perf',   breakdownBy: 'app_version', metric: 'avg_startup_ms' } },
  ]

  const run = async (q: typeof QUERIES[0]) => {
    setActive(q.id); setLoading(true)
    try {
      const endpoint = q.body.mode === 'perf' ? '/api/segment/perf' : '/api/segment/events'
      const r = await fetch(`${API}${endpoint}`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ ...q.body, projectId: PROJECT })
      })
      const d = await r.json()
      setResults(d.segments || [])
    } catch { toast('Query failed', false) }
    setLoading(false)
  }

  return (
    <Section title="SEGMENTATION QUICK-RUN" sub="One-click Pehchaan-specific breakdowns — no query builder needed">
      {msg && <div className={`mb-3 px-3 py-2 rounded text-[10px] font-mono ${msg.ok ? 'bg-green-950 text-green-400' : 'bg-red-950 text-red-400'}`}>{msg.text}</div>}

      <div className="grid grid-cols-2 gap-2 mb-4">
        {QUERIES.map(q => (
          <button key={q.id} onClick={() => run(q)}
            className={`px-3 py-2 text-[10px] font-mono text-left rounded border transition-colors ${
              active === q.id ? 'bg-[#1a2a3a] text-blue-400 border-blue-900' : 'text-gray-500 border-[#2a2a2a] hover:text-gray-300 hover:border-gray-600'
            }`}>
            {q.label}
          </button>
        ))}
      </div>

      {loading && <div className="text-[10px] font-mono text-gray-700">RUNNING...</div>}

      {results.length > 0 && !loading && (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {results.map((r, i) => {
            const max = Math.max(...results.map(x => x.value), 1)
            return (
              <div key={i} className="flex items-center gap-3">
                <div className="w-32 text-[10px] font-mono text-gray-300 truncate flex-shrink-0">{r.segment || '—'}</div>
                <div className="flex-1 h-4 bg-[#0d0d0d] border border-[#1e1e1e] rounded overflow-hidden">
                  <div className="h-full bg-blue-700" style={{ width: `${(r.value / max) * 100}%` }} />
                </div>
                <div className="w-16 text-right text-[10px] font-mono text-white flex-shrink-0">
                  {typeof r.value === 'number' ? r.value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : r.value}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {active && results.length === 0 && !loading && (
        <div className="text-[10px] font-mono text-gray-700 text-center py-3">No data yet — send events from the app first</div>
      )}
    </Section>
  )
}

// ── 6. ALERT CHANNEL SETUP ────────────────────────────────────────────────────
function AlertChannelSetup() {
  const [channels, setChannels] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [form, setForm] = useState({ type: 'slack', name: '', url: '' })
  const { msg, toast } = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/alert-channels?projectId=${PROJECT}`, { headers: authHeaders() })
      const d = await r.json()
      setChannels(d.channels || [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const create = async () => {
    if (!form.name || !form.url) { toast('Name and URL required', false); return }
    await fetch(`${API}/api/alert-channels?projectId=${PROJECT}`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ ...form, config: { url: form.url }, projectId: PROJECT })
    })
    toast('Channel created'); setForm({ type: 'slack', name: '', url: '' }); load()
  }

  const toggle = async (id: number, enabled: boolean) => {
    await fetch(`${API}/api/alert-channels/${id}?projectId=${PROJECT}`, {
      method: 'PATCH', headers: authHeaders(),
      body: JSON.stringify({ enabled: !enabled })
    })
    toast(enabled ? 'Channel disabled' : 'Channel enabled'); load()
  }

  return (
    <Section title="ALERT CHANNELS" sub="Get notified when fraud signals or regressions are detected">
      {msg && <div className={`mb-3 px-3 py-2 rounded text-[10px] font-mono ${msg.ok ? 'bg-green-950 text-green-400' : 'bg-red-950 text-red-400'}`}>{msg.text}</div>}

      <div className="flex gap-2 mb-4">
        <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
          className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-[10px] font-mono text-gray-300 outline-none">
          <option value="slack">Slack</option>
          <option value="webhook">Webhook</option>
          <option value="email">Email</option>
        </select>
        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Channel name"
          className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-[10px] font-mono text-gray-300 outline-none focus:border-blue-800" />
        <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="Webhook URL / email"
          className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-[10px] font-mono text-gray-300 outline-none focus:border-blue-800" />
        <button onClick={create} className="px-3 py-1.5 text-[10px] font-mono font-bold text-blue-400 border border-blue-800 rounded hover:bg-blue-950 transition-colors">ADD</button>
      </div>

      {loading ? <div className="text-[10px] font-mono text-gray-700">LOADING...</div> : (
        <div className="space-y-1.5">
          {channels.length === 0 && <div className="text-[10px] font-mono text-gray-700">No channels yet — add a Slack webhook to get fraud alerts</div>}
          {channels.map((c: any) => (
            <div key={c.id} className="flex items-center justify-between p-2.5 bg-[#0d0d0d] border border-[#1e1e1e] rounded">
              <div className="flex items-center gap-2">
                <Pill label={c.type.toUpperCase()} color="blue" />
                <span className="text-[10px] font-mono text-white">{c.name}</span>
              </div>
              <button onClick={() => toggle(c.id, c.enabled)}
                className={`px-2 py-1 text-[9px] font-mono rounded border transition-colors ${
                  c.enabled ? 'text-green-400 border-green-900 hover:bg-green-950' : 'text-gray-600 border-[#2a2a2a] hover:text-gray-300'
                }`}>
                {c.enabled ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}

// ── 7. DATA EXPORT ────────────────────────────────────────────────────────────
function DataExport() {
  const [loading, setLoading] = useState(false)
  const { msg, toast } = useToast()

  const exportData = async (type: string, format: string) => {
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/export/download?projectId=${PROJECT}&type=${type}&format=${format}`, {
        headers: authHeaders()
      })
      if (!r.ok) { toast('Export failed', false); setLoading(false); return }
      const blob = await r.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `pehchaan-${type}-${new Date().toISOString().split('T')[0]}.${format}`
      a.click()
      URL.revokeObjectURL(url)
      toast(`Exported ${type} as ${format.toUpperCase()}`)
    } catch { toast('Export failed', false) }
    setLoading(false)
  }

  const EXPORTS = [
    { type: 'sessions', label: 'All Sessions',       formats: ['json', 'csv'] },
    { type: 'events',   label: 'All Events',          formats: ['json', 'csv', 'ndjson'] },
    { type: 'users',    label: 'User Profiles',       formats: ['json', 'csv'] },
    { type: 'full',     label: 'Full Data Dump',      formats: ['json'] },
  ]

  return (
    <Section title="DATA EXPORT" sub="Download raw Pehchaan analytics data for offline analysis">
      {msg && <div className={`mb-3 px-3 py-2 rounded text-[10px] font-mono ${msg.ok ? 'bg-green-950 text-green-400' : 'bg-red-950 text-red-400'}`}>{msg.text}</div>}

      <div className="space-y-2">
        {EXPORTS.map(e => (
          <div key={e.type} className="flex items-center justify-between p-3 bg-[#0d0d0d] border border-[#1e1e1e] rounded">
            <span className="text-[10px] font-mono text-white">{e.label}</span>
            <div className="flex gap-1.5">
              {e.formats.map(fmt => (
                <button key={fmt} onClick={() => exportData(e.type, fmt)} disabled={loading}
                  className="px-2.5 py-1 text-[9px] font-mono font-bold text-gray-400 border border-[#2a2a2a] rounded hover:text-blue-400 hover:border-blue-800 disabled:opacity-40 transition-colors">
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}

// ── MAIN EXPORT ───────────────────────────────────────────────────────────────
type AutoTab = 'experiments' | 'fraud' | 'funnels' | 'segments' | 'superprops' | 'alerts' | 'export'

export default function PehchaanAutomation() {
  const [tab, setTab] = useState<AutoTab>('experiments')

  const TABS: { id: AutoTab; label: string; color?: string }[] = [
    { id: 'experiments', label: '🧪 A/B TESTS' },
    { id: 'fraud',       label: '🚨 FRAUD',    color: 'red' },
    { id: 'funnels',     label: '📊 FUNNELS' },
    { id: 'segments',    label: '🔍 SEGMENTS' },
    { id: 'superprops',  label: '🔑 SUPER PROPS', color: 'green' },
    { id: 'alerts',      label: '🔔 ALERTS' },
    { id: 'export',      label: '📦 EXPORT' },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <div className="text-sm font-mono font-bold text-white tracking-widest">PEHCHAAN AUTOMATION</div>
        <div className="text-[10px] font-mono text-gray-500 mt-0.5">
          Control experiments, fraud rules, funnels, and data — all from here, no code changes needed
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex flex-wrap gap-1">
        {TABS.map(t => {
          const active = tab === t.id
          const colorCls = t.color === 'red'
            ? active ? 'bg-[#2a1a1a] text-red-400 border-red-900' : 'text-gray-600 hover:text-red-400 border-transparent'
            : t.color === 'green'
            ? active ? 'bg-[#0f2a1a] text-green-400 border-green-900' : 'text-gray-600 hover:text-green-400 border-transparent'
            : active ? 'bg-[#1a2a3a] text-blue-400 border-blue-900' : 'text-gray-600 hover:text-gray-300 border-transparent'
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 text-[10px] font-mono font-bold tracking-widest rounded border transition-colors ${colorCls}`}>
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {tab === 'experiments' && <ExperimentControl />}
      {tab === 'fraud'       && <FraudControl />}
      {tab === 'funnels'     && <FunnelBuilder />}
      {tab === 'segments'    && <SegmentQuickRun />}
      {tab === 'superprops'  && <SuperPropsManager />}
      {tab === 'alerts'      && <AlertChannelSetup />}
      {tab === 'export'      && <DataExport />}
    </div>
  )
}
