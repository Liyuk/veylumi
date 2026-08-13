import { Card, Select } from "@radix-ui/themes";
import { ArrowTopRightIcon, LockClosedIcon } from "@radix-ui/react-icons";
import { CatalogProduct, ProductMatch, TutorialLink } from "../v1-domain";
import { ProductLikeButton, TutorialCard } from "./ui";
import { useI18n } from "../i18n";

export function MatchedProductRow({ match, saved, onToggle }: { match: ProductMatch; saved: boolean; onToggle: () => void }) {
  const { t } = useI18n();
  const { product } = match;
  return <div className="product-row"><div className="product-swatch" style={{ background: product.color }} /><div className="product-info"><span>{product.type} · {product.brand} · {t("catalog.matchScore")} {match.score}%</span><strong>{product.name}</strong><small>{product.shade} · {product.skin} · {product.price}</small><em className="match-reason">{match.reason}</em><small className="match-caveat">{match.caveat}</small><a href={product.url} target="_blank" rel="noreferrer">{t("catalog.viewProduct")} <ArrowTopRightIcon /></a></div><ProductLikeButton saved={saved} className="save-button" onToggle={onToggle} /></div>;
}

export function CatalogCard({ product, saved, onToggle, match }: { product: CatalogProduct; saved: boolean; onToggle: () => void; match?: ProductMatch }) {
  const { t } = useI18n();
  return <Card className="catalog-card"><div className="catalog-swatch" style={{ background: product.color }}><ProductLikeButton saved={saved} onToggle={onToggle} /><span>{match ? `${product.type} · ${t("catalog.match")} ${match.score}%` : product.type}</span></div><div className="catalog-copy"><small>{product.brand} · {product.region}</small><h3>{product.name}</h3>{match ? <><p>{match.reason}</p><small>{match.caveat}</small></> : <p>{product.tone} · {product.skin}</p>}<a href={product.url} target="_blank" rel="noreferrer">{t("catalog.viewRealProduct")} <ArrowTopRightIcon /></a></div></Card>;
}

export function TutorialGrid({ items }: { items: TutorialLink[] }) {
  return <section className="tutorial-grid">{items.map((tutorial) => <TutorialCard key={tutorial.title} platform={tutorial.platform} title={tutorial.title} creator={tutorial.creator} tags={tutorial.tags} url={tutorial.url} />)}</section>;
}

export function CatalogNotice({ children }: { children: string }) {
  return <div className="catalog-note"><LockClosedIcon /><span>{children}</span></div>;
}

export function CatalogFilters({ referenceId, onReferenceChange, skin, onSkinChange, region, onRegionChange, products }: { referenceId: string; onReferenceChange: (value: string) => void; skin: "combination" | "dry" | "oily"; onSkinChange: (value: "combination" | "dry" | "oily") => void; region: "日韩" | "欧美" | "全部品牌"; onRegionChange: (value: "日韩" | "欧美" | "全部品牌") => void; products: CatalogProduct[] }) {
  const { t } = useI18n();
  return <div className="shade-match-controls"><Select.Root value={referenceId} onValueChange={onReferenceChange}><Select.Trigger aria-label={t("catalog.referenceProduct")} placeholder={t("catalog.referenceProduct")} /><Select.Content>{products.map((product) => <Select.Item key={product.id} value={String(product.id)}>{product.brand} · {product.shade}</Select.Item>)}</Select.Content></Select.Root><Select.Root value={skin} onValueChange={(value) => onSkinChange(value as typeof skin)}><Select.Trigger aria-label={t("settings.skinType")} /><Select.Content><Select.Item value="combination">{t("settings.combination")}</Select.Item><Select.Item value="dry">{t("settings.dry")}</Select.Item><Select.Item value="oily">{t("settings.oily")}</Select.Item></Select.Content></Select.Root><Select.Root value={region} onValueChange={(value) => onRegionChange(value as typeof region)}><Select.Trigger aria-label={t("catalog.market")} /><Select.Content><Select.Item value="全部品牌">{t("catalog.allMarkets")}</Select.Item><Select.Item value="日韩">{t("catalog.eastAsia")}</Select.Item><Select.Item value="欧美">{t("catalog.western")}</Select.Item></Select.Content></Select.Root></div>;
}
