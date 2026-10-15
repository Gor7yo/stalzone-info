"use client";

import { lotUnitPrice, MAX_UPGRADE, pickedQualities, qualityOf, QUALITY, upgradeOf, type Lot, type LotFilter } from "@/features/auction";
import { variantLabel, variantsOf } from "@/features/modules";
import { haptic } from "@/lib/telegram";
import styles from "./LotFilters.module.css";
import { UpgradeDial } from "./UpgradeDial";

export type DealFilter = "all" | "good" | "bad";

const LEVELS = Array.from({ length: MAX_UPGRADE + 1 }, (_, i) => i);

/**
 * Компактные фильтры артефакта/модуля: качество, шкала заточки (+0…+15) и выгодность.
 * Шкала показывает лучшую цену каждого уровня для выбранного качества.
 */
export function LotFilters({
  lots,
  filter,
  onFilter,
  deal,
  onDeal,
  dealCounts,
}: {
  lots: Lot[];
  filter: LotFilter;
  onFilter: (filter: LotFilter) => void;
  deal: DealFilter;
  onDeal: (deal: DealFilter) => void;
  dealCounts: { good: number; bad: number };
}) {
  const pick = (next: LotFilter) => {
    haptic.select();
    onFilter(next);
  };

  // выбранные качества: тап по чипу включает/выключает, «Все» — сброс
  const qualities = pickedQualities(filter);
  const toggleQuality = (q: number) => {
    const next = qualities.includes(q) ? qualities.filter((x) => x !== q) : [...qualities, q].sort((a, b) => a - b);
    pick({ ...filter, quality: null, qualities: next.length ? next : null });
  };

  // лучшая цена и число лотов на каждом уровне — с учётом выбранных качеств
  const byLevel = LEVELS.map((level) => {
    const list = lots.filter(
      (l) => upgradeOf(l.additional) === level && (!qualities.length || qualities.includes(qualityOf(l.additional) ?? -1)),
    );
    const prices = list.map(lotUnitPrice).filter((p) => p > 0);
    return { count: list.length, best: prices.length ? Math.min(...prices) : null };
  });
  const qualityCount = (q: number) => lots.filter((l) => qualityOf(l.additional) === q).length;
  // ключевые характеристики модуля в лотах — самые частые первыми
  const variants = variantsOf(lots);

  return (
    <div className={styles.panel}>
      {variants.length > 0 && (
        <div className={styles.row} role="radiogroup" aria-label="Ключевая характеристика модуля">
          <button
            type="button"
            className={styles.chip}
            aria-pressed={filter.variant == null}
            onClick={() => pick({ ...filter, variant: null })}
          >
            Любая
          </button>
          {variants.map((v) => (
            <button
              key={v}
              type="button"
              className={styles.chip}
              aria-pressed={filter.variant === v}
              onClick={() => pick({ ...filter, variant: filter.variant === v ? null : v })}
            >
              {variantLabel(v)}
            </button>
          ))}
        </div>
      )}

      <div className={styles.row} role="group" aria-label="Качество (можно несколько)">
        <button
          type="button"
          className={styles.chip}
          aria-pressed={!qualities.length}
          onClick={() => pick({ ...filter, quality: null, qualities: null })}
        >
          Все
        </button>
        {QUALITY.map((q, i) => (
          <button
            key={q.label}
            type="button"
            className={styles.chip}
            aria-pressed={qualities.includes(i)}
            data-empty={!qualityCount(i) || undefined}
            style={{ "--c": q.color } as React.CSSProperties}
            onClick={() => toggleQuality(i)}
          >
            <span className={styles.dot} />
            {q.short}
          </button>
        ))}
      </div>

      {/* у модулей заточки нет — вместо неё ключевая характеристика (ряд выше) */}
      {!variants.length && (
        <UpgradeDial
          levels={byLevel}
          value={filter.upgrades ?? []}
          onChange={(upgrades) => onFilter({ ...filter, upgrade: null, upgrades: upgrades.length ? upgrades : null })}
        />
      )}

      <div className={styles.deals} role="radiogroup" aria-label="Выгодность">
        {(
          [
            ["all", "Все лоты", null],
            ["good", "Выгодные", dealCounts.good],
            ["bad", "Дорогие", dealCounts.bad],
          ] as const
        ).map(([value, label, count]) => (
          <button
            key={value}
            type="button"
            data-kind={value}
            aria-pressed={deal === value}
            onClick={() => {
              haptic.select();
              onDeal(value);
            }}
          >
            {label}
            {count !== null && <span className="mono">{count}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
