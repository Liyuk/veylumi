import { Button } from "@radix-ui/themes";
import { ArrowRightIcon, ArrowTopRightIcon, CheckCircledIcon, HeartFilledIcon, HeartIcon } from "@radix-ui/react-icons";
import { useI18n } from "../i18n";

type ProductLikeButtonProps = {
  saved: boolean;
  onToggle: () => void;
  label?: string;
  className?: string;
};

export function ProductLikeButton({ saved, onToggle, label = "商品", className = "catalog-heart" }: ProductLikeButtonProps) {
  const { t } = useI18n();
  return <Button variant="ghost" className={className} aria-label={saved ? `${t("common.removeSaved")}${label}` : `${t("common.save")}${label}`} onClick={onToggle}>{saved ? <HeartFilledIcon /> : <HeartIcon />}</Button>;
}

export function Metric({ label, value, score }: { label: string; value: string; score?: string }) {
  return <div className="metric"><small>{label}</small><strong>{value}</strong>{score && <span>{score}</span>}</div>;
}

export function PlanStep({ n, title, detail }: { n: string; title: string; detail: string }) {
  return <div className="plan-step"><b>{n}</b><div><strong>{title}</strong><p>{detail}</p></div><ArrowRightIcon /></div>;
}

export function CheckItem({ title, text }: { title: string; text: string }) {
  return <div className="check-item"><CheckCircledIcon /><div><strong>{title}</strong><p>{text}</p></div></div>;
}

export function TutorialCard({ platform, title, creator, tags, url }: { platform: string; title: string; creator: string; tags: string; url: string }) {
  return <a className="tutorial-card" href={url} target="_blank" rel="noreferrer"><span>{platform}</span><h3>{title}</h3><p>{creator} · {tags}</p><b>打开教程 <ArrowTopRightIcon /></b></a>;
}
