package com.yourcompany.optimizer.network

/**
 * Generates cURL commands from API events for debugging
 */
object CurlGenerator {
    
    fun generate(event: ApiEvent): String {
        val builder = StringBuilder("curl -X ${event.method}")
        
        // Add headers
        event.headers.forEach { (key, value) ->
            builder.append(" \\\n  -H \"$key: $value\"")
        }
        
        // Add URL
        builder.append(" \\\n  \"${event.url}\"")
        
        return builder.toString()
    }
}
