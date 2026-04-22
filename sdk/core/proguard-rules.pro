# Optimizer SDK ProGuard rules

# Keep public API
-keep public class com.yourcompany.optimizer.core.Optimizer {
    public *;
}

-keep public class com.yourcompany.optimizer.core.OptimizerConfig {
    public *;
}

# Keep event classes
-keep class * extends com.yourcompany.optimizer.core.Event {
    *;
}

# Coroutines
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}
