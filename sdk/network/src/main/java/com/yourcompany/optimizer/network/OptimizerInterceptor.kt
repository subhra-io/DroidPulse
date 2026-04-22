package com.yourcompany.optimizer.network

import com.yourcompany.optimizer.core.DroidPulse
import com.yourcompany.optimizer.core.Logger
import okhttp3.Interceptor
import okhttp3.Response
import java.io.IOException

/**
 * OkHttp interceptor for tracking network requests.
 *
 * Add to your OkHttpClient:
 * ```
 * OkHttpClient.Builder()
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
            val duration = System.currentTimeMillis() - startTime
            
            val event = ApiEvent(
                url = request.url.toString(),
                method = request.method,
                requestSize = request.body?.contentLength() ?: 0,
                responseCode = response?.code,
                responseSize = response?.body?.contentLength() ?: 0,
                duration = duration,
                success = error == null,
                errorMessage = error?.message
            )
            
            DroidPulse.dispatcher.dispatch(event)
            
            Logger.debug("API ${request.method} ${request.url} → ${response?.code ?: "ERR"} in ${duration}ms")
        }
    }
}
