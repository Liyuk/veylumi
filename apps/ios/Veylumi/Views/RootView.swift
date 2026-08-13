import SwiftUI
import PhotosUI

private let ink = Color(red: 0.16, green: 0.15, blue: 0.14)
private let blush = Color(red: 0.95, green: 0.84, blue: 0.80)
private let moss = Color(red: 0.32, green: 0.40, blue: 0.34)

struct RootView: View {
    @EnvironmentObject private var model: AnalysisViewModel
    @State private var showSettings = false
    var body: some View {
        TabView {
            OverviewScreen().tabItem { Label("navigation.overview".localized, systemImage: "house") }
            AnalyzeScreen().tabItem { Label("navigation.analyze".localized, systemImage: "camera") }
            LibraryScreen().tabItem { Label("navigation.library".localized, systemImage: "square.grid.2x2") }
            HistoryScreen().tabItem { Label("navigation.history".localized, systemImage: "clock") }
            SavedScreen().tabItem { Label("navigation.saved".localized, systemImage: "heart") }
        }
        .tint(ink)
        .sheet(isPresented: $showSettings) { SettingsScreen() }
        .overlay(alignment: .topTrailing) { Button { showSettings = true } label: { Image(systemName: "person.crop.circle").font(.title2).padding(12).background(.thinMaterial, in: Circle()) }.padding(.trailing, 12).accessibilityLabel("account.openMenu".localized) }
        .task { if model.snapshot == nil { await model.refresh() } }
    }
}

struct OverviewScreen: View {
    @EnvironmentObject private var model: AnalysisViewModel
    var body: some View { NavigationStack { Group { if model.isLoading { ProgressView() } else if let state = model.snapshot { ScrollView { VStack(alignment: .leading, spacing: 18) {
        Overline("overview.heroEyebrow".localized); Text("overview.goodMorning".localized + state.settings.displayName).font(.largeTitle.bold())
        Text("overview.heroDescription".localized).foregroundStyle(.secondary)
        VStack(alignment: .leading, spacing: 8) { Overline("overview.recommendedDirection".localized); Text(state.analyses.first?.text("title") ?? "overview.startWithOne".localized).font(.title2.bold()); Text(state.analyses.first?.text("summary") ?? "overview.lookDescription".localized); NavigationLink("overview.startAnalysis".localized) { AnalyzeScreen() }.buttonStyle(.borderedProminent).tint(ink) }.frame(maxWidth: .infinity, alignment: .leading).padding(20).background(blush, in: RoundedRectangle(cornerRadius: 24))
        Text("overview.nextStep".localized).font(.headline); NavigationLink { LibraryScreen() } label: { Label("overview.explore".localized, systemImage: "sparkles").frame(maxWidth: .infinity, alignment: .leading).padding().background(Color.white, in: RoundedRectangle(cornerRadius: 16)) }
    }.padding(20) } } else { ErrorState(message: model.errorMessage, retry: { await model.refresh() }) } }.navigationTitle("Veylumi") } }
}

struct AnalyzeScreen: View {
    @EnvironmentObject private var model: AnalysisViewModel
    @State private var photo: PhotosPickerItem?
    @State private var showReport = false
    var body: some View { NavigationStack { ScrollView { VStack(alignment: .leading, spacing: 18) {
        Overline("analysis.localDemo".localized); Text("analysis.letUsSeeYou".localized).font(.largeTitle.bold()); Text("analysis.frontPhotoIntro".localized).foregroundStyle(.secondary)
        VStack(alignment: .leading, spacing: 12) { Text("analysis.goodPhoto".localized).font(.headline); Text("• \("analysis.naturalLight".localized)\n• \("analysis.singleFace".localized)\n• \("analysis.avoidFilters".localized)"); PhotosPicker("analysis.choosePhoto".localized, selection: $photo, matching: .images).buttonStyle(.borderedProminent).tint(ink).disabled(model.status.isBusy) }.frame(maxWidth: .infinity, alignment: .leading).padding(20).background(blush, in: RoundedRectangle(cornerRadius: 24))
        StatusView(status: model.status)
        if let error = model.errorMessage { Text(error).foregroundStyle(.red) }
    }.padding(20) }.navigationTitle("navigation.analyze".localized).navigationDestination(isPresented: $showReport) { ReportScreen() }.onChange(of: photo) { _, selected in Task { await model.upload(selected) } }.onChange(of: model.status) { _, status in if case .completed = status { showReport = true } } } }
}

