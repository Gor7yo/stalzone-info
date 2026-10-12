"use client";

import { useState } from "react";
import { useAlerts, useCreatePriceAlert, useDeletePriceAlert, type PriceAlert } from "@/features/alerts";
import { hasUpgradeFilter, pickedQualities, qualityLabel, upgradeLabel, type LotFilter } from "@/features/auction";
import { usePro } from "@/features/pro";
import { isProRequired } from "@/lib/api";
import { formatShort, parseGamePrice } from "@/lib/format";
import { REGIONS, type Region } from "@/lib/store";
import { haptic } from "@/lib/telegram";
import { Icon } from "../Icon";
import { ProTeaser } from "../Pro/Pro";
import styles from "./PriceAlert.module.css";
import { LinkedAs, TelegramLink } from "./TelegramLink";

interface Props {
  itemId: string;
  itemName: string;
  region: Region;
  /** Вариант артефакта берём из текущего фильтра страницы */
  filter: LotFilter;
  bestPrice?: number | null;
  median?: number | null;
}

const regionLabel = (r: string) => REGIONS.find((x) => x.value === r)?.label ?? r.toUpperCase();

export const variantLabel = (a: {
  quality: number | null;
  qualities?: number[] | null;
  upgrade?: number | null;
  upgrades?: number[] | null;
}) =>
  [qualityLabel(a), upgradeLabel({ upgrade: a.upgrade ?? null, upgrades: a.upgrades })].filter(Boolean).join(" ");

/** «Сообщи в Telegram, когда этот предмет будет дешевле N». */
export function PriceAlertPanel({ itemId, itemName, region, filter, bestPrice, median }: Props) {
  const alerts = useAlerts();
  const { isPro } = usePro();
  const create = useCreatePriceAlert();
  const remove = useDeletePriceAlert();
  const [input, setInput] = useState("");

  if (!alerts.available) {
    return <TelegramLink text="Уведомления о цене приходят в Telegram-бота. Привяжите Telegram — это один клик в боте, без пароля." />;
  }

  const mine = (alerts.data?.price ?? []).filter((a) => a.itemId === itemId);
  const price = parseGamePrice(input);
  const variant = variantLabel(filter);
  // подсказки порога: чуть ниже лучшей цены и медианы
  const presets = [
    bestPrice ? { label: "−5% от лучшей", value: Math.floor(bestPrice * 0.95) } : null,
    median ? { label: "−10% от медианы", value: Math.floor(median * 0.9) } : null,
    median ? { label: "−20% от медианы", value: Math.floor(median * 0.8) } : null,
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
          Сообщить в Telegram, когда {variant ? <b>«{variant}»</b> : "лот"} на {regionLabel(region)} будет дешевле
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
          placeholder="например 4,5кк"
          aria-label="Порог цены за штуку"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          data-invalid={(input && !price) || undefined}
        />
        <button type="submit" className="btn primary" disabled={!price || create.isPending}>
          {create.isPending ? "…" : "Уведомить"}
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

      {!pickedQualities(filter).length && !hasUpgradeFilter(filter) && (
        <p className={styles.hint}>
          {isPro
            ? "Без фильтра сработает на любой вариант. Качество и заточку выберите в фильтре выше."
            : "Сработает на любое качество и заточку. Точный вариант и до 20 алертов — в Pro."}
        </p>
      )}
      {isProRequired(create.error) ? (
        <ProTeaser compact title="Больше алертов" text={create.error!.message} />
      ) : (
        create.error && <p className={styles.error}>{create.error.message}</p>
      )}

      {alerts.linkedAs && <LinkedAs session={alerts.linkedAs} />}

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
  const variant = variantLabel(alert);
  return (
    <li className={styles.row}>
      <span className="pill">{regionLabel(alert.region)}</span>
      <span className={styles.rowText}>
        {variant || "любой вариант"} · до <b className="mono">{formatShort(alert.maxPrice)}</b>
      </span>
      <button
        type="button"
        className={`icon-btn ${styles.del}`}
        aria-label="Удалить алерт"
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
