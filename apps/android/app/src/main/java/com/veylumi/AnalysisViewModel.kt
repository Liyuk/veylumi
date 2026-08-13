package com.veylumi

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

data class AppUiState(val loading: Boolean = true, val data: AppData? = null, val error: String? = null, val analysisStatus: String? = null, val report: AnalysisJob? = null)
class AppViewModel : ViewModel() {
    private val client = VeylumiApiClient()
    private val repository = VeylumiRepository(client)
    private val mutableState = MutableStateFlow(AppUiState())
    val state: StateFlow<AppUiState> = mutableState.asStateFlow()
    init { refresh() }
    fun refresh() = viewModelScope.launch { mutableState.value = mutableState.value.copy(loading = true, error = null); runCatching { repository.bootstrap() }.onSuccess { mutableState.value = AppUiState(data = it, loading = false) }.onFailure { mutableState.value = AppUiState(loading = false, error = it.message ?: "API unavailable") } }
    fun upload(bytes: ByteArray, filename: String, mimeType: String) = viewModelScope.launch { runCatching { val job = repository.analyze(bytes, filename, mimeType); mutableState.value = mutableState.value.copy(analysisStatus = job.status); repository.poll(job) { status -> mutableState.value = mutableState.value.copy(analysisStatus = status) } }.onSuccess { mutableState.value = mutableState.value.copy(analysisStatus = it.status, report = it, error = it.error) }.onFailure { mutableState.value = mutableState.value.copy(analysisStatus = "failed", error = it.message) } }
    fun toggleSaved(productId: Int) = applyOperation(buildJsonObject { put("operation", "toggleSavedProduct"); put("productId", productId) })
    fun updateSettings(settings: Settings) = applyOperation(buildJsonObject { put("operation", "updateSettings"); put("settings", kotlinx.serialization.json.Json.encodeToJsonElement(Settings.serializer(), settings)) })
    fun addFeedback(kind: String) = applyOperation(buildJsonObject { put("operation", "addFeedback"); put("feedback", buildJsonObject { put("kind", kind) }) })
    private fun applyOperation(operation: kotlinx.serialization.json.JsonObject) = viewModelScope.launch { val data = mutableState.value.data ?: return@launch; runCatching { repository.applyStateOperation(operation, data.state.revision) }.onSuccess { mutableState.value = mutableState.value.copy(data = data.copy(state = it)) }.onFailure { mutableState.value = mutableState.value.copy(error = it.message) } }
}
