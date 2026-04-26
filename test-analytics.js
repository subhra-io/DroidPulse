// Test DroidPulse Analytics - Generate sample events to see in dashboard
// This simulates what your Android app would send

const WebSocket = require('ws');

// Connect to your existing WebSocket server (from your performance monitoring)
const ws = new WebSocket('ws://localhost:8080');

ws.on('open', function open() {
  console.log('🚀 Connected to DroidPulse WebSocket');
  console.log('📊 Generating sample analytics events...');
  
  // Simulate analytics events with performance correlation
  const events = [
    {
      type: 'analytics',
      event: 'app_opened',
      properties: {
        screen: 'MainActivity',
        user_type: 'premium'
      },
      timestamp: Date.now(),
      startupTimeMs: 1200,
      memoryUsageMb: 85.5,
      avgFps: 58.2,
      performanceScore: 87,
      crashFreeSession: true
    },
    {
      type: 'analytics', 
      event: 'product_viewed',
      properties: {
        product_id: 'premium_plan',
        category: 'subscription',
        price: 9.99
      },
      timestamp: Date.now() + 1000,
      startupTimeMs: 1200,
      memoryUsageMb: 92.1,
      avgFps: 55.8,
      performanceScore: 84,
      crashFreeSession: true
    },
    {
      type: 'analytics',
      event: 'purchase_started', 
      properties: {
        product_id: 'premium_plan',
        price: 9.99,
        payment_method: 'credit_card'
      },
      timestamp: Date.now() + 2000,
      startupTimeMs: 1200,
      memoryUsageMb: 95.3,
      avgFps: 52.1,
      performanceScore: 81,
      crashFreeSession: true
    },
    {
      type: 'analytics',
      event: 'revenue',
      properties: {
        amount: 9.99,
        currency: 'USD',
        revenue_type: 'purchase'
      },
      timestamp: Date.now() + 3000,
      startupTimeMs: 1200,
      memoryUsageMb: 98.7,
      avgFps: 48.9,
      performanceScore: 78,
      crashFreeSession: true
    },
    {
      type: 'analytics',
      event: 'user_identified',
      properties: {
        user_id: 'user_123',
        email: 'user@example.com',
        plan: 'premium'
      },
      timestamp: Date.now() + 4000,
      startupTimeMs: 1200,
      memoryUsageMb: 88.2,
      avgFps: 59.1,
      performanceScore: 89,
      crashFreeSession: true
    }
  ];

  // Send events with delays to simulate real usage
  events.forEach((event, index) => {
    setTimeout(() => {
      ws.send(JSON.stringify(event));
      console.log(`📊 Sent: ${event.event} (perf score: ${event.performanceScore})`);
    }, index * 1500);
  });

  // Generate some events with poor performance to show correlation
  setTimeout(() => {
    const poorPerfEvents = [
      {
        type: 'analytics',
        event: 'app_opened',
        properties: { screen: 'MainActivity', user_type: 'free' },
        timestamp: Date.now(),
        startupTimeMs: 4500, // Slow startup
        memoryUsageMb: 180.5, // High memory
        avgFps: 25.2, // Low FPS
        performanceScore: 35, // Poor score
        crashFreeSession: false // Had crashes
      },
      {
        type: 'analytics',
        event: 'product_viewed',
        properties: { product_id: 'premium_plan', price: 9.99 },
        timestamp: Date.now() + 1000,
        startupTimeMs: 4500,
        memoryUsageMb: 185.1,
        avgFps: 22.8,
        performanceScore: 32,
        crashFreeSession: false
      },
      {
        type: 'analytics',
        event: 'cart_abandoned', // Poor performance = abandonment
        properties: { cart_value: 9.99, abandonment_stage: 'payment' },
        timestamp: Date.now() + 2000,
        startupTimeMs: 4500,
        memoryUsageMb: 190.3,
        avgFps: 18.9,
        performanceScore: 28,
        crashFreeSession: false
      }
    ];

    poorPerfEvents.forEach((event, index) => {
      setTimeout(() => {
        ws.send(JSON.stringify(event));
        console.log(`📊 Sent: ${event.event} (perf score: ${event.performanceScore}) - POOR PERFORMANCE`);
      }, index * 1000);
    });
  }, 8000);

  console.log('');
  console.log('🎯 THE KILLER INSIGHT:');
  console.log('   Good performance (score 80+) → Purchase completed');
  console.log('   Poor performance (score 30-) → Cart abandoned');
  console.log('');
  console.log('📱 Open dashboard: http://localhost:3002');
  console.log('🎯 Click ANALYTICS tab to see the magic!');
  console.log('');
});

ws.on('error', function error(err) {
  console.log('❌ WebSocket error:', err.message);
  console.log('💡 Make sure your DroidPulse SDK WebSocket server is running on port 8080');
});

ws.on('close', function close() {
  console.log('📊 Analytics test completed!');
  process.exit(0);
});