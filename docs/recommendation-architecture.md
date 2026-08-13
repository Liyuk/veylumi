# Recommendation architecture

## Deployment topology

`services/api` is the public gateway. `services/recommendation` is independently deployed onto compute infrastructure and receives traffic only through private networking.

```text
Clients → public API → private recommendation service → rank response
                    ↘ database / catalog
```

The public endpoint is `GET /api/recommendations`; clients never receive the recommendation service URL or its credential. The API uses a bounded deadline, short per-revision cache, and shared-rule fallback. This makes a compute outage a degraded recommendation, not an application outage.

## Contract and privacy

The public endpoint is defined in `packages/api-contract/openapi.yaml`. The internal endpoint is independently versioned in `packages/recommendation-contract/openapi.internal.yaml`.

The compute request contains only cosmetic context, catalog candidates, and aggregate interaction signals. It excludes user identifiers, email, raw feedback text, photos, image data, and generated previews. Results always include `ruleVersion`, `modelVersion`, `fallback`, and `cached`.

## What we adopted from open source references

| Reference | Principle adopted in Veylumi | Deliberately deferred |
| --- | --- | --- |
| Gorse | Separate serving from training and model/worker concerns; API-oriented ranking service | Its distributed master/worker cluster and dashboard |
| Feast | Training and serving should share feature definitions and be versioned | A feature store until features and offline training actually exist |
| Medusa | Stable domain modules and explicit contracts prevent application-layer coupling | Full plugin/module framework |
| Cal.com | Apps and reusable packages evolve together in a monorepo | Its full workspace/tooling stack until task scale requires it |
| implicit | Use implicit feedback for later collaborative filtering | Collaborative filtering before enough interaction history exists |

## Evolution

1. `rules-v1`: deterministic candidate filtering and rule ranking (current).
2. Materialize consented events into aggregate features; retain the same rank request/response contract.
3. Add offline model training and a model registry; run it in a separate worker deployment.
4. Add embeddings or GPU inference only when an evaluated model demonstrates improvement over the fallback.
