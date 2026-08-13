import SwiftUI

@main struct VeylumiApp: App {
    @StateObject private var analysis = AnalysisViewModel(api: VeylumiAPIClient(baseURL: URL(string: "http://127.0.0.1:8787")!))
    var body: some Scene { WindowGroup { RootView().environmentObject(analysis) } }
}
