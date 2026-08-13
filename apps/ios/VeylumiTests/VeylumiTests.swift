import XCTest
@testable import Veylumi
final class VeylumiTests: XCTestCase { func testAnalysisStatusValuesAreStable() { XCTAssertEqual(AnalysisJob(jobId: "id", status: "queued", result: nil, error: nil).status, "queued") } }
