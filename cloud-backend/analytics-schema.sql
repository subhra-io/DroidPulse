-- DroidPulse Analytics Schema for ClickHouse
-- The Mixpanel killer for mobile - optimized for performance correlation queries

-- Events table with performance correlation
CREATE TABLE IF NOT EXISTS analytics_events (
    -- Event identification
    event_id UUID DEFAULT generateUUIDv4(),
    event_name String,
    timestamp DateTime64(3),
    
    -- User & session context
    user_id String,
    session_id String,
    app_version String,
    build_type String,
    
    -- Event properties (JSON for flexibility)
    properties String, -- JSON string
    
    -- Performance correlation (THE KILLER FEATURE!)
    startup_time_ms UInt32,
    memory_usage_mb Float32,
    avg_fps Float32,
    api_latency_avg_ms UInt32,
    crash_free_session UInt8, -- boolean
    performance_score UInt8, -- 0-100
    
    -- Device context
    device_tier String, -- low/mid/high
    network_type String, -- wifi/cellular/unknown
    device_model String,
    os_version String,
    
    -- Revenue tracking
    revenue Float64 DEFAULT 0,
    currency String DEFAULT 'USD',
    
    -- Funnel tracking
    funnel_name String DEFAULT '',
    funnel_step String DEFAULT '',
    
    -- Indexing for fast queries
    INDEX idx_event_name event_name TYPE bloom_filter GRANULARITY 1,
    INDEX idx_user_id user_id TYPE bloom_filter GRANULARITY 1,
    INDEX idx_performance performance_score TYPE minmax GRANULARITY 1
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (timestamp, event_name, user_id)
TTL timestamp + INTERVAL 1 YEAR; -- Auto-cleanup old data

-- Performance snapshots for correlation analysis
CREATE TABLE IF NOT EXISTS performance_snapshots (
    snapshot_id UUID DEFAULT generateUUIDv4(),
    timestamp DateTime64(3),
    user_id String,
    session_id String,
    
    -- Performance metrics
    startup_time_ms UInt32,
    memory_usage_mb Float32,
    cpu_usage_percent Float32,
    battery_level UInt8,
    fps_avg Float32,
    fps_min Float32,
    jank_count UInt16,
    
    -- Network performance
    api_calls_count UInt16,
    api_latency_avg_ms UInt32,
    api_latency_p95_ms UInt32,
    api_error_rate Float32,
    
    -- Stability
    crash_count UInt8,
    anr_count UInt8,
    error_count UInt16,
    
    -- Device context
    device_tier String,
    network_type String,
    thermal_state String -- normal/warm/hot/critical
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (timestamp, user_id)
TTL timestamp + INTERVAL 6 MONTHS;

-- User profiles with performance characteristics
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id String,
    first_seen DateTime64(3),
    last_seen DateTime64(3),
    
    -- User properties
    email String DEFAULT '',
    plan String DEFAULT 'free',
    signup_date Date,
    
    -- Performance profile (UNIQUE VALUE PROP!)
    avg_startup_time_ms UInt32,
    avg_memory_usage_mb Float32,
    avg_performance_score UInt8,
    crash_rate Float32,
    device_tier String,
    
    -- Behavioral metrics
    session_count UInt32,
    total_revenue Float64,
    ltv Float64,
    churn_risk_score UInt8, -- 0-100
    
    -- Last performance snapshot
    last_performance_score UInt8,
    last_startup_time_ms UInt32
) ENGINE = ReplacingMergeTree()
ORDER BY user_id;

-- Revenue events with performance correlation
CREATE TABLE IF NOT EXISTS revenue_events (
    revenue_id UUID DEFAULT generateUUIDv4(),
    timestamp DateTime64(3),
    user_id String,
    session_id String,
    
    -- Revenue details
    amount Float64,
    currency String,
    event_name String, -- purchase_completed, subscription_renewed, etc.
    
    -- Performance at time of purchase (KILLER INSIGHT!)
    performance_score UInt8,
    startup_time_ms UInt32,
    memory_usage_mb Float32,
    crash_free_session UInt8,
    
    -- Product details
    product_id String DEFAULT '',
    category String DEFAULT '',
    payment_method String DEFAULT ''
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (timestamp, user_id)
TTL timestamp + INTERVAL 2 YEARS;

-- Funnel analysis with performance impact
CREATE TABLE IF NOT EXISTS funnel_events (
    funnel_id UUID DEFAULT generateUUIDv4(),
    timestamp DateTime64(3),
    user_id String,
    session_id String,
    
    -- Funnel details
    funnel_name String,
    step_name String,
    step_order UInt8,
    
    -- Performance at each step
    performance_score UInt8,
    startup_time_ms UInt32,
    step_duration_ms UInt32,
    
    -- Completion tracking
    completed UInt8, -- boolean
    dropped_off UInt8 -- boolean
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (timestamp, funnel_name, user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- MATERIALIZED VIEWS FOR REAL-TIME ANALYTICS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Real-time performance-revenue correlation
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_performance_revenue_correlation
ENGINE = SummingMergeTree()
ORDER BY (performance_tier, date)
AS SELECT
    toDate(timestamp) as date,
    CASE 
        WHEN performance_score >= 90 THEN 'excellent'
        WHEN performance_score >= 70 THEN 'good'
        WHEN performance_score >= 50 THEN 'poor'
        ELSE 'critical'
    END as performance_tier,
    count() as event_count,
    sum(revenue) as total_revenue,
    avg(revenue) as avg_revenue,
    countIf(revenue > 0) as conversion_count
FROM analytics_events
WHERE revenue > 0
GROUP BY date, performance_tier;

-- Daily active users by performance tier
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_dau_by_performance
ENGINE = SummingMergeTree()
ORDER BY (date, performance_tier)
AS SELECT
    toDate(timestamp) as date,
    CASE 
        WHEN performance_score >= 90 THEN 'excellent'
        WHEN performance_score >= 70 THEN 'good'
        WHEN performance_score >= 50 THEN 'poor'
        ELSE 'critical'
    END as performance_tier,
    uniq(user_id) as dau
FROM analytics_events
GROUP BY date, performance_tier;

-- Funnel conversion rates by performance
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_funnel_performance_impact
ENGINE = ReplacingMergeTree()
ORDER BY (funnel_name, performance_tier)
AS SELECT
    funnel_name,
    CASE 
        WHEN performance_score >= 90 THEN 'excellent'
        WHEN performance_score >= 70 THEN 'good'
        WHEN performance_score >= 50 THEN 'poor'
        ELSE 'critical'
    END as performance_tier,
    count() as total_users,
    countIf(completed = 1) as completed_users,
    (completed_users / total_users) * 100 as conversion_rate,
    avg(step_duration_ms) as avg_step_duration
FROM funnel_events
GROUP BY funnel_name, performance_tier;

-- ═══════════════════════════════════════════════════════════════════════════════
-- KILLER QUERIES - What makes DroidPulse unique!
-- ═══════════════════════════════════════════════════════════════════════════════

-- Query 1: Revenue impact by startup time
-- "Users with <2s startup convert 31% more"
/*
SELECT 
    CASE 
        WHEN startup_time_ms < 1000 THEN '<1s'
        WHEN startup_time_ms < 2000 THEN '1-2s'
        WHEN startup_time_ms < 4000 THEN '2-4s'
        ELSE '>4s'
    END as startup_bucket,
    count(DISTINCT user_id) as users,
    sum(revenue) as total_revenue,
    avg(revenue) as avg_revenue_per_user,
    (countIf(revenue > 0) / count()) * 100 as conversion_rate
FROM analytics_events 
WHERE timestamp >= now() - INTERVAL 7 DAY
GROUP BY startup_bucket
ORDER BY avg_revenue_per_user DESC;
*/

-- Query 2: Crash impact on churn
-- "Users who crash churn 45% more within 7 days"
/*
SELECT 
    crash_free_session,
    count(DISTINCT user_id) as total_users,
    countIf(last_seen < now() - INTERVAL 7 DAY) as churned_users,
    (churned_users / total_users) * 100 as churn_rate
FROM user_profiles
GROUP BY crash_free_session;
*/

-- Query 3: Performance tier revenue analysis
-- "Excellent performance users generate 2.1x more revenue"
/*
SELECT 
    performance_tier,
    total_revenue,
    avg_revenue,
    conversion_count,
    (conversion_count / event_count) * 100 as conversion_rate
FROM mv_performance_revenue_correlation
WHERE date >= today() - 30
GROUP BY performance_tier
ORDER BY avg_revenue DESC;
*/