package com.yourcompany.optimizer.network

import com.yourcompany.optimizer.core.Logger
import com.yourcompany.optimizer.core.Optimizer
import okhttp3.Interceptor
import okhttp3.Response
import java.io.IOException

/**
 * OkHttp interceptor for tracking network requests
 * 
 * Usage:
 * ```
 * val client = OkHttpClient.Builder()
 *     .addInterceptor(OptimizerInterceptor())
 *     .build()
 * ```
 */
class OptimizerInterceptor : Interceptor {
    
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val startTime = System.currentTimeMillis()
        
        var response: Response? = null
        var error: IOException? = null
        
        try {
            response = chain.proceed(request)
            return response
        } catch (e: IOException) {
            error = e
            throw e
        } finally {
            val endTime = System.currentTimeMillis()
            val duration = endTime - startTime
            
            val event = ApiEvent(
                url = request.url.toString(),
                method = request.method,
                requestSize = request.body?.contentLength() ?: 0,
                responseCode = response?.code,
                responseSize = response?.body?.contentLength() ?: 0,
                duration = duration,
                success = error == null,
                errorMessage = error?.message,
                headers = request.headers.toMap()
            )
            
            Optimizer.dispatcher.dispatch(event)
            
            Logger.debug(
                "API ${request.method} ${request.url} - " +
                "${response?.code ?: "ERROR"} in ${duration}ms"
            )
        }
    }
}

private fun okhttp3.Headers.toMap(): Map<String, String> {
    return names().associateWith { get(it) ?: "" }
}
