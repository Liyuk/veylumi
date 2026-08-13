# Recommendation compute service

This is a separately deployable internal service. It has no user-facing authentication and must be reachable only from `services/api` through private networking.

## Contract and data boundary

- Internal API: `packages/recommendation-contract/openapi.internal.yaml`
- Credential: `VEYLUMI_RECOMMENDATION_TOKEN` (required; do not use the public API token)
- Input is limited to cosmetic preferences, catalog candidates, and aggregated interaction signals.
- Never send a user ID, email, raw feedback text, photo, image data, or analysis image to this service.
- Responses identify `ruleVersion` and `modelVersion` so production results are traceable.

## Run locally

```bash
VEYLUMI_RECOMMENDATION_TOKEN=dev-internal-token npm run recommendation:local
VEYLUMI_RECOMMENDATION_URL=http://127.0.0.1:8790 \
VEYLUMI_RECOMMENDATION_TOKEN=dev-internal-token \
npm run api:local
```

The API has a 700ms default deadline and returns a deterministic shared-rule fallback if this service is unhealthy or unavailable.

## Deploy

Build from repository root so the shared contract is in Docker's build context:

```bash
docker build -f services/recommendation/Dockerfile -t veylumi-recommendation .
docker run -p 8790:8790 -e VEYLUMI_RECOMMENDATION_TOKEN=replace-me veylumi-recommendation
```

CPU is sufficient for `rules-v1`. A later model worker can use GPU resources without changing the public API or the API-to-service contract.
