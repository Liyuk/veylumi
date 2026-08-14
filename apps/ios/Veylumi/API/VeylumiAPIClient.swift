import Foundation

struct APIErrorBody: Codable { let code: String; let message: String }
struct APIEnvelope<T: Codable>: Codable { let ok: Bool; let data: T?; let error: APIErrorBody? }
struct Bootstrap: Codable { let token: String }
struct Product: Codable, Identifiable { let id: Int; let brand: String; let name: String; let type: String; let price: String; let tone: String; let shade: String; let region: String; let color: String; let url: String; let categoryId: String; let undertone: String; let finish: String; let skinTags: [String] }
struct Tutorial: Codable, Identifiable { let platform: String; let creator: String; let title: String; let tags: String; let url: String; let productIds: [Int]; var id: String { "\(platform)-\(title)" } }
struct UserSettings: Codable { var displayName: String; var email: String; var region: String; var language: String; var skinProfile: String; var undertone: String; var savePhotosForThreeDays: Bool; var personalizedTutorials: Bool }
struct StateSnapshot: Codable { var version: Int; var revision: Int; var authenticated: Bool; var user: [String: JSONValue]; var savedProductIds: [Int]; var analyses: [[String: JSONValue]]; var photos: [[String: JSONValue]]; var feedback: [[String: JSONValue]]; var settings: UserSettings }
struct AnalysisJob: Codable { let jobId: String; let status: String; let result: [String: JSONValue]?; let error: String? }
struct RecommendationItem: Codable, Identifiable { let productId: Int; let score: Int; let reason: String; let caveat: String; var id: Int { productId } }
struct RecommendationResponse: Codable { let items: [RecommendationItem]; let ruleVersion: Int; let modelVersion: String; let fallback: Bool; let cached: Bool; let degraded: String? }

enum APIError: LocalizedError {
    case unavailable(String), conflict(String)
    var errorDescription: String? { switch self { case .unavailable(let message), .conflict(let message): return message } }
}

final class VeylumiAPIClient {
    private var baseURL: URL
    private var token: String?
    init(baseURL: URL) { self.baseURL = baseURL }
    func setBaseURL(_ value: String) throws { guard let url = URL(string: value.trimmingCharacters(in: .whitespacesAndNewlines)) else { throw APIError.unavailable("Invalid API URL") }; baseURL = url; token = nil }
    func bootstrap() async throws { let value: Bootstrap = try await request("/api/bootstrap", method: "GET", authenticated: false); token = value.token }
    func state() async throws -> StateSnapshot { try await request("/api/state", method: "GET") }
    func products() async throws -> [Product] { try await request("/api/catalog/products", method: "GET") }
    func tutorials() async throws -> [Tutorial] { try await request("/api/catalog/tutorials", method: "GET") }
    func recommendations() async throws -> RecommendationResponse { try await request("/api/recommendations?limit=3", method: "GET") }
    func saveState(_ state: StateSnapshot) async throws -> StateSnapshot { try await request("/api/state", method: "POST", body: JSONEncoder().encode(state), headers: ["If-Match": String(state.revision)]) }
    func applyStateOperation(_ operation: [String: JSONValue], revision: Int) async throws -> StateSnapshot { try await request("/api/state", method: "PATCH", body: JSONEncoder().encode(operation), headers: ["If-Match": String(revision)]) }
    func analyze(imageData: String, filename: String, mimeType: String, size: Int, idempotencyKey: String = UUID().uuidString) async throws -> AnalysisJob { let input: [String: JSONValue] = ["imageData": .string(imageData), "filename": .string(filename), "mimeType": .string(mimeType), "size": .number(Double(size))]; return try await request("/api/analyze", method: "POST", body: JSONEncoder().encode(input), headers: ["Idempotency-Key": idempotencyKey]) }
    func analysisJob(_ id: String) async throws -> AnalysisJob { try await request("/api/analyze/\(id.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? id)", method: "GET") }
    func preview(_ id: String) async throws -> Data { var request = URLRequest(url: url("/api/analyze/\(id)/preview")); request.setValue("Bearer \(try await requiredToken())", forHTTPHeaderField: "Authorization"); let (data, response) = try await URLSession.shared.data(for: request); guard let http = response as? HTTPURLResponse, 200..<300 ~= http.statusCode else { throw APIError.unavailable("Preview unavailable") }; return data }
    private func url(_ path: String) -> URL { URL(string: path, relativeTo: baseURL)!.absoluteURL }
    private func requiredToken() async throws -> String { if token == nil { try await bootstrap() }; guard let token else { throw APIError.unavailable("Missing demo token") }; return token }
    private func request<T: Codable>(_ path: String, method: String, body: Data? = nil, headers: [String: String] = [:], authenticated: Bool = true) async throws -> T {
        var request = URLRequest(url: url(path)); request.httpMethod = method
        if authenticated { request.setValue("Bearer \(try await requiredToken())", forHTTPHeaderField: "Authorization") }
        headers.forEach { request.setValue($1, forHTTPHeaderField: $0) }
        if let body { request.httpBody = body; request.setValue("application/json", forHTTPHeaderField: "Content-Type") }
        let (data, response) = try await URLSession.shared.data(for: request)
        let envelope = try JSONDecoder().decode(APIEnvelope<T>.self, from: data)
        guard let http = response as? HTTPURLResponse, 200..<300 ~= http.statusCode, envelope.ok, let value = envelope.data else { if envelope.error?.code == "API_CONFLICT" { throw APIError.conflict(envelope.error?.message ?? "State changed remotely") }; throw APIError.unavailable(envelope.error?.message ?? "API request failed") }
        return value
    }
}

enum JSONValue: Codable { case string(String), number(Double), bool(Bool), array([JSONValue]), object([String: JSONValue]), null
    init(from decoder: Decoder) throws { let c = try decoder.singleValueContainer(); if c.decodeNil() { self = .null } else if let v = try? c.decode(Bool.self) { self = .bool(v) } else if let v = try? c.decode(String.self) { self = .string(v) } else if let v = try? c.decode(Double.self) { self = .number(v) } else if let v = try? c.decode([JSONValue].self) { self = .array(v) } else { self = .object(try c.decode([String: JSONValue].self)) } }
    func encode(to encoder: Encoder) throws { var c = encoder.singleValueContainer(); switch self { case .string(let v): try c.encode(v); case .number(let v): try c.encode(v); case .bool(let v): try c.encode(v); case .array(let v): try c.encode(v); case .object(let v): try c.encode(v); case .null: try c.encodeNil() } }
    var text: String? { if case .string(let value) = self { return value }; return nil }
}
