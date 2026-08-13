package com.veylumi

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.engine.cio.CIO
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.*
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.*

@Serializable data class ApiMeta(val requestId: String = "")
@Serializable data class ApiError(val code: String, val message: String, val details: JsonElement? = null)
@Serializable data class Envelope<T>(val ok: Boolean, val data: T? = null, val error: ApiError? = null, val meta: ApiMeta = ApiMeta())
@Serializable data class Bootstrap(val token: String)
@Serializable data class Product(val id: Int, val brand: String, val name: String, val type: String, val price: String, val tone: String, val shade: String, val region: String, val color: String, val url: String, val categoryId: String, val undertone: String, val finish: String, val skinTags: List<String> = emptyList())
@Serializable data class Tutorial(val platform: String, val creator: String, val title: String, val tags: String, val url: String, val productIds: List<Int> = emptyList())
@Serializable data class AnalysisJob(val jobId: String, val status: String, val result: JsonObject? = null, val error: String? = null)
@Serializable data class Settings(val displayName: String = "Yuki", val email: String = "", val region: String = "中国大陆", val language: String = "zh-CN", val skinProfile: String = "未设置", val undertone: String = "未设置", val savePhotosForThreeDays: Boolean = false, val personalizedTutorials: Boolean = true)
@Serializable data class StateSnapshot(val version: Int = 1, val revision: Long = 0, val savedProductIds: List<Int> = emptyList(), val analyses: List<JsonObject> = emptyList(), val feedback: List<JsonObject> = emptyList(), val settings: Settings = Settings(), val user: JsonObject = buildJsonObject { })

class VeylumiApiException(val code: String, override val message: String) : Exception(message)

class VeylumiApiClient(private var baseUrl: String = PlatformContract.apiBaseUrl) {
    private val json = Json { ignoreUnknownKeys = true; explicitNulls = false }
    private val http = HttpClient(CIO) { install(ContentNegotiation) { json(json) } }
    private var token: String? = null
    fun setBaseUrl(value: String) { baseUrl = value.trimEnd('/') ; token = null }
    private suspend fun auth(): String { if (token == null) token = getPublic<Bootstrap>("/api/bootstrap").token; return token!! }
    private suspend inline fun <reified T> getPublic(path: String): T = decode(http.get("$baseUrl$path"))
    private suspend inline fun <reified T> request(path: String, method: String = "GET", body: JsonElement? = null, headers: Map<String, String> = emptyMap()): T {
        val response = http.request("$baseUrl$path") { this.method = io.ktor.http.HttpMethod.parse(method); header(HttpHeaders.Authorization, "Bearer ${auth()}"); headers.forEach { header(it.key, it.value) }; if (body != null) { contentType(ContentType.Application.Json); setBody(body) } }
        return decode(response)
    }
    private suspend inline fun <reified T> decode(response: io.ktor.client.statement.HttpResponse): T {
        val envelope = json.decodeFromString<Envelope<T>>(response.bodyAsText())
        if (!response.status.value.let { it in 200..299 } || !envelope.ok || envelope.data == null) throw VeylumiApiException(envelope.error?.code ?: "API_HTTP_ERROR", envelope.error?.message ?: "Request failed")
        return envelope.data
    }
    suspend fun state() = request<StateSnapshot>("/api/state")
    suspend fun products() = request<List<Product>>("/api/catalog/products")
    suspend fun tutorials() = request<List<Tutorial>>("/api/catalog/tutorials")
    suspend fun save(state: StateSnapshot) = request<StateSnapshot>("/api/state", "POST", json.encodeToJsonElement(state), mapOf(HttpHeaders.IfMatch to state.revision.toString()))
    suspend fun applyStateOperation(operation: JsonObject, revision: Long) = request<StateSnapshot>("/api/state", "PATCH", operation, mapOf(HttpHeaders.IfMatch to revision.toString()))
    suspend fun analyze(imageData: String, filename: String, mimeType: String, size: Long, key: String): AnalysisJob = request("/api/analyze", "POST", buildJsonObject { put("imageData", imageData); put("filename", filename); put("mimeType", mimeType); put("size", size) }, mapOf("Idempotency-Key" to key))
    suspend fun job(id: String) = request<AnalysisJob>("/api/analyze/${java.net.URLEncoder.encode(id, "UTF-8")}")
    suspend fun preview(id: String): ByteArray { val response = http.get("$baseUrl/api/analyze/${java.net.URLEncoder.encode(id, "UTF-8")}/preview") { header(HttpHeaders.Authorization, "Bearer ${auth()}") }; if (!response.status.value.let { it in 200..299 }) throw VeylumiApiException("API_PREVIEW_ERROR", "Preview unavailable"); return response.body() }
}
