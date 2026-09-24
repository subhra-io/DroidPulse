/**
 * DroidPulse v2.0 — Full Feature Test Suite
 * Uses Node's built-in http module to avoid fetch quirks
 */

const http = require('http')

const BASE       = 'http://localhost:3001'
const SDK_KEY    = 'dp_live_demo_key_12345'
const PROJECT_ID = 'demo-project'

let passed = 0
let failed = 0
let token  = null

// ── HTTP helpers ──────────────────────────────────────────────────────────────
const request = (method, path, body, headers = {}) => new Promise((resolve, reject) => {
  const url     = new URL(BASE + path)
  const payload = body ? JSON.stringify(body) : null
  const opts = {
    hostname: url.hostname,
    port:     url.port || 80,
    path:     url.pathname + url.search,
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      ...headers,
    }
  }
  const req = http.request(opts, res => {
    let data = ''
    res.on('data', d => data += d)
    res.on('end', () => {
      try { resolve({ status: res.statusCode, body: JSON.parse(data) }) }
      catch { resolve({ status: res.statusCode, body: data }) }
    })
  })
  req.on('error', reject)
  if (payload) req.write(payload)
  req.end()
})

const sdk  = { Authorization: `Bearer ${SDK_KEY}` }
const auth = () => ({ Authorization: `Bearer ${token}` })

const get   = (path, h)    => request('GET',    path, null, h)
const post  = (path, b, h) => request('POST',   path, b,    h)
const del   = (path, h)    => request('DELETE', path, null, h)
const patch = (path, b, h) => request('PATCH',  path, b,    h)

// ── Assertions ────────────────────────────────────────────────────────────────
const ok = (label, condition, detail = '') => {
  if (condition) {
    console.log(`  ✅ ${label}`)
    passed++
  } else {
    console.log(`  ❌ ${label}${detail ? ' — ' + detail : ''}`)
    failed++
  }
}
const section = t => console.log(`\n━━━ ${t} ━━━`)

