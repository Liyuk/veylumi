# Monorepo migration

The root npm commands remain compatibility proxies for the Web application and local API. New code belongs in these boundaries:

- `apps/web`: React/Vinext UI.
- `services/api`: existing REST implementation, retained without route changes.
- `services/worker` and `services/database`: Worker and persistence boundaries.
- `packages/api-contract`: OpenAPI source and generated TypeScript shapes.
- `packages/domain`: reusable product and analysis models.
- `packages/i18n`: locale source plus platform resource generation.

Run `npm run i18n:generate` whenever a locale changes. The generator rejects key mismatches before it writes Android or iOS resources. Android and iOS source projects are deliberately dependency-light; native build validation requires a full Android SDK/Gradle installation and full Xcode, neither of which is available in this environment.
