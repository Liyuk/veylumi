import Foundation
import PhotosUI
import SwiftUI

@MainActor final class AnalysisViewModel: ObservableObject {
    enum Status: Equatable { case idle, queued, running, completed, failed(String) }
    @Published private(set) var status: Status = .idle
    @Published private(set) var snapshot: StateSnapshot?
    @Published private(set) var products: [Product] = []
    @Published private(set) var tutorials: [Tutorial] = []
    @Published private(set) var report: AnalysisJob?
    @Published private(set) var errorMessage: String?
    @Published private(set) var isLoading = true
    private let api: VeylumiAPIClient
    init(api: VeylumiAPIClient) { self.api = api; Task { await refresh() } }

    func refresh() async {
        isLoading = true; errorMessage = nil
        do { async let state = api.state(); async let catalog = api.products(); async let guides = api.tutorials(); snapshot = try await state; products = try await catalog; tutorials = try await guides }
        catch { errorMessage = error.localizedDescription }
        isLoading = false
    }
    func upload(_ item: PhotosPickerItem?) async {
        guard let item, let data = try? await item.loadTransferable(type: Data.self) else { return }
        guard data.count <= 10 * 1024 * 1024 else { status = .failed("Please choose an image smaller than 10 MB."); return }
        let mimeType = data.starts(with: [0xFF, 0xD8]) ? "image/jpeg" : data.starts(with: [0x52, 0x49, 0x46, 0x46]) ? "image/webp" : "image/png"
        do { let job = try await api.analyze(imageData: "data:\(mimeType);base64,\(data.base64EncodedString())", filename: "photo-\(Int(Date().timeIntervalSince1970))", mimeType: mimeType, size: data.count); status = .queued; try await poll(job) } catch { status = .failed(error.localizedDescription); errorMessage = error.localizedDescription }
    }
    func toggleSaved(_ productID: Int) async { await save { state in var next = state; next.savedProductIds = state.savedProductIds.contains(productID) ? state.savedProductIds.filter { $0 != productID } : state.savedProductIds + [productID]; return next } }
    func updateSettings(_ settings: UserSettings) async { UserDefaults.standard.set(settings.language, forKey: "veylumi.language"); await save { state in var next = state; next.settings = settings; next.user["displayName"] = .string(settings.displayName); next.user["email"] = .string(settings.email); return next } }
    func addFeedback(_ kind: String) async { await save { state in var next = state; next.feedback.append(["id": .string(UUID().uuidString), "kind": .string(kind), "createdAt": .string(ISO8601DateFormatter().string(from: Date()))]); return next } }
    func setAPIURL(_ value: String) async { do { try api.setBaseURL(value); await refresh() } catch { errorMessage = error.localizedDescription } }
    private func save(_ transform: (StateSnapshot) -> StateSnapshot) async {
        guard let snapshot else { return }; let local = transform(snapshot)
        do { self.snapshot = try await api.saveState(local) }
        catch APIError.conflict { do { let remote = try await api.state(); var merged = transform(remote); merged.savedProductIds = Array(Set(remote.savedProductIds + local.savedProductIds)).sorted(); self.snapshot = try await api.saveState(merged) } catch { errorMessage = error.localizedDescription } }
        catch { errorMessage = error.localizedDescription }
    }
    private func poll(_ initial: AnalysisJob) async throws {
        var job = initial
        while job.status == "queued" || job.status == "running" { status = job.status == "queued" ? .queued : .running; try await Task.sleep(for: .milliseconds(900)); job = try await api.analysisJob(job.jobId) }
        if job.status == "completed" { report = job; status = .completed; await refresh() } else { status = .failed(job.error ?? "Analysis failed") }
    }
}
