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
      timestamp       INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_profiles (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL,
      user_id    TEXT NOT NULL,
      properties TEXT,
      first_seen INTEGER,
      last_seen  INTEGER,
      UNIQUE(project_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS funnel_events (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id  TEXT NOT NULL,
      project_id  TEXT NOT NULL,
      user_id     TEXT,
      funnel_name TEXT NOT NULL,
      step_name   TEXT NOT NULL,
      perf_score  INTEGER DEFAULT 0,
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

    CREATE INDEX IF NOT EXISTS idx_events_session     ON events(session_id);
    CREATE INDEX IF NOT EXISTS idx_events_project     ON events(project_id);
    CREATE INDEX IF NOT EXISTS idx_events_type        ON events(type);
    CREATE INDEX IF NOT EXISTS idx_sessions_project   ON sessions(project_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_version   ON sessions(app_version);
    CREATE INDEX IF NOT EXISTS idx_analytics_project  ON analytics_events(project_id);
    CREATE INDEX IF NOT EXISTS idx_analytics_event    ON analytics_events(event_name);
    CREATE INDEX IF NOT EXISTS idx_analytics_user     ON analytics_events(user_id);
    CREATE INDEX IF NOT EXISTS idx_analytics_ts       ON analytics_events(timestamp);
    CREATE INDEX IF NOT EXISTS idx_funnel_project     ON funnel_events(project_id, funnel_name);
    CREATE INDEX IF NOT EXISTS idx_user_profiles      ON user_profiles(project_id, user_id);
    CREATE INDEX IF NOT EXISTS idx_users_email        ON users(email);
    CREATE INDEX IF NOT EXISTS idx_audit_user         ON audit_log(user_id);
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
