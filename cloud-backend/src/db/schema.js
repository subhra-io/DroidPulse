/**
 * Database schema for DroidPulse Cloud
 * Uses SQLite (better-sqlite3) for simplicity — swap to PostgreSQL for production
 */

const initSchema = (db) => {
  db.exec(`
    -- Projects: one per Android app
    CREATE TABLE IF NOT EXISTS projects (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      api_key    TEXT UNIQUE NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    );

    -- Sessions: one per app launch
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
      startup_ms   INTEGER,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );

    -- Events: all SDK events
    CREATE TABLE IF NOT EXISTS events (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      type       TEXT NOT NULL,
      data       TEXT NOT NULL,
      timestamp  INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    -- Version metrics: aggregated per version for comparison
    CREATE TABLE IF NOT EXISTS version_metrics (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id      TEXT NOT NULL,
      app_version     TEXT NOT NULL,
      avg_fps         REAL,
      avg_startup_ms  REAL,
      avg_memory_mb   REAL,
      avg_api_ms      REAL,
      crash_rate      REAL,
      session_count   INTEGER DEFAULT 0,
      computed_at     INTEGER DEFAULT (strftime('%s', 'now') * 1000),
      UNIQUE(project_id, app_version)
    );

    -- Alerts: regression notifications
    CREATE TABLE IF NOT EXISTS alerts (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id        TEXT NOT NULL,
      metric            TEXT NOT NULL,
      baseline_version  TEXT NOT NULL,
      current_version   TEXT NOT NULL,
      baseline_value    REAL,
      current_value     REAL,
      change_percent    REAL,
      severity          TEXT,
      created_at        INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    );

    -- Analytics events: custom track() calls with performance context
    CREATE TABLE IF NOT EXISTS analytics_events (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id       TEXT NOT NULL,
      project_id       TEXT NOT NULL,
      event_name       TEXT NOT NULL,
      user_id          TEXT,
      properties       TEXT,   -- JSON
      startup_time_ms  INTEGER DEFAULT 0,
      memory_mb        REAL    DEFAULT 0,
      fps_avg          REAL    DEFAULT 0,
      perf_score       INTEGER DEFAULT 0,
      crash_free       INTEGER DEFAULT 1,
      timestamp        INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    -- User profiles: identify() calls
    CREATE TABLE IF NOT EXISTS user_profiles (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id   TEXT NOT NULL,
      user_id      TEXT NOT NULL,
      properties   TEXT,   -- JSON
      first_seen   INTEGER,
      last_seen    INTEGER,
      UNIQUE(project_id, user_id)
    );

    -- Funnel steps
    CREATE TABLE IF NOT EXISTS funnel_events (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id   TEXT NOT NULL,
      project_id   TEXT NOT NULL,
      user_id      TEXT,
      funnel_name  TEXT NOT NULL,
      step_name    TEXT NOT NULL,
      perf_score   INTEGER DEFAULT 0,
      timestamp    INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_analytics_project   ON analytics_events(project_id);
    CREATE INDEX IF NOT EXISTS idx_analytics_event     ON analytics_events(event_name);
    CREATE INDEX IF NOT EXISTS idx_analytics_user      ON analytics_events(user_id);
    CREATE INDEX IF NOT EXISTS idx_analytics_ts        ON analytics_events(timestamp);
    CREATE INDEX IF NOT EXISTS idx_funnel_project      ON funnel_events(project_id, funnel_name);
    CREATE INDEX IF NOT EXISTS idx_user_profiles       ON user_profiles(project_id, user_id);
    CREATE INDEX IF NOT EXISTS idx_events_project    ON events(project_id);
    CREATE INDEX IF NOT EXISTS idx_events_type       ON events(type);
    CREATE INDEX IF NOT EXISTS idx_sessions_project  ON sessions(project_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_version  ON sessions(app_version);
  `)

  // Insert a default demo project
  const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get('demo-project')
  if (!existing) {
    db.prepare(`
      INSERT INTO projects (id, name, api_key)
      VALUES (?, ?, ?)
    `).run('demo-project', 'Demo App', 'dp_live_demo_key_12345')
    console.log('✅ Demo project created (API key: dp_live_demo_key_12345)')
  }
}

module.exports = { initSchema }
