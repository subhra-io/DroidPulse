# ============================================================
# DroidPulse SDK — Consumer ProGuard / R8 Rules
# These rules are automatically applied to any app using DroidPulse.
# You do NOT need to copy these into your app's proguard-rules.pro
# ============================================================

# Keep all public SDK classes and their public members
-keep public class com.yourcompany.optimizer.** { public *; }

# Keep DroidPulse entry point (called by developer)
-keep class com.yourcompany.optimizer.core.DroidPulse { *; }
-keep class com.yourcompany.optimizer.core.DroidPulseConfig { *; }
-keep class com.yourcompany.optimizer.core.Optimizer { *; }
-keep class com.yourcompany.optimizer.core.OptimizerConfig { *; }

# Keep all Event data classes — used by EventSerializer via reflection
# Without this, R8 removes fields and serialization breaks
-keep class com.yourcompany.optimizer.core.ScreenEvent { *; }
-keep class com.yourcompany.optimizer.core.MemoryEvent { *; }
-keep class com.yourcompany.optimizer.core.FpsEvent { *; }
-keep class com.yourcompany.optimizer.network.ApiEvent { *; }
-keepclassmembers class * extends com.yourcompany.optimizer.core.Event {
    <fields>;
}

# Keep network interceptor (added to OkHttp by developer)
-keep class com.yourcompany.optimizer.network.OptimizerInterceptor { *; }

# Keep WebSocketServer (started via reflection in AutoWebSocketServer)
-keep class com.yourcompany.optimizer.transport.WebSocketServer { *; }
-keep class com.yourcompany.optimizer.transport.WebSocketServer {
    public <init>(int);
    public void start();
    public void stop();
}

# Keep EventSerializer
-keep class com.yourcompany.optimizer.transport.EventSerializer { *; }

# Keep enums (used in events)
-keepclassmembers enum com.yourcompany.optimizer.** { *; }

# Keep Kotlin coroutines (used internally)
-keepclassmembernames class kotlinx.** {
    volatile <fields>;
}

# Keep Java-WebSocket library
-keep class org.java_websocket.** { *; }
-dontwarn org.java_websocket.**

# Keep Kotlin metadata (needed for reflection-based serialization)
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes EnclosingMethod
