package com.yourcompany.optimizer.transport

import com.yourcompany.optimizer.core.Event
import com.yourcompany.optimizer.core.Logger
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

/**
 * Uploads events to cloud endpoint
 */
class HttpUploader(private val endpoint: String) {
    
    private val client = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .writeTimeout(10, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()
    
    suspend fun upload(events: List<Event>): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val json = EventSerializer.serializeBatch(events)
            val body = json.toRequestBody("application/json".toMediaType())
            
            val request = Request.Builder()
                .url(endpoint)
                .post(body)
                .build()
            
            val response = client.newCall(request).execute()
            
            if (response.isSuccessful) {
                Logger.debug("Uploaded ${events.size} events")
                Result.success(Unit)
            } else {
                Logger.error("Upload failed: ${response.code}")
                Result.failure(Exception("Upload failed: ${response.code}"))
            }
        } catch (e: Exception) {
            Logger.error("Upload error", e)
            Result.failure(e)
        }
    }
}
