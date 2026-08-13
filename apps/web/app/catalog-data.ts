import catalog from "../../../packages/catalog/catalog.json";
import type { CatalogProduct, TutorialLink } from "./v1-domain";

/** Compatibility export for the existing Web UI; source data is shared with API. */
export const products = catalog.products as CatalogProduct[];
export const tutorials = catalog.tutorials as TutorialLink[];
