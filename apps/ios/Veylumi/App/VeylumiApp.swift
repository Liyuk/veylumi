import SwiftUI

@main struct VeylumiApp: App {
    @StateObject private var analysis = AnalysisViewModel(api: VeylumiAPIClient(baseURL: URL(string: PlatformContract.apiBaseURL)!))
    var body: some Scene { WindowGroup { RootView().environmentObject(analysis) } }
}
