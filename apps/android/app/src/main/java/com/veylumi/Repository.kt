package com.veylumi

import kotlinx.serialization.json.*

class VeylumiRepository(private val api: VeylumiApiClient) {
    suspend fun bootstrap(): AppData = AppData(api.state(), api.products(), api.tutorials(), api.recommendations())
    suspend fun saveWithMerge(local: StateSnapshot): StateSnapshot = try { api.save(local) } catch (error: VeylumiApiException) {
        if (error.code != "API_CONFLICT") throw error
        val remote = api.state()
        api.save(remote.copy(savedProductIds = (remote.savedProductIds + local.savedProductIds).distinct(), settings = local.settings, analyses = mergeById(remote.analyses, local.analyses), feedback = mergeById(remote.feedback, local.feedback)))
    }
    suspend fun applyStateOperation(operation: JsonObject, revision: Long): StateSnapshot = try { api.applyStateOperation(operation, revision) } catch (error: VeylumiApiException) {
        if (error.code != "API_CONFLICT") throw error
        api.applyStateOperation(operation, api.state().revision)
    }
    suspend fun analyze(image: ByteArray, filename: String, mimeType: String): AnalysisJob {
        if (mimeType !in PlatformContract.mimeTypes || image.size > PlatformContract.maxUploadBytes) throw VeylumiApiException("API_VALIDATION_ERROR", "Choose a JPG, PNG, or WEBP image smaller than 10 MB.")
        return api.analyze("data:$mimeType;base64," + android.util.Base64.encodeToString(image, android.util.Base64.NO_WRAP), filename, mimeType, image.size.toLong(), java.util.UUID.randomUUID().toString())
    }
    suspend fun poll(job: AnalysisJob, onStatus: (String) -> Unit): AnalysisJob { var current = job; val deadline = System.currentTimeMillis() + PlatformContract.pollDeadlineMs; while (current.status == "queued" || current.status == "running") { if (System.currentTimeMillis() > deadline) throw VeylumiApiException("API_TIMEOUT", "Analysis timed out."); onStatus(current.status); kotlinx.coroutines.delay(PlatformContract.pollIntervalMs); current = api.job(current.jobId) }; return current }
    private fun mergeById(remote: List<JsonObject>, local: List<JsonObject>) = (remote + local).associateBy { it["id"]?.jsonPrimitive?.content ?: java.util.UUID.randomUUID().toString() }.values.toList()
}
data class AppData(val state: StateSnapshot, val products: List<Product>, val tutorials: List<Tutorial>, val recommendations: RecommendationResponse)