struct LibraryScreen: View {
    @EnvironmentObject private var model: AnalysisViewModel
    var body: some View { NavigationStack { ScrollView { VStack(alignment: .leading, spacing: 14) {
        Overline("library.discovery".localized); Text("library.title".localized).font(.largeTitle.bold()); Text("library.description".localized).foregroundStyle(.secondary); Text("catalog.pickedForYou".localized).font(.headline).padding(.top, 8)
        ForEach(model.products) { product in ProductCard(product: product, saved: model.snapshot?.savedProductIds.contains(product.id) == true) { Task { await model.toggleSaved(product.id) } }
        }
        Text("library.practice".localized).font(.headline).padding(.top, 12); ForEach(model.tutorials) { guide in Link(destination: URL(string: guide.url)!) { VStack(alignment: .leading) { Text(guide.title).fontWeight(.semibold); Text("\(guide.creator) · \(guide.platform)").font(.footnote).foregroundStyle(.secondary) }.frame(maxWidth: .infinity, alignment: .leading).padding().background(Color.white, in: RoundedRectangle(cornerRadius: 16)) } }
    }.padding(20) }.navigationTitle("navigation.library".localized) } }
}

struct HistoryScreen: View {
    @EnvironmentObject private var model: AnalysisViewModel
    var body: some View { NavigationStack { ScrollView { VStack(alignment: .leading, spacing: 14) { Overline("history.eyebrow".localized); Text("history.recent".localized).font(.largeTitle.bold()); Text("history.description".localized).foregroundStyle(.secondary); if let records = model.snapshot?.analyses, !records.isEmpty { ForEach(Array(records.enumerated()), id: \.offset) { _, record in VStack(alignment: .leading) { Text(record.text("title") ?? "report.localDemoAnalysis".localized).fontWeight(.semibold); Text(record.text("createdAt") ?? "report.justGenerated".localized).font(.footnote).foregroundStyle(.secondary); Text(record.text("summary") ?? "") }.frame(maxWidth: .infinity, alignment: .leading).padding().background(Color.white, in: RoundedRectangle(cornerRadius: 16)) } } else { ContentUnavailableView("overview.notAnalyzed".localized, systemImage: "clock") } }.padding(20) }.navigationTitle("navigation.history".localized) } }
}

struct SavedScreen: View {
    @EnvironmentObject private var model: AnalysisViewModel
    var body: some View { NavigationStack { ScrollView { VStack(alignment: .leading, spacing: 14) { Overline("saved.eyebrow".localized); Text("saved.description".localized).font(.title.bold()); let saved = model.products.filter { model.snapshot?.savedProductIds.contains($0.id) == true }; if saved.isEmpty { ContentUnavailableView("saved.emptyTitle".localized, systemImage: "heart") } else { ForEach(saved) { product in ProductCard(product: product, saved: true) { Task { await model.toggleSaved(product.id) } } } } }.padding(20) }.navigationTitle("navigation.saved".localized) } }
}

struct ReportScreen: View {
    @EnvironmentObject private var model: AnalysisViewModel
    var body: some View { ScrollView { VStack(alignment: .leading, spacing: 16) { Overline("report.personalizedReport".localized); Text(model.report?.result?["title"]?.text ?? "report.localDemoAnalysis".localized).font(.largeTitle.bold()); Text(model.report?.result?["summary"]?.text ?? "report.recommendationFallback".localized).foregroundStyle(.secondary); Text("report.faceNotes".localized).font(.headline).padding(.top, 8); Text(model.report?.result?["faceNotes"]?.text ?? "report.recommendationFallback".localized); Text("analysis.needAdjustment".localized).font(.headline).padding(.top, 8); HStack { Button("analysis.tooYellow".localized) { Task { await model.addFeedback("too-yellow") } }.buttonStyle(.bordered); Button("analysis.notForMe".localized) { Task { await model.addFeedback("not-for-me") } }.buttonStyle(.bordered) }; Text("catalog.pickedForYou".localized).font(.headline).padding(.top, 8); ForEach(model.products) { product in ProductCard(product: product, saved: model.snapshot?.savedProductIds.contains(product.id) == true) { Task { await model.toggleSaved(product.id) } } } }.padding(20) }.navigationTitle("report.personalizedReport".localized).navigationBarTitleDisplayMode(.inline) }
}