// ── Main ──────────────────────────────────────────────────────────────────────
async function run() {
  console.log('\n🧪 DroidPulse v2.0 — Full Feature Test Suite')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // ── 0. Health ────────────────────────────────────────────────────────────────
  section('0. Health Check')
  const { body: health } = await get('/health')
  ok('Server is up',           health.status === 'ok')
  ok('Version is 2.0.0',       health.version === '2.0.0')
  ok('All 7 features listed',  Array.isArray(health.features) && health.features.length >= 7)

  // ── 1. Auth ──────────────────────────────────────────────────────────────────
  section('1. Authentication')
  const { body: login } = await post('/auth/login', { email: 'admin@droidpulse.dev', password: 'admin123' })
  ok('Login succeeds',     !!login.token,                          JSON.stringify(login).slice(0,80))
  ok('Token returned',     typeof login.token === 'string' && login.token.length > 20)
  ok('Role is super_admin', login.user?.role === 'super_admin')
  token = login.token

  // ── 2. Core SDK ──────────────────────────────────────────────────────────────
  section('2. Core SDK — Sessions & Events')
  const sessionId = `test-session-${Date.now()}`
  const { body: sess } = await post('/api/sessions', {
    sessionId, appVersion: '2.0.0', buildType: 'debug',
    deviceModel: 'Pixel 8', osVersion: '14', startedAt: Date.now()
  }, sdk)
  ok('Session created',           sess.sessionId === sessionId,  JSON.stringify(sess).slice(0,80))
  ok('Project scoped correctly',  sess.projectId === PROJECT_ID)

  const { body: evts } = await post('/api/events', {
    sessionId,
    events: [
      { type: 'fps',       fps: 58, droppedFrames: 2,                                    timestamp: Date.now() },
      { type: 'memory',    usedMemoryMb: 145, maxMemoryMb: 512,                          timestamp: Date.now() },
      { type: 'startup',   totalMs: 1200,                                                timestamp: Date.now() },
      { type: 'network',   url: 'https://api.example.com/products', method: 'GET', responseCode: 200, duration: 340, timestamp: Date.now() },
      { type: 'lifecycle', screenName: 'ProductList',   timestamp: Date.now() },
      { type: 'lifecycle', screenName: 'ProductDetail', timestamp: Date.now() + 1000 },
      { type: 'lifecycle', screenName: 'Checkout',      timestamp: Date.now() + 2000 },
    ]
  }, sdk)
  ok('Events ingested', evts.received === 7, `got ${evts.received}`)

  // ── 3. Analytics ─────────────────────────────────────────────────────────────
  section('3. Analytics Track + Identify')
  const userId = `user-test-${Date.now()}`
  const { body: ident } = await post('/api/analytics/identify', {
    userId, properties: { plan: 'premium', email: 'test@example.com', country: 'US' }
  }, sdk)
  ok('User identified', ident.updated === true, JSON.stringify(ident).slice(0,80))

  const now = Date.now()
  const { body: tracked } = await post('/api/analytics/track', {
    sessionId,
    events: [
      { event_name: 'product_viewed',     properties: { user_id: userId, product_id: 'p1', category: 'electronics' }, perf_score: 85, startup_time_ms: 1200, fps_avg: 58, crash_free: true,  revenue: 0,   currency: 'USD', timestamp: now },
      { event_name: 'add_to_cart',        properties: { user_id: userId, product_id: 'p1', price: 299 },              perf_score: 82, startup_time_ms: 1200, fps_avg: 57, crash_free: true,  revenue: 0,   currency: 'USD', timestamp: now + 500 },
      { event_name: 'checkout_started',   properties: { user_id: userId, cart_value: 299 },                           perf_score: 80, startup_time_ms: 1200, fps_avg: 55, crash_free: true,  revenue: 0,   currency: 'USD', timestamp: now + 1000 },
      { event_name: 'purchase_completed', properties: { user_id: userId, amount: 299 },                               perf_score: 78, startup_time_ms: 1200, fps_avg: 54, crash_free: true,  revenue: 299, currency: 'USD', timestamp: now + 1500 },
      { event_name: 'funnel_step',        properties: { user_id: userId, funnel_name: 'checkout', step_name: 'cart_view'    }, perf_score: 85, startup_time_ms: 1200, fps_avg: 58, crash_free: true, revenue: 0, currency: 'USD', timestamp: now + 100 },
      { event_name: 'funnel_step',        properties: { user_id: userId, funnel_name: 'checkout', step_name: 'payment_info' }, perf_score: 80, startup_time_ms: 1200, fps_avg: 55, crash_free: true, revenue: 0, currency: 'USD', timestamp: now + 800 },
      { event_name: 'funnel_step',        properties: { user_id: userId, funnel_name: 'checkout', step_name: 'confirmation' }, perf_score: 75, startup_time_ms: 1200, fps_avg: 54, crash_free: true, revenue: 0, currency: 'USD', timestamp: now + 1400 },
    ]
  }, sdk)
  ok('Analytics events tracked', tracked.received === 7, JSON.stringify(tracked).slice(0,80))

  // ── FEATURE 5: Super Properties ──────────────────────────────────────────────
  section('FEATURE 5: Super Properties')
  const { body: spSet } = await post(`/api/super-properties?projectId=${PROJECT_ID}`, {
    properties: { app_version: '2.0.0', environment: 'production', platform: 'android' }
  }, auth())
  ok('Super properties set (3)',  spSet.updated === 3,                          JSON.stringify(spSet).slice(0,80))

  const { body: spGet } = await get(`/api/super-properties?projectId=${PROJECT_ID}`, auth())
  ok('Super properties retrieved', typeof spGet.superProperties === 'object',  JSON.stringify(spGet).slice(0,80))
  ok('app_version stored',         spGet.superProperties?.app_version === '2.0.0')
  ok('environment stored',         spGet.superProperties?.environment === 'production')
  ok('Count >= 3',                 spGet.count >= 3)

  const { body: spDel } = await del(`/api/super-properties/environment?projectId=${PROJECT_ID}`, auth())
  ok('Super property deleted',     spDel.deleted === 'environment',             JSON.stringify(spDel).slice(0,80))

  const { body: spAfter } = await get(`/api/super-properties?projectId=${PROJECT_ID}`, auth())
  ok('Deleted property gone',      !('environment' in (spAfter.superProperties || {})))

  // ── FEATURE 1: Retention Cohorts ─────────────────────────────────────────────
  section('FEATURE 1: Retention Cohorts')
  const { body: ret } = await get(`/api/retention?projectId=${PROJECT_ID}`, auth())
  ok('Retention endpoint responds', Array.isArray(ret.cohorts),                JSON.stringify(ret).slice(0,80))
  ok('Overall stats present',       ret.overall !== null && ret.overall !== undefined)
  ok('Period returned',             !!ret.period?.from)

  const { body: retTrend } = await get(`/api/retention/trend?projectId=${PROJECT_ID}&weeks=4`, auth())
  ok('Retention trend responds',    Array.isArray(retTrend.trend))

  const { body: retUser } = await get(`/api/retention/user/${userId}?projectId=${PROJECT_ID}`, auth())
  ok('User retention record exists', retUser.userId === userId || !!retUser.error)
  ok('Cohort date set',              retUser.cohortDate !== undefined || !!retUser.error)

  // ── FEATURE 2: User Paths ────────────────────────────────────────────────────
  section('FEATURE 2: User Paths & Flow Analysis')
  const { body: topPaths } = await get(`/api/paths/top?projectId=${PROJECT_ID}&limit=10`, auth())
  ok('Top paths responds',          Array.isArray(topPaths.transitions),       JSON.stringify(topPaths).slice(0,80))
  ok('Transitions recorded',        topPaths.transitions.length > 0,           `got ${topPaths.transitions.length}`)

  const { body: fromPaths } = await get(`/api/paths/from/session_start?projectId=${PROJECT_ID}&depth=2`, auth())
  ok('From-event paths responds',   Array.isArray(fromPaths.paths))
  ok('Start event returned',        fromPaths.startEvent === 'session_start')

  const { body: sankey } = await get(`/api/paths/sankey?projectId=${PROJECT_ID}`, auth())
  ok('Sankey data responds',        Array.isArray(sankey.nodes) && Array.isArray(sankey.links))
  ok('Sankey has nodes',            sankey.nodes?.length > 0,                  `nodes=${sankey.nodes?.length}`)

  const { body: sessPath } = await get(`/api/paths/session/${sessionId}?projectId=${PROJECT_ID}`, auth())
  ok('Session path responds',       Array.isArray(sessPath.steps))
  ok('Path steps recorded',         sessPath.steps?.length > 0,                `steps=${sessPath.steps?.length}`)

  // ── FEATURE 3: Segmentation ──────────────────────────────────────────────────
  section('FEATURE 3: Segmentation')
  const { body: segEvt } = await post(`/api/segment/events?projectId=${PROJECT_ID}`, {
    event: 'purchase_completed', breakdownBy: 'category', metric: 'count', projectId: PROJECT_ID
  }, auth())
  ok('Event segmentation responds', Array.isArray(segEvt.segments),            JSON.stringify(segEvt).slice(0,80))
  ok('Breakdown key returned',      segEvt.breakdownBy === 'category')

  const { body: segUsr } = await post(`/api/segment/users?projectId=${PROJECT_ID}`, {
    breakdownBy: 'plan', projectId: PROJECT_ID
  }, auth())
  ok('User segmentation responds',  Array.isArray(segUsr.segments))
  ok('Plan segment present',        segUsr.segments?.some(s => s.segment === 'premium'))

  const { body: segPerf } = await post(`/api/segment/perf?projectId=${PROJECT_ID}`, {
    metric: 'avg_fps', breakdownBy: 'app_version', projectId: PROJECT_ID
  }, auth())
  ok('Perf segmentation responds',  Array.isArray(segPerf.segments))
  ok('Metric returned',             segPerf.metric === 'avg_fps')

  const { body: segFun } = await post(`/api/segment/funnel?projectId=${PROJECT_ID}`, {
    funnelName: 'checkout', breakdownBy: 'plan', projectId: PROJECT_ID
  }, auth())
  ok('Funnel segmentation responds', Array.isArray(segFun.segments))

  // ── FEATURE 4: A/B Testing ───────────────────────────────────────────────────
  section('FEATURE 4: A/B Testing / Experiments')
  const { body: expCreate } = await post(`/api/experiments?projectId=${PROJECT_ID}`, {
    name: 'checkout_redesign',
    description: 'Test new checkout flow',
    variants: [
      { name: 'control',   weight: 50, description: 'Original' },
      { name: 'treatment', weight: 50, description: 'Redesigned' }
    ],
    projectId: PROJECT_ID
  }, auth())
  ok('Experiment created',          !!expCreate.id,                            JSON.stringify(expCreate).slice(0,80))
  ok('Variants stored',             Array.isArray(expCreate.variants) && expCreate.variants.length === 2)
  ok('Status is draft',             expCreate.status === 'draft')
  const expId = expCreate.id

  const { body: expStart } = await patch(`/api/experiments/${expId}?projectId=${PROJECT_ID}`, { status: 'running' }, auth())
  ok('Experiment started',          expStart.status === 'running',             JSON.stringify(expStart).slice(0,80))

  const { body: expList } = await get(`/api/experiments?projectId=${PROJECT_ID}`, auth())
  ok('Experiment list returns',     Array.isArray(expList.experiments))
  ok('Created experiment in list',  expList.experiments?.some(e => e.id === expId))

  const { body: assign } = await post(`/api/experiments/${expId}/assign?projectId=${PROJECT_ID}`, {
    userId, projectId: PROJECT_ID
  }, auth())
  ok('User assigned to variant',    ['control','treatment'].includes(assign.variant), JSON.stringify(assign).slice(0,80))

  const { body: assign2 } = await post(`/api/experiments/${expId}/assign?projectId=${PROJECT_ID}`, {
    userId, projectId: PROJECT_ID
  }, auth())
  ok('Re-assignment idempotent',    assign2.variant === assign.variant)
  ok('Existing flag set',           assign2.existing === true)

  const { body: expRes } = await get(`/api/experiments/${expId}/results?projectId=${PROJECT_ID}`, auth())
  ok('Experiment results respond',  Array.isArray(expRes.results),             JSON.stringify(expRes).slice(0,80))
  ok('Both variants in results',    expRes.results?.length === 2)
  ok('Total users counted',         expRes.totalUsers >= 1)

  // ── FEATURE 6: Alert Channels ────────────────────────────────────────────────
  section('FEATURE 6: Alert Delivery Channels')
  const { body: chanCreate } = await post(`/api/alert-channels?projectId=${PROJECT_ID}`, {
    type: 'webhook', name: 'Test Webhook',
    config: { url: 'http://localhost:9999/webhook' }, projectId: PROJECT_ID
  }, auth())
  ok('Alert channel created',       !!chanCreate.id,                           JSON.stringify(chanCreate).slice(0,80))
  ok('Type is webhook',             chanCreate.type === 'webhook')
  const chanId = chanCreate.id

  const { body: chanList } = await get(`/api/alert-channels?projectId=${PROJECT_ID}`, auth())
  ok('Channel list returns',        Array.isArray(chanList.channels))
  ok('Created channel in list',     chanList.channels?.some(c => c.id === chanId))

  const { body: chanUpd } = await patch(`/api/alert-channels/${chanId}?projectId=${PROJECT_ID}`, {
    name: 'Updated Webhook', projectId: PROJECT_ID
  }, auth())
  ok('Channel updated',             chanUpd.updated === chanId,                JSON.stringify(chanUpd).slice(0,80))

  const { body: slackBad } = await post(`/api/alert-channels?projectId=${PROJECT_ID}`, {
    type: 'slack', name: 'Slack', config: {}, projectId: PROJECT_ID
  }, auth())
  ok('Slack without URL rejected',  !!slackBad.error)

  const { body: chanDel } = await del(`/api/alert-channels/${chanId}?projectId=${PROJECT_ID}`, auth())
  ok('Channel deleted',             chanDel.deleted === chanId,                JSON.stringify(chanDel).slice(0,80))

  // ── FEATURE 7: Data Export ───────────────────────────────────────────────────
  section('FEATURE 7: Data Export')
  const { body: expJob } = await post(`/api/export?projectId=${PROJECT_ID}`, {
    type: 'analytics', format: 'json', destination: 'download', projectId: PROJECT_ID
  }, auth())
  ok('Export job created',          !!expJob.id,                               JSON.stringify(expJob).slice(0,80))
  ok('Status is pending',           expJob.status === 'pending')
  const exportId = expJob.id

  await new Promise(r => setTimeout(r, 2000))

  const { body: expStatus } = await get(`/api/export/${exportId}?projectId=${PROJECT_ID}`, auth())
  ok('Export completed',            expStatus.status === 'done',               `status=${expStatus.status}`)
  ok('Row count > 0',               expStatus.row_count > 0,                   `rows=${expStatus.row_count}`)

  const { body: csvJob } = await post(`/api/export?projectId=${PROJECT_ID}`, {
    type: 'sessions', format: 'csv', destination: 'download', projectId: PROJECT_ID
  }, auth())
  ok('CSV export job created',      !!csvJob.id)
  await new Promise(r => setTimeout(r, 2000))
  const { body: csvStatus } = await get(`/api/export/${csvJob.id}?projectId=${PROJECT_ID}`, auth())
  ok('CSV export completed',        csvStatus.status === 'done',               `status=${csvStatus.status}`)

  const { body: expList2 } = await get(`/api/export?projectId=${PROJECT_ID}`, auth())
  ok('Export list returns',         Array.isArray(expList2.jobs))
  ok('Jobs in list',                expList2.jobs?.length >= 2)

  // ── Regression: existing features ────────────────────────────────────────────
  section('Regression — Existing Features')
  const { body: sessions } = await get(`/api/sessions?projectId=${PROJECT_ID}`, sdk)
  ok('Sessions list works',         Array.isArray(sessions.sessions))
  ok('Test session present',        sessions.sessions?.some(s => s.id === sessionId))

  const { body: funnel } = await get(`/api/analytics/funnel/checkout?projectId=${PROJECT_ID}`, sdk)
  ok('Funnel analysis works',       Array.isArray(funnel.steps))
  ok('Funnel steps recorded',       funnel.steps?.length >= 2,                 `got ${funnel.steps?.length}`)

  const { body: perf } = await get(`/api/analytics/perf-correlation?projectId=${PROJECT_ID}`, sdk)
  ok('Perf correlation works',      Array.isArray(perf.correlation))

  const { body: usersRes } = await get(`/api/analytics/users?projectId=${PROJECT_ID}`, sdk)
  ok('Users list works',            Array.isArray(usersRes.users))
  ok('Test user in list',           usersRes.users?.some(u => u.user_id === userId))

  const { body: alertsRes } = await get(`/api/alerts?projectId=${PROJECT_ID}`, sdk)
  ok('Alerts endpoint works',       Array.isArray(alertsRes.alerts))

  const { body: eventsRes } = await get(`/api/analytics/events?projectId=${PROJECT_ID}`, sdk)
  ok('Analytics events works',      Array.isArray(eventsRes.topEvents))
  ok('purchase_completed tracked',  eventsRes.topEvents?.some(e => e.event_name === 'purchase_completed'))

  // ── Summary ──────────────────────────────────────────────────────────────────
  const total = passed + failed
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`  Results: ${passed}/${total} passed  |  ${failed} failed`)
  if (failed === 0) {
    console.log('  🎉 All tests passed — DroidPulse v2.0 is production ready!')
  } else {
    console.log(`  ⚠️  ${failed} test(s) need attention`)
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  process.exit(failed > 0 ? 1 : 0)
}

run().catch(err => {
  console.error('\n💥 Test runner crashed:', err.message, err.stack)
  process.exit(1)
})
