# API contract and conformance fixtures

`openapi.yaml` defines the HTTP surface. `fixtures/` are stable, non-production envelopes which every client must decode: bootstrap, state, analysis job, and conflict. State remains a single resource: `POST /api/state` preserves legacy full-snapshot writes; `PATCH /api/state` accepts exactly one named operation and requires `If-Match`.