struct SettingsScreen: View {
    @EnvironmentObject private var model: AnalysisViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var apiURL = "http://127.0.0.1:8787"
    var body: some View { NavigationStack { Form { if let settings = model.snapshot?.settings { Section("settings.language".localized) { Picker("settings.language".localized, selection: Binding(get: { settings.language == "en-US" ? "en-US" : "zh-CN" }, set: { value in var next = settings; next.language = value; AppLanguage.code = value; Task { await model.updateSettings(next) } })) { Text("common.chinese".localized).tag("zh-CN"); Text("common.english".localized).tag("en-US") }.pickerStyle(.segmented) }; Section("settings.content".localized) { Toggle("settings.keepByDefault".localized, isOn: Binding(get: { settings.savePhotosForThreeDays }, set: { value in var next = settings; next.savePhotosForThreeDays = value; Task { await model.updateSettings(next) } })) }; Section("API") { TextField("http://127.0.0.1:8787", text: $apiURL).textInputAutocapitalization(.never).autocorrectionDisabled(); Button("admin.refresh".localized) { Task { await model.setAPIURL(apiURL) } } } } }.navigationTitle("account.settings".localized).toolbar { ToolbarItem(placement: .confirmationAction) { Button("common.close".localized) { dismiss() } } } } }
}

private struct ProductCard: View { let product: Product; let saved: Bool; let action: () -> Void; var body: some View { HStack { VStack(alignment: .leading, spacing: 3) { Text(product.brand.uppercased()).font(.caption.bold()).foregroundStyle(moss); Text(product.name).fontWeight(.semibold); Text("\(product.shade) · \(product.price)").font(.footnote).foregroundStyle(.secondary) }; Spacer(); Button(saved ? "common.removeSaved".localized : "common.save".localized, action: action).buttonStyle(.bordered) }.padding().background(Color.white, in: RoundedRectangle(cornerRadius: 16)) } }
private struct StatusView: View { let status: AnalysisViewModel.Status; var body: some View { switch status { case .idle: EmptyView(); case .queued: ProgressView("queued"); case .running: ProgressView("analysis.inProgress".localized); case .completed: Label("history.completed".localized, systemImage: "checkmark.circle.fill").foregroundStyle(moss); case .failed(let error): Text(error).foregroundStyle(.red) } } }
private struct ErrorState: View { let message: String?; let retry: () async -> Void; var body: some View { ContentUnavailableView { Label("API unavailable", systemImage: "wifi.exclamationmark") } description: { Text(message ?? "") } actions: { Button("admin.refresh".localized) { Task { await retry() } } } } }
private struct Overline: View { let text: String; init(_ text: String) { self.text = text }; var body: some View { Text(text).font(.caption.bold()).foregroundStyle(moss) } }

private enum AppLanguage { static var code: String { get { UserDefaults.standard.string(forKey: "veylumi.language") ?? "zh-CN" } set { UserDefaults.standard.set(newValue, forKey: "veylumi.language") } } }
extension String { var localized: String { let language = AppLanguage.code == "en-US" ? "en" : "zh-Hans"; let bundle = Bundle(path: Bundle.main.path(forResource: language, ofType: "lproj") ?? "") ?? .main; return bundle.localizedString(forKey: self, value: self, table: nil) } }
private extension AnalysisViewModel.Status { var isBusy: Bool { if case .queued = self { return true }; if case .running = self { return true }; return false } }
private extension Dictionary where Key == String, Value == JSONValue { func text(_ key: String) -> String? { self[key]?.text } }
