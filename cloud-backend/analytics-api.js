// DroidPulse Analytics API Server
// The Mixpanel killer for mobile - handles analytics events with performance correlation

const express = require('express');
const cors = require('cors');
const { ClickHouse } = require('clickhouse');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3001;

// ClickHouse connection
const clickhouse = new ClickHouse({
  url: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
  port: process.env.CLICKHOUSE_PORT || 8123,
  debug: process.env.NODE_ENV === 'development',
  basicAuth: process.env.CLICKHOUSE_AUTH ? {
    username: process.env.CLICKHOUSE_USER || 'default',
    password: process.env.CLICKHOUSE_PASSWORD || ''
  } : null,
  isUseGzip: true,
  format: "json",
  config: {
    session_timeout: 60,
    output_format_json_quote_64bit_integers: 0,
    enable_http_compression: 1
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// WebSocket server for real-time dashboard updates
const wss = new WebSocket.Server({ port: 8081 });

// Broadcast to all connected dashboards
function broadcast(data) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYTICS ENDPOINTS - The Mixpanel killer APIs
// ═══════════════════════════════════════════════════════════════════════════════

// Track event with performance correlation
app.post('/api/track', async (req, res) => {
  try {
    const {
      event_name,
      user_id,
      session_id,
      properties = {},
      performance_context = {},
      timestamp = Date.now()
    } = req.body;

    // Validate required fields
    if (!event_name) {
      return res.status(400).json({ error: 'event_name is required' });
    }

    // Extract performance metrics (THE KILLER FEATURE!)
    const {
      startup_time_ms = 0,
      memory_usage_mb = 0,
      avg_fps = 60,
      api_latency_avg_ms = 0,
      crash_free_session = true,
      performance_score = 100,
      device_tier = 'unknown',
      network_type = 'unknown'
    } = performance_context;

    // Extract revenue if present
    const revenue = properties.revenue || properties.amount || 0;
    const currency = properties.currency || 'USD';

    // Insert into ClickHouse
    const query = `
      INSERT INTO analytics_events (
        event_name, timestamp, user_id, session_id, properties,
        startup_time_ms, memory_usage_mb, avg_fps, api_latency_avg_ms,
        crash_free_session, performance_score, device_tier, network_type,
        revenue, currency, app_version, build_type
      ) VALUES (
        '${event_name}', 
        '${new Date(timestamp).toISOString()}',
        '${user_id || 'anonymous'}',
        '${session_id || ''}',
        '${JSON.stringify(properties).replace(/'/g, "\\'")}',
        ${startup_time_ms},
        ${memory_usage_mb},
        ${avg_fps},
        ${api_latency_avg_ms},
        ${crash_free_session ? 1 : 0},
        ${performance_score},
        '${device_tier}',
        '${network_type}',
        ${revenue},
        '${currency}',
        '${properties.app_version || 'unknown'}',
        '${properties.build_type || 'unknown'}'
      )
    `;

    await clickhouse.query(query).toPromise();

    // Broadcast to real-time dashboard
    broadcast({
      type: 'analytics_event',
      event: {
        event_name,
        user_id,
        timestamp,
        performance_score,
        startup_time_ms,
        revenue
      }
    });

    res.json({ success: true, event_id: `${Date.now()}-${Math.random()}` });

  } catch (error) {
    console.error('Track event error:', error);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

// Get performance-revenue correlation (KILLER INSIGHT!)
app.get('/api/insights/performance-revenue', async (req, res) => {
  try {
    const { days = 7 } = req.query;

    const query = `
      SELECT 
        CASE 
          WHEN performance_score >= 90 THEN 'excellent'
          WHEN performance_score >= 70 THEN 'good'
          WHEN performance_score >= 50 THEN 'poor'
          ELSE 'critical'
        END as performance_tier,
        count(DISTINCT user_id) as users,
        sum(revenue) as total_revenue,
        avg(revenue) as avg_revenue_per_user,
        (countIf(revenue > 0) / count()) * 100 as conversion_rate
      FROM analytics_events 
      WHERE timestamp >= now() - INTERVAL ${days} DAY
        AND revenue >= 0
      GROUP BY performance_tier
      ORDER BY avg_revenue_per_user DESC
    `;

    const result = await clickhouse.query(query).toPromise();
    
    res.json({
      success: true,
      data: result,
      insight: "Users with excellent performance (90+ score) convert significantly better",
      period_days: days
    });

  } catch (error) {
    console.error('Performance-revenue correlation error:', error);
    res.status(500).json({ error: 'Failed to get insights' });
  }
});

// Get startup time impact on conversion
app.get('/api/insights/startup-conversion', async (req, res) => {
  try {
    const { days = 7 } = req.query;

    const query = `
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
      WHERE timestamp >= now() - INTERVAL ${days} DAY
      GROUP BY startup_bucket
      ORDER BY avg_revenue_per_user DESC
    `;

    const result = await clickhouse.query(query).toPromise();
    
    res.json({
      success: true,
      data: result,
      insight: "Faster startup times directly correlate with higher conversion rates",
      period_days: days
    });

  } catch (error) {
    console.error('Startup conversion error:', error);
    res.status(500).json({ error: 'Failed to get startup insights' });
  }
});

// Get funnel analysis with performance impact
app.get('/api/insights/funnel-performance/:funnelName', async (req, res) => {
  try {
    const { funnelName } = req.params;
    const { days = 7 } = req.query;

    const query = `
      SELECT 
        funnel_step,
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
      WHERE funnel_name = '${funnelName}'
        AND timestamp >= now() - INTERVAL ${days} DAY
      GROUP BY funnel_step, performance_tier
      ORDER BY funnel_step, performance_tier
    `;

    const result = await clickhouse.query(query).toPromise();
    
    res.json({
      success: true,
      data: result,
      insight: `Performance significantly impacts ${funnelName} funnel conversion rates`,
      funnel_name: funnelName,
      period_days: days
    });

  } catch (error) {
    console.error('Funnel performance error:', error);
    res.status(500).json({ error: 'Failed to get funnel insights' });
  }
});

// Get real-time analytics dashboard data
app.get('/api/dashboard/realtime', async (req, res) => {
  try {
    const queries = {
      // Events in last hour
      recent_events: `
        SELECT event_name, count() as count, avg(performance_score) as avg_performance
        FROM analytics_events 
        WHERE timestamp >= now() - INTERVAL 1 HOUR
        GROUP BY event_name
        ORDER BY count DESC
        LIMIT 10
      `,
      
      // Performance distribution
      performance_distribution: `
        SELECT 
          CASE 
            WHEN performance_score >= 90 THEN 'excellent'
            WHEN performance_score >= 70 THEN 'good'
            WHEN performance_score >= 50 THEN 'poor'
            ELSE 'critical'
          END as tier,
          count() as count
        FROM analytics_events 
        WHERE timestamp >= now() - INTERVAL 1 HOUR
        GROUP BY tier
      `,
      
      // Revenue in last 24h
      revenue_24h: `
        SELECT 
          sum(revenue) as total_revenue,
          count(DISTINCT user_id) as unique_users,
          countIf(revenue > 0) as paying_users
        FROM analytics_events 
        WHERE timestamp >= now() - INTERVAL 24 HOUR
      `
    };

    const results = {};
    for (const [key, query] of Object.entries(queries)) {
      results[key] = await clickhouse.query(query).toPromise();
    }

    res.json({
      success: true,
      data: results,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Dashboard data error:', error);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'DroidPulse Analytics API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('Dashboard connected to real-time analytics');
  
  ws.send(JSON.stringify({
    type: 'connection',
    message: 'Connected to DroidPulse Analytics - The Mixpanel killer for mobile!'
  }));

  ws.on('close', () => {
    console.log('Dashboard disconnected');
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 DroidPulse Analytics API running on port ${PORT}`);
  console.log(`📊 WebSocket server running on port 8081`);
  console.log(`🎯 The Mixpanel killer for mobile is ready!`);
});

module.exports = app;