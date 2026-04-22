# Architecture Overview

## System Design

```
┌─────────────────────────────────────────────────┐
│              Android Application                 │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ Activity │  │ Fragment │  │  OkHttp  │      │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘      │
│       │             │             │             │
│       └─────────────┴─────────────┘             │
│                     │                           │
│              ┌──────▼──────┐                    │
│              │  Optimizer  │                    │
│              │    Core     │                    │
│              └──────┬──────┘                    │
│                     │                           │
│       ┌─────────────┼─────────────┐             │
│       │             │             │             │
│  ┌────▼────┐  ┌────▼────┐  ┌────▼────┐         │
│  │Lifecycle│  │ Network │  │ Memory  │         │
│  │ Tracker │  │ Tracker │  │ Tracker │         │
│  └────┬────┘  └────┬────┘  └────┬────┘         │
│       │            │            │              │
│       └────────────┼────────────┘              │
│                    │                           │
│             ┌──────▼──────┐                    │
│             │ Dispatcher  │                    │
│             └──────┬──────┘                    │
│                    │                           │
│       ┌────────────┼────────────┐              │
│       │            │            │              │
│  ┌────▼────┐  ┌───▼────┐  ┌───▼────┐          │
│  │ Storage │  │WebSocket│ │  HTTP  │          │
│  │  (Room) │  │ Server │  │Uploader│          │
│  └─────────┘  └────┬───┘  └────────┘          │
└────────────────────┼──────────────────────────┘
                     │
                     │ WebSocket
                     │
              ┌──────▼──────┐
              │  Dashboard  │
              │   (Next.js) │
              └─────────────┘
```

## Module Breakdown

### Core Module
- **Optimizer**: Main SDK entry point
- **OptimizerConfig**: Configuration
- **Dispatcher**: Event bus using Kotlin Flow
- **Logger**: Internal logging
- **LifecycleRegistry**: Global lifecycle callbacks

### Lifecycle Module
- **ActivityTracker**: Tracks Activity lifecycle
- **FragmentTracker**: Tracks Fragment lifecycle
- **ComposeNavTracker**: Tracks Compose navigation
- **ScreenEvent**: Lifecycle event data class

### Network Module
- **OptimizerInterceptor**: OkHttp interceptor
- **ApiEvent**: Network event data class
- **NetworkCollector**: Aggregates network stats
- **CurlGenerator**: Generates cURL commands

### Transport Module
- **WebSocketServer**: Local WebSocket server
- **HttpUploader**: Cloud upload
- **EventSerializer**: JSON serialization
- **LocalServer**: Server management

### Storage Module (Future)
- **EventDatabase**: Room database
- **EventDao**: Database access
- **SessionStore**: Session management

## Event Flow

1. **Event Occurs** (Activity opened, API called, etc.)
2. **Tracker Captures** event details
3. **Dispatcher Emits** event to Flow
4. **Multiple Subscribers**:
   - Storage saves to database
   - WebSocket broadcasts to dashboard
   - HTTP uploader batches for cloud
5. **Dashboard Receives** and visualizes

## Threading Model

- **Main Thread**: Lifecycle callbacks
- **IO Thread**: Network, storage, uploads
- **Default Thread**: Event processing
- **Coroutines**: All async operations

## Performance Considerations

- **Zero overhead** when disabled
- **Sampling** to reduce event volume
- **Buffered Flow** prevents backpressure
- **Lazy initialization** of modules
- **ProGuard rules** for release builds

## Security

- **Debug-only** by default
- **No PII** collected
- **Local-first** (WebSocket optional)
- **HTTPS** for cloud uploads
- **Configurable** data retention
