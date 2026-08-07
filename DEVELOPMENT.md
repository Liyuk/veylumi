# Veylumi Development Constraints

These rules apply to all future Veylumi UI work.

## UI foundation

- Use Radix Themes for interactive primitives and theme context.
- New buttons use `Button`; new cards use `Card`; new labels/statuses use `Badge`; new selects use `Select`; new dialogs use `Dialog`.
- Do not introduce a new UI library without an explicit product decision.
- Do not create a second component styling system beside Radix Themes and the Veylumi brand layer.

## Brand layer

- Brand tokens live in `app/brand.css`.
- Product UI consumes `--veylumi-*` tokens instead of hard-coded colors, radii, shadows, or spacing.
- Keep the 8px spacing scale: 4, 8, 12, 16, 24, 32, 48, 64.
- Keep the radius scale: 8, 12, 20, and pill only for tags/statuses.
- Terracotta is the primary action color. New accent colors require a documented semantic reason.
- Use readable body text. Avoid thin text or sub-12px text for essential information.

## Product patterns

- Reuse `ProductRow`/product-card patterns for products.
- Reuse analysis metric and photo preview patterns for AI reports.
- Keep primary action, secondary action, quiet action, and destructive action visually distinct.
- Every interactive element needs a visible focus state and an accessible name.
- Every new responsive layout must be checked at desktop and mobile widths.

## Runtime and verification

- Run `npm run build` (or the project-local vinext CLI when the npm bin link is unavailable) after UI changes.
- Check the page in the local browser and inspect runtime errors before considering a UI task complete.
- Do not bypass Radix context by mounting a second Theme provider inside a feature; the page-level client Theme is the current vinext-compatible boundary.
