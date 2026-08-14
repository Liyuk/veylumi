package com.veylumi

import android.content.res.Configuration
import android.os.Bundle
import android.graphics.Bitmap
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import java.io.ByteArrayOutputStream
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonPrimitive

private val Ink = DesignTokens.Ink
private val Paper = DesignTokens.Surface
private val Blush = DesignTokens.Blush
private val Moss = DesignTokens.Moss

class MainActivity : ComponentActivity() {
    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        setContent { VeylumiApp() }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VeylumiApp(viewModel: AppViewModel = viewModel()) {
    val ui by viewModel.state.collectAsStateWithLifecycle()
    val nav = rememberNavController()
    val entry by nav.currentBackStackEntryAsState()
    val route = entry?.destination?.route ?: "forYou"
    val locale = if (ui.data?.state?.settings?.language == "en-US") "en-US" else "zh-CN"
    var showSettings by remember { mutableStateOf(false) }
    MaterialTheme(colorScheme = lightColorScheme(primary = Ink, secondary = Moss, surface = Paper, background = Paper)) {
        Scaffold(
            containerColor = Paper,
            topBar = { TopAppBar(title = { Text("Veylumi", fontWeight = FontWeight.SemiBold) }, actions = { TextButton(onClick = { showSettings = true }) { Text(tr("account.settings", locale)) } }) },
            bottomBar = { if (route != "report") AppNavigation(nav, route, locale) }
        ) { padding ->
            Box(Modifier.fillMaxSize().padding(padding)) {
                when {
                    ui.loading -> CircularProgressIndicator(Modifier.align(Alignment.Center))
                    ui.data == null -> FailurePanel(ui.error ?: "API unavailable", onRetry = viewModel::refresh, locale = locale)
                    else -> AppNavHost(nav, ui, viewModel, locale)
                }
            }
        }
        if (showSettings && ui.data != null) SettingsSheet(ui.data!!.state.settings, locale, viewModel::updateSettings) { showSettings = false }
    }
}

@Composable private fun AppNavigation(nav: NavHostController, route: String, locale: String) {
    val items = listOf("forYou" to "navigation.forYou", "analyze" to "navigation.analyze", "me" to "navigation.me")
    NavigationBar { items.forEach { (destination, key) ->
        NavigationBarItem(selected = route == destination, onClick = { nav.navigate(destination) { launchSingleTop = true; popUpTo("forYou") { saveState = true }; restoreState = true } }, icon = { Text("•") }, label = { Text(tr(key, locale)) })
    } }
}

@Composable private fun AppNavHost(nav: NavHostController, ui: AppUiState, vm: AppViewModel, locale: String) {
    val data = ui.data ?: return
    NavHost(nav, startDestination = "forYou") {
        composable("forYou") { OverviewScreen(data, locale, onAnalyze = { nav.navigate("analyze") }, onLibrary = { nav.navigate("library") }) }
        composable("analyze") { AnalyzeScreen(ui, locale, vm::upload, onCompleted = { nav.navigate("report") }) }
        composable("me") { MeScreen(data, locale, onHistory = { nav.navigate("history") }, onSaved = { nav.navigate("saved") }) }
        composable("library") { LibraryScreen(data, locale, vm::toggleSaved) }
        composable("history") { HistoryScreen(data, locale, onNew = { nav.navigate("analyze") }) }
        composable("saved") { SavedScreen(data, locale, vm::toggleSaved) }
        composable("report") { ReportScreen(ui.report, data, locale, onBack = { nav.popBackStack() }, onSave = vm::toggleSaved, onFeedback = vm::addFeedback) }
    }
}

@Composable private fun MeScreen(data: AppData, locale: String, onHistory: () -> Unit, onSaved: () -> Unit) = PageColumn {
    Overline(tr("history.eyebrow", locale)); Text(tr("navigation.me", locale), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
    OutlinedCard(Modifier.fillMaxWidth().clickable(onClick = onHistory).padding(bottom = 10.dp)) { Column(Modifier.padding(16.dp)) { Text(tr("navigation.history", locale), fontWeight = FontWeight.SemiBold); Text("${data.state.analyses.size} ${tr("history.count", locale)}", color = Color.DarkGray) } }
    OutlinedCard(Modifier.fillMaxWidth().clickable(onClick = onSaved)) { Column(Modifier.padding(16.dp)) { Text(tr("navigation.saved", locale), fontWeight = FontWeight.SemiBold); Text("${data.state.savedProductIds.size} ${tr("saved.count", locale)}", color = Color.DarkGray) } }
}

@Composable private fun OverviewScreen(data: AppData, locale: String, onAnalyze: () -> Unit, onLibrary: () -> Unit) {
    val analysis = data.state.analyses.firstOrNull()
    PageColumn {
        Overline(tr("overview.heroEyebrow", locale))
        Text(tr("overview.goodMorning", locale) + data.state.settings.displayName, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Text(tr("overview.heroDescription", locale), color = Color.DarkGray)
        Spacer(Modifier.height(18.dp))
        ElevatedCard(colors = CardDefaults.elevatedCardColors(containerColor = Blush)) { Column(Modifier.padding(20.dp)) {
            Overline(tr("overview.recommendedDirection", locale))
            Text(analysis?.field("title") ?: tr("overview.startWithOne", locale), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text(analysis?.field("summary") ?: tr("overview.lookDescription", locale), modifier = Modifier.padding(top = 6.dp))
            Button(onClick = onAnalyze, modifier = Modifier.padding(top = 16.dp)) { Text(tr("overview.startAnalysis", locale)) }
        } }
        SectionTitle(tr("overview.nextStep", locale))
        OutlinedCard(Modifier.fillMaxWidth().clickable(onClick = onLibrary)) { Column(Modifier.padding(16.dp)) { Text(tr("overview.explore", locale), fontWeight = FontWeight.SemiBold); Text(tr("overview.realLinks", locale), color = Color.DarkGray) } }
        SectionTitle(tr("catalog.pickedForYou", locale))
        data.recommendations.items.mapNotNull { item -> data.products.find { it.id == item.productId }?.let { item to it } }.forEach { (item, product) ->
            OutlinedCard(Modifier.fillMaxWidth().padding(bottom = 10.dp)) { Column(Modifier.padding(16.dp)) { Text(product.brand.uppercase(), style = MaterialTheme.typography.labelSmall, color = Moss); Text(product.name, fontWeight = FontWeight.SemiBold); Text(item.reason, color = Color.DarkGray, style = MaterialTheme.typography.bodySmall) } }
        }
    }
}

@Composable private fun AnalyzeScreen(ui: AppUiState, locale: String, upload: (ByteArray, String, String) -> Unit, onCompleted: () -> Unit) {
    val context = LocalContext.current
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri ?: return@rememberLauncherForActivityResult
        val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() } ?: return@rememberLauncherForActivityResult
        upload(bytes, "photo-${System.currentTimeMillis()}", context.contentResolver.getType(uri) ?: "image/jpeg")
    }
    val camera = rememberLauncherForActivityResult(ActivityResultContracts.TakePicturePreview()) { bitmap: Bitmap? ->
        bitmap ?: return@rememberLauncherForActivityResult
        val output = ByteArrayOutputStream(); bitmap.compress(Bitmap.CompressFormat.JPEG, 92, output)
        upload(output.toByteArray(), "camera-${System.currentTimeMillis()}.jpg", "image/jpeg")
    }
    LaunchedEffect(ui.report?.status) { if (ui.report?.status == "completed") onCompleted() }
    PageColumn {
        Overline(tr("analysis.localDemo", locale))
        Text(tr("analysis.letUsSeeYou", locale), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Text(tr("analysis.frontPhotoIntro", locale), color = Color.DarkGray)
        Spacer(Modifier.height(16.dp))
        ElevatedCard(colors = CardDefaults.elevatedCardColors(containerColor = Blush)) { Column(Modifier.padding(20.dp)) {
            Text(tr("analysis.goodPhoto", locale), fontWeight = FontWeight.Bold)
            Text("• ${tr("analysis.naturalLight", locale)}\n• ${tr("analysis.singleFace", locale)}\n• ${tr("analysis.avoidFilters", locale)}")
            Row(Modifier.padding(top = 16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) { Button(onClick = { camera.launch(null) }, enabled = ui.analysisStatus == null || ui.analysisStatus == "completed" || ui.analysisStatus == "failed") { Text(tr("analysis.camera", locale)) }; OutlinedButton(onClick = { picker.launch("image/*") }, enabled = ui.analysisStatus == null || ui.analysisStatus == "completed" || ui.analysisStatus == "failed") { Text(tr("analysis.choosePhoto", locale)) } }
        } }
        if (ui.analysisStatus != null) StatusCard(ui.analysisStatus, locale)
        ui.error?.let { Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 12.dp)) }
    }
}

@Composable private fun LibraryScreen(data: AppData, locale: String, toggle: (Int) -> Unit) = PageColumn {
    Overline(tr("library.discovery", locale)); Text(tr("library.title", locale), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold); Text(tr("library.description", locale), color = Color.DarkGray)
    SectionTitle(tr("catalog.pickedForYou", locale))
    data.products.forEach { ProductCard(it, it.id in data.state.savedProductIds, locale, toggle) }
    SectionTitle(tr("library.practice", locale))
    data.tutorials.forEach { tutorial -> OutlinedCard(Modifier.fillMaxWidth().padding(bottom = 10.dp)) { Column(Modifier.padding(14.dp)) { Text(tutorial.title, fontWeight = FontWeight.SemiBold); Text("${tutorial.creator} · ${tutorial.platform}", color = Color.DarkGray) } } }
}

@Composable private fun HistoryScreen(data: AppData, locale: String, onNew: () -> Unit) = PageColumn {
    Overline(tr("history.eyebrow", locale)); Text(tr("history.recent", locale), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold); Text(tr("history.description", locale), color = Color.DarkGray)
    Button(onClick = onNew, modifier = Modifier.padding(top = 16.dp)) { Text(tr("history.new", locale)) }
    if (data.state.analyses.isEmpty()) Text(tr("overview.notAnalyzed", locale), modifier = Modifier.padding(top = 24.dp)) else data.state.analyses.forEach { item -> OutlinedCard(Modifier.fillMaxWidth().padding(top = 12.dp)) { Column(Modifier.padding(16.dp)) { Text(item.field("title") ?: tr("report.localDemoAnalysis", locale), fontWeight = FontWeight.Bold); Text(item.field("createdAt") ?: tr("report.justGenerated", locale)); Text(item.field("summary") ?: "") } } }
}

@Composable private fun SavedScreen(data: AppData, locale: String, toggle: (Int) -> Unit) = PageColumn {
    Overline(tr("saved.eyebrow", locale)); Text(tr("saved.description", locale), style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
    val products = data.products.filter { it.id in data.state.savedProductIds }
    if (products.isEmpty()) { Text(tr("saved.emptyTitle", locale), modifier = Modifier.padding(top = 28.dp), fontWeight = FontWeight.Bold); Text(tr("saved.emptyDescription", locale)) } else products.forEach { ProductCard(it, true, locale, toggle) }
}

@Composable private fun ReportScreen(report: AnalysisJob?, data: AppData, locale: String, onBack: () -> Unit, onSave: (Int) -> Unit, onFeedback: (String) -> Unit) = PageColumn {
    TextButton(onClick = onBack) { Text("‹ ${tr("admin.back", locale)}") }
    Overline(tr("report.personalizedReport", locale)); Text(report?.result?.field("title") ?: tr("report.localDemoAnalysis", locale), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
    Text(report?.result?.field("summary") ?: tr("report.recommendationFallback", locale), color = Color.DarkGray)
    SectionTitle(tr("report.faceNotes", locale)); Text(report?.result?.field("faceNotes") ?: tr("report.recommendationFallback", locale))
    Text(tr("analysis.needAdjustment", locale), modifier = Modifier.padding(top = 16.dp), fontWeight = FontWeight.SemiBold)
    Row { TextButton(onClick = { onFeedback("too-yellow") }) { Text(tr("analysis.tooYellow", locale)) }; TextButton(onClick = { onFeedback("not-for-me") }) { Text(tr("analysis.notForMe", locale)) } }
    SectionTitle(tr("catalog.pickedForYou", locale)); data.products.forEach { ProductCard(it, it.id in data.state.savedProductIds, locale, onSave) }
}

@Composable private fun ProductCard(product: Product, saved: Boolean, locale: String, toggle: (Int) -> Unit) {
    ElevatedCard(Modifier.fillMaxWidth().padding(bottom = 10.dp)) { Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) { Column(Modifier.weight(1f)) { Text(product.brand.uppercase(), style = MaterialTheme.typography.labelSmall, color = Moss); Text(product.name, fontWeight = FontWeight.Bold); Text("${product.shade} · ${product.price}", color = Color.DarkGray) }; TextButton(onClick = { toggle(product.id) }) { Text(tr(if (saved) "common.removeSaved" else "common.save", locale)) } } }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable private fun SettingsSheet(settings: Settings, locale: String, update: (Settings) -> Unit, close: () -> Unit) {
    ModalBottomSheet(onDismissRequest = close) { Column(Modifier.padding(24.dp).padding(bottom = 32.dp)) {
        Text(tr("account.settings", locale), style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Text(settings.displayName, modifier = Modifier.padding(top = 12.dp), fontWeight = FontWeight.SemiBold)
        Text(tr("settings.language", locale), modifier = Modifier.padding(top = 20.dp))
        Row { FilterChip(selected = settings.language == "zh-CN", onClick = { update(settings.copy(language = "zh-CN")) }, label = { Text(tr("common.chinese", locale)) }); Spacer(Modifier.width(8.dp)); FilterChip(selected = settings.language == "en-US", onClick = { update(settings.copy(language = "en-US")) }, label = { Text(tr("common.english", locale)) }) }
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 16.dp)) { Text(tr("settings.keepByDefault", locale), Modifier.weight(1f)); Switch(settings.savePhotosForThreeDays, onCheckedChange = { update(settings.copy(savePhotosForThreeDays = it)) }) }
        Text(tr("settings.contentHint", locale), style = MaterialTheme.typography.bodySmall, color = Color.DarkGray)
    } }
}

@Composable private fun StatusCard(status: String, locale: String) = ElevatedCard(Modifier.fillMaxWidth().padding(top = 16.dp)) { Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) { if (status == "queued" || status == "running") CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp); Spacer(Modifier.width(12.dp)); Text("${tr("analysis.inProgress", locale)} · $status") } }
@Composable private fun FailurePanel(message: String, onRetry: () -> Unit, locale: String) = Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.Center) { Text(message, color = MaterialTheme.colorScheme.error); Button(onClick = onRetry, modifier = Modifier.padding(top = 12.dp)) { Text(tr("admin.refresh", locale)) } }
@Composable private fun PageColumn(content: @Composable ColumnScope.() -> Unit) = LazyColumn(Modifier.fillMaxSize().padding(horizontal = 20.dp), contentPadding = PaddingValues(vertical = 22.dp)) { item { Column(content = content) } }
@Composable private fun Overline(text: String) = Text(text, style = MaterialTheme.typography.labelSmall, color = Moss, fontWeight = FontWeight.Bold)
@Composable private fun SectionTitle(text: String) = Text(text, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 26.dp, bottom = 10.dp))
private fun JsonObject.field(name: String): String? = this[name]?.jsonPrimitive?.content
@Composable private fun tr(key: String, locale: String): String { val context = LocalContext.current; val localized = remember(locale) { val configuration = Configuration(context.resources.configuration); configuration.setLocale(java.util.Locale.forLanguageTag(locale)); context.createConfigurationContext(configuration) }; val id = remember(key) { context.resources.getIdentifier(key.replace('.', '_'), "string", context.packageName) }; return if (id == 0) "" else localized.getString(id) }
