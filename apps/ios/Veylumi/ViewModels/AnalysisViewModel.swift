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
        guard data.count <= PlatformContract.maxUploadBytes else { status = .failed("Please choose an image smaller than 10 MB."); return }
        let mimeType = data.starts(with: [0xFF, 0xD8]) ? "image/jpeg" : data.starts(with: [0x52, 0x49, 0x46, 0x46]) ? "image/webp" : "image/png"
        guard PlatformContract.mimeTypes.contains(mimeType) else { status = .failed("Unsupported image format."); return }
        do { let job = try await api.analyze(imageData: "data:\(mimeType);base64,\(data.base64EncodedString())", filename: "photo-\(Int(Date().timeIntervalSince1970))", mimeType: mimeType, size: data.count); status = .queued; try await poll(job) } catch { status = .failed(error.localizedDescription); errorMessage = error.localizedDescription }
    }
    func toggleSaved(_ productID: Int) async { await applyOperation(["operation": .string("toggleSavedProduct"), "productId": .number(Double(productID))]) }
    func updateSettings(_ settings: UserSettings) async {
        UserDefaults.standard.set(settings.language, forKey: "veylumi.language")
        guard let value = try? JSONDecoder().decode([String: JSONValue].self, from: JSONEncoder().encode(settings)) else { return }
        await applyOperation(["operation": .string("updateSettings"), "settings": .object(value)])
    }
    func addFeedback(_ kind: String) async { await applyOperation(["operation": .string("addFeedback"), "feedback": .object(["kind": .string(kind)])]) }
    func setAPIURL(_ value: String) async { do { try api.setBaseURL(value); await refresh() } catch { errorMessage = error.localizedDescription } }
    private func applyOperation(_ operation: [String: JSONValue]) async {
        guard let snapshot else { return }
        do { self.snapshot = try await api.applyStateOperation(operation, revision: snapshot.revision) }
        catch APIError.conflict { do { let remote = try await api.state(); self.snapshot = try await api.applyStateOperation(operation, revision: remote.revision) } catch { errorMessage = error.localizedDescription } }
        catch { errorMessage = error.localizedDescription }
    }
    private func poll(_ initial: AnalysisJob) async throws {
        var job = initial
        let deadline = Date().addingTimeInterval(TimeInterval(PlatformContract.pollDeadlineMs) / 1000); while job.status == "queued" || job.status == "running" { guard Date() < deadline else { throw APIError.unavailable("Analysis timed out.") }; status = job.status == "queued" ? .queued : .running; try await Task.sleep(nanoseconds: PlatformContract.pollIntervalNanoseconds); job = try await api.analysisJob(job.jobId) }
        if job.status == "completed" { report = job; status = .completed; await refresh() } else { status = .failed(job.error ?? "Analysis failed") }
    }
}
