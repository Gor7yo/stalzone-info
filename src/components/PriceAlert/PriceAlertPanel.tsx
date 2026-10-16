"use client";

import { useState } from "react";
import { useAlerts, useCreatePriceAlert, useDeletePriceAlert, type PriceAlert } from "@/features/alerts";
import { hasUpgradeFilter, pickedQualities, qualityLabel, upgradeLabel, type LotFilter } from "@/features/auction";
import { variantLabel as moduleLabel } from "@/features/modules";
import { usePro } from "@/features/pro";
import { useFormat, useLang, useT } from "@/i18n/client";
import type { Lang } from "@/i18n/lang";
import { isProRequired } from "@/lib/api";
import { parseGamePrice } from "@/lib/format";
import { REGIONS, type Region } from "@/lib/store";
import { haptic } from "@/lib/telegram";
import { Icon } from "../Icon";
import { ProTeaser } from "../Pro/Pro";
import styles from "./PriceAlert.module.css";
import { LoginCard, SentTo, TelegramLinkCard } from "../Account/AccountGate";

interface Props {
  itemId: string;
  itemName: string;
  region: Region;
  /** Вариант артефакта берём из текущего фильтра страницы */
  filter: LotFilter;
  /** У предмета есть ключевая характеристика (оружейный модуль) */
  variantItem?: boolean;
  bestPrice?: number | null;
  median?: number | null;
}

const regionLabel = (r: string) => REGIONS.find((x) => x.value === r)?.label ?? r.toUpperCase();

export const variantLabel = (
  a: {
    quality: number | null;
    qualities?: number[] | null;
    upgrade?: number | null;
    upgrades?: number[] | null;
    variant?: string | null;
  },
  lang: Lang = "ru",
) =>
  [a.variant ? moduleLabel(a.variant, lang) : "", qualityLabel(a, lang), upgradeLabel({ upgrade: a.upgrade ?? null, upgrades: a.upgrades })]
    .filter(Boolean)
    .join(" ");

/** «Сообщи в Telegram, когда этот предмет будет дешевле N». */
export function PriceAlertPanel({ itemId, itemName, region, filter, variantItem, bestPrice, median }: Props) {
  const t = useT().alerts;
  const lang = useLang();
  const { formatShort } = useFormat();
  const alerts = useAlerts();
  const { isPro } = usePro();
  const create = useCreatePriceAlert();
  const remove = useDeletePriceAlert();
  const [input, setInput] = useState("");

  if (alerts.pending) return null;
  if (!alerts.available) {
    return <LoginCard text={t.login} />;
  }
  if (!alerts.telegram) {
    return <TelegramLinkCard text={t.linkTelegram} />;
  }

  const mine = (alerts.data?.price ?? []).filter((a) => a.itemId === itemId);
  const price = parseGamePrice(input);
  const variant = variantLabel(filter, lang);
  // подсказки порога: чуть ниже лучшей цены и медианы
  const presets = [
    bestPrice ? { label: t.presetBest, value: Math.floor(bestPrice * 0.95) } : null,
    median ? { label: t.presetMedian(10), value: Math.floor(median * 0.9) } : null,
    median ? { label: t.presetMedian(20), value: Math.floor(median * 0.8) } : null,
  ].filter((p): p is { label: string; value: number } => Boolean(p && p.value > 0));

  const submit = () => {
    if (!price) return;
    haptic.tap("medium");
    create.mutate(
      {
        region,
        itemId,
        itemName,
        qualities: pickedQualities(filter).length ? pickedQualities(filter) : undefined,
        upgrades: filter.upgrades?.length ? filter.upgrades : undefined,
        variant: filter.variant || undefined,
        maxPrice: price,
      },
      {
        onSuccess: () => {
          haptic.notify("success");
          setInput("");
        },
        onError: () => haptic.notify("error"),
      },
    );
  };

  return (
    <div className={`glass ${styles.panel}`}>
      <div className={styles.head}>
        <Icon name="bell" size={18} />
        <span>
          {t.headBefore} {variant ? <b>{filter.variant ? variant : lang === "en" ? `“${variant}”` : `«${variant}»`}</b> : t.lot}{" "}
          {t.headAfter(regionLabel(region))}
        </span>
      </div>

      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          className={`mono ${styles.input}`}
          inputMode="decimal"
          enterKeyHint="done"
          autoComplete="off"
          placeholder={t.placeholder}
          aria-label={t.thresholdAria}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          data-invalid={(input && !price) || undefined}
        />
        <button type="submit" className="btn primary" disabled={!price || create.isPending}>
          {create.isPending ? "…" : t.notify}
        </button>
      </form>

      {presets.length > 0 && (
        <div className="chips">
          {presets.map((p) => (
            <button key={p.label} type="button" className="chip" onClick={() => setInput(formatShort(p.value))}>
              {p.label} · {formatShort(p.value)}
            </button>
          ))}
        </div>
      )}

      {variantItem && !filter.variant && <p className={styles.hint}>{t.pickVariant}</p>}
      {!pickedQualities(filter).length && !hasUpgradeFilter(filter) && <p className={styles.hint}>{isPro ? t.anyPro : t.anyFree}</p>}
      {isProRequired(create.error) ? (
        <ProTeaser compact title={t.moreAlerts} text={create.error!.message} />
      ) : (
        create.error && <p className={styles.error}>{create.error.message}</p>
      )}

      {alerts.sentTo && <SentTo telegram={alerts.sentTo} />}

      {mine.length > 0 && (
        <ul className={styles.list}>
          {mine.map((a) => (
            <AlertRow key={a.id} alert={a} pending={remove.isPending && remove.variables === a.id} onDelete={() => remove.mutate(a.id)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function AlertRow({ alert, pending, onDelete }: { alert: PriceAlert; pending: boolean; onDelete: () => void }) {
  const t = useT().alerts;
  const { formatShort } = useFormat();
  const variant = variantLabel(alert, useLang());
  return (
    <li className={styles.row}>
      <span className="pill">{regionLabel(alert.region)}</span>
      <span className={styles.rowText}>
        {variant || t.anyVariant} · {t.upTo} <b className="mono">{formatShort(alert.maxPrice)}</b>
      </span>
      <button
        type="button"
        className={`icon-btn ${styles.del}`}
        aria-label={t.delete}
        disabled={pending}
        onClick={() => {
          haptic.tap();
          onDelete();
        }}
      >
        <Icon name="close" size={16} />
      </button>
    </li>
  );
}
