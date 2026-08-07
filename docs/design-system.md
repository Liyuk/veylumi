# Veylumi Design System

Veylumi uses **Radix Themes** as its accessible component and theming foundation. The Veylumi brand layer is intentionally separate so product identity can evolve without replacing interaction primitives.

## Layers

1. Radix Themes: component behavior, focus states, accessibility, and theme plumbing.
2. Veylumi brand tokens: warm neutral surfaces, terracotta action color, editorial typography, and an 8px spacing scale.
3. Product patterns: analysis report, product card, shade match, tutorial card, and photo retention notice.

## Brand rules

- Canvas is warm white; surfaces are white or warm blush.
- Terracotta is the only primary action color.
- Use 8px spacing increments: 4, 8, 12, 16, 24, 32, 48, 64.
- Use 8px, 12px, and 20px radii only. Pills are reserved for tags and statuses.
- Use borders for structure and shadows only for elevation.
- Body copy must remain readable. Avoid light-weight text below 12px.
- Product imagery and analysis imagery carry the emotional tone; controls stay quiet and consistent.

## Typography scale

The product uses one cross-platform UI family: SF Pro/PingFang SC on Apple platforms, Roboto/Noto Sans CJK on Android, Segoe UI/Microsoft YaHei on Windows, with system sans-serif fallbacks. Do not introduce page-specific web fonts or use Georgia/Times for UI headings.

| Role | Desktop | Mobile | Line height | Usage |
| --- | ---: | ---: | ---: | --- |
| Display | 64px | 44px | 1.05 | Homepage hero only |
| Page title | 44px | 34px | 1.14 | Page and report titles |
| Section title | 28px | 24px | 1.25 | Major content sections |
| Card title | 18px | 16px | 1.35 | Steps, tutorial and product groups |
| Body | 14px | 13px | 1.6 | Explanations and descriptions |
| Metadata | 12px | 12px | 1.5 | Dates, tags and secondary labels |

Essential content must not be reduced below the metadata scale. Micro labels such as the uppercase eyebrow are the only intentional exception.

## Component vocabulary

`Button` · `Card` · `Badge` · `Select` · `Tabs` · `Dialog` · `ProductCard` · `TutorialCard` · `AnalysisMetric` · `PhotoPreview`

The first six map to Radix Themes primitives. The last four are Veylumi product patterns and must consume the brand tokens rather than add one-off colors or spacing.
