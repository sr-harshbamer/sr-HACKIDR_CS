package ai.guardian.defense.engine

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

object GuardianApiClient {

    // Default Android Emulator loopback to host PC
    var baseUrl: String = "http://10.0.2.2:8000"

    private val client = OkHttpClient.Builder()
        .connectTimeout(5, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .build()

    suspend fun checkHealth(): Boolean = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder()
                .url("$baseUrl/api/health")
                .get()
                .build()
            val response = client.newCall(request).execute()
            response.isSuccessful
        } catch (e: Exception) {
            false
        }
    }

    suspend fun inspectUrl(url: String): String = withContext(Dispatchers.IO) {
        val json = """{"url":"$url","device_name":"Android Device (Real-Time Shield)"}"""
        val body = json.toRequestBody("application/json".toMediaType())
        val request = Request.Builder()
            .url("$baseUrl/api/guardian/url/inspect")
            .post(body)
            .build()
        val response = client.newCall(request).execute()
        response.body?.string() ?: ""
    }
}
