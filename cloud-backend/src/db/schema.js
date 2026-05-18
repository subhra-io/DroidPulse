const initSchema = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      api_key    TEXT UNIQUE NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      email         TEXT UNIQUE NOT NULL,
      name          TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'viewer',
      project_id    TEXT,
      is_active     INTEGER DEFAULT 1,
      last_login    INTEGER,
      created_at    INTEGER DEFAULT (strftime('%s', 'now') * 1000),
      created_by    TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id           TEXT PRIMARY KEY,
      project_id   TEXT NOT NULL,
      app_version  TEXT,
      build_type   TEXT,
      device_model TEXT,
      os_version   TEXT,
      started_at   INTEGER,
      ended_at     INTEGER,
      event_count  INTEGER DEFAULT 0,
      crash_count  INTEGER DEFAULT 0,
      startup_ms   INTEGER
    );

    CREATE TABLE IF NOT EXISTS events (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      type       TEXT NOT NULL,
      data       TEXT NOT NULL,
      timestamp  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS version_metrics (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id     TEXT NOT NULL,
      app_version    TEXT NOT NULL,
      avg_fps        REAL,
      avg_startup_ms REAL,
      avg_memory_mb  REAL,
      avg_api_ms     REAL,
      crash_rate     REAL,
      session_count  INTEGER DEFAULT 0,
      computed_at    INTEGER DEFAULT (strftime('%s', 'now') * 1000),
      UNIQUE(project_id, app_version)
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id       TEXT NOT NULL,
      metric           TEXT NOT NULL,
      baseline_version TEXT NOT NULL,
      current_version  TEXT NOT NULL,
      baseline_value   REAL,
      current_value    REAL,
      change_percent   REAL,
      severity         TEXT,
      created_at       INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS analytics_events (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id      TEXT NOT NULL,
      project_id      TEXT NOT NULL,
      event_name      TEXT NOT NULL,
      user_id         TEXT,
      properties      TEXT,
      startup_time_ms INTEGER DEFAULT 0,
      memory_mb       REAL    DEFAULT 0,
      fps_avg         REAL    DEFAULT 0,
      perf_score      INTEGER DEFAULT 0,
      crash_free      INTEGER DEFAULT 1,
      revenue         REAL    DEFAULT 0,
      currency        TEXT    DEFAULT 'USD',
      timestamp       INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_profiles (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id      TEXT NOT NULL,
      user_id         TEXT NOT NULL,
      properties      TEXT,
      super_properties TEXT DEFAULT '{}',
      first_seen      INTEGER,
      last_seen       INTEGER,
      total_revenue   REAL DEFAULT 0,
      session_count   INTEGER DEFAULT 0,
      avg_perf_score  REAL DEFAULT 0,
      UNIQUE(project_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS funnel_events (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id  TEXT NOT NULL,
      project_id  TEXT NOT NULL,
      user_id     TEXT,
      funnel_name TEXT NOT NULL,
      step_name   TEXT NOT NULL,
      step_order  INTEGER DEFAULT 0,
      perf_score  INTEGER DEFAULT 0,
      step_duration_ms INTEGER DEFAULT 0,
      completed   INTEGER DEFAULT 0,
      timestamp   INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    TEXT,
      user_email TEXT,
      action     TEXT NOT NULL,
      resource   TEXT,
      detail     TEXT,
      ip         TEXT,
      timestamp  INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    );

    -- ── FEATURE 1: Super Properties ──────────────────────────────────────────
    -- Global properties auto-attached to every event per project
    CREATE TABLE IF NOT EXISTS super_properties (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL,
      key        TEXT NOT NULL,
      value      TEXT NOT NULL,
      updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
      UNIQUE(project_id, key)
    );

    -- ── FEATURE 2: Retention Cohorts ─────────────────────────────────────────
    -- Tracks first-seen date per user for Day 1/7/30 cohort analysis
    CREATE TABLE IF NOT EXISTS retention_cohorts (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id      TEXT NOT NULL,
      user_id         TEXT NOT NULL,
      cohort_date     TEXT NOT NULL,  -- YYYY-MM-DD of first seen
      day_1_returned  INTEGER DEFAULT 0,
      day_7_returned  INTEGER DEFAULT 0,
      day_14_returned INTEGER DEFAULT 0,
      day_30_returned INTEGER DEFAULT 0,
      last_seen_date  TEXT,
      UNIQUE(project_id, user_id)
    );

    -- ── FEATURE 3: User Path / Flow Analysis ─────────────────────────────────
    -- Stores ordered screen/event sequences per session for path aggregation
    CREATE TABLE IF NOT EXISTS user_paths (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      user_id    TEXT,
      step_order INTEGER NOT NULL,
      event_name TEXT NOT NULL,
      screen     TEXT,
      timestamp  INTEGER NOT NULL
    );

    -- Aggregated path transitions: A → B with count
    CREATE TABLE IF NOT EXISTS path_transitions (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id   TEXT NOT NULL,
      from_event   TEXT NOT NULL,
      to_event     TEXT NOT NULL,
      count        INTEGER DEFAULT 1,
      avg_duration_ms INTEGER DEFAULT 0,
      date         TEXT NOT NULL,  -- YYYY-MM-DD
      UNIQUE(project_id, from_event, to_event, date)
    );

    -- ── FEATURE 4: A/B Testing / Experiments ─────────────────────────────────
    CREATE TABLE IF NOT EXISTS experiments (
      id          TEXT PRIMARY KEY,
      project_id  TEXT NOT NULL,
      name        TEXT NOT NULL,
      description TEXT,
      status      TEXT DEFAULT 'draft',  -- draft/running/paused/completed
      variants    TEXT NOT NULL,         -- JSON array: [{name, weight, description}]
      start_date  INTEGER,
      end_date    INTEGER,
      created_by  TEXT,
      created_at  INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    );

    -- Which variant each user is assigned to
    CREATE TABLE IF NOT EXISTS experiment_assignments (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id    TEXT NOT NULL,
      experiment_id TEXT NOT NULL,
      user_id       TEXT NOT NULL,
      variant       TEXT NOT NULL,
      assigned_at   INTEGER DEFAULT (strftime('%s', 'now') * 1000),
      UNIQUE(project_id, experiment_id, user_id)
    );

    -- Experiment results: events tracked per variant
    CREATE TABLE IF NOT EXISTS experiment_results (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id    TEXT NOT NULL,
      experiment_id TEXT NOT NULL,
      variant       TEXT NOT NULL,
      metric        TEXT NOT NULL,  -- event name or 'revenue' or 'retention'
      value         REAL DEFAULT 0,
      count         INTEGER DEFAULT 1,
      timestamp     INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    );

    -- ── FEATURE 6: Alert Notification Channels ───────────────────────────────
    CREATE TABLE IF NOT EXISTS alert_channels (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL,
      type       TEXT NOT NULL,   -- 'slack' | 'email' | 'webhook'
      name       TEXT NOT NULL,
      config     TEXT NOT NULL,   -- JSON: {url, token, emails[], etc.}
      enabled    INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    );

    -- Track which alerts have been delivered
    CREATE TABLE IF NOT EXISTS alert_deliveries (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      alert_id   INTEGER NOT NULL,
      channel_id INTEGER NOT NULL,
      status     TEXT DEFAULT 'pending',  -- pending/sent/failed
      sent_at    INTEGER,
      error      TEXT
    );

    -- ── FEATURE 7: Data Export Jobs ──────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS export_jobs (
      id          TEXT PRIMARY KEY,
      project_id  TEXT NOT NULL,
      type        TEXT NOT NULL,   -- 'events' | 'sessions' | 'users' | 'full'
      format      TEXT NOT NULL,   -- 'json' | 'csv' | 'ndjson'
      destination TEXT NOT NULL,   -- 'download' | 's3' | 'bigquery' | 'webhook'
      config      TEXT DEFAULT '{}', -- JSON: destination-specific config
      status      TEXT DEFAULT 'pending', -- pending/running/done/failed
      row_count   INTEGER DEFAULT 0,
      file_size   INTEGER DEFAULT 0,
      file_url    TEXT,
      error       TEXT,
      created_by  TEXT,
      created_at  INTEGER DEFAULT (strftime('%s', 'now') * 1000),
      completed_at INTEGER
    );

    -- ── INDEXES ───────────────────────────────────────────────────────────────
    CREATE INDEX IF NOT EXISTS idx_events_session       ON events(session_id);
    CREATE INDEX IF NOT EXISTS idx_events_project       ON events(project_id);
    CREATE INDEX IF NOT EXISTS idx_events_type          ON events(type);
    CREATE INDEX IF NOT EXISTS idx_sessions_project     ON sessions(project_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_version     ON sessions(app_version);
    CREATE INDEX IF NOT EXISTS idx_analytics_project    ON analytics_events(project_id);
    CREATE INDEX IF NOT EXISTS idx_analytics_event      ON analytics_events(event_name);
    CREATE INDEX IF NOT EXISTS idx_analytics_user       ON analytics_events(user_id);
    CREATE INDEX IF NOT EXISTS idx_analytics_ts         ON analytics_events(timestamp);
    CREATE INDEX IF NOT EXISTS idx_funnel_project       ON funnel_events(project_id, funnel_name);
    CREATE INDEX IF NOT EXISTS idx_user_profiles        ON user_profiles(project_id, user_id);
    CREATE INDEX IF NOT EXISTS idx_users_email          ON users(email);
    CREATE INDEX IF NOT EXISTS idx_audit_user           ON audit_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_retention_cohort     ON retention_cohorts(project_id, cohort_date);
    CREATE INDEX IF NOT EXISTS idx_user_paths_session   ON user_paths(project_id, session_id);
    CREATE INDEX IF NOT EXISTS idx_path_transitions     ON path_transitions(project_id, from_event, to_event);
    CREATE INDEX IF NOT EXISTS idx_exp_assignments      ON experiment_assignments(project_id, experiment_id, user_id);
    CREATE INDEX IF NOT EXISTS idx_exp_results          ON experiment_results(project_id, experiment_id, variant);
    CREATE INDEX IF NOT EXISTS idx_super_props          ON super_properties(project_id);
    CREATE INDEX IF NOT EXISTS idx_export_jobs          ON export_jobs(project_id, status);
  `)

  // Seed demo project
  const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get('demo-project')
  if (!existing) {
    db.prepare('INSERT INTO projects (id, name, api_key) VALUES (?, ?, ?)')
      .run('demo-project', 'Demo App', 'dp_live_demo_key_12345')
    console.log('✅ Demo project created  (API key: dp_live_demo_key_12345)')
  }

  // Seed default super_admin
  const adminExists = db.prepare("SELECT id FROM users WHERE role = 'super_admin'").get()
  if (!adminExists) {
    const bcrypt = require('bcryptjs')
    const hash   = bcrypt.hashSync('admin123', 10)
    db.prepare('INSERT INTO users (id, email, name, password_hash, role, project_id) VALUES (?, ?, ?, ?, ?, NULL)')
      .run('user-admin-001', 'admin@droidpulse.dev', 'Super Admin', hash, 'super_admin')
    console.log('✅ Default super_admin created')
    console.log('   email: admin@droidpulse.dev   password: admin123')
    console.log('   ⚠️  Change this password in production!')
  }
}

module.exports = { initSchema }
