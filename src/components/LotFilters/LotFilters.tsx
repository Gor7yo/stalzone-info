"use client";

import { lotUnitPrice, MAX_UPGRADE, pickedQualities, qualities, qualityOf, upgradeOf, type Lot, type LotFilter } from "@/features/auction";
import { isUniqueKey, variantOf, variantsOf } from "@/features/modules";
import { useLang, useT } from "@/i18n/client";
import { haptic } from "@/lib/telegram";
import { ModuleStatPicker } from "../ModuleStat/ModuleStat";
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
  const t = useT().filters;
  const QUALITY = qualities(useLang());
  const pick = (next: LotFilter) => {
    haptic.select();
    onFilter(next);
  };

  // выбранные качества: тап по чипу включает/выключает, «Все» — сброс
  const picked = pickedQualities(filter);
  const toggleQuality = (q: number) => {
    const next = picked.includes(q) ? picked.filter((x) => x !== q) : [...picked, q].sort((a, b) => a - b);
    pick({ ...filter, quality: null, qualities: next.length ? next : null });
  };

  // лучшая цена и число лотов на каждом уровне — с учётом выбранных качеств
  const byLevel = LEVELS.map((level) => {
    const list = lots.filter(
      (l) => upgradeOf(l.additional) === level && (!picked.length || picked.includes(qualityOf(l.additional) ?? -1)),
    );
    const prices = list.map(lotUnitPrice).filter((p) => p > 0);
    return { count: list.length, best: prices.length ? Math.min(...prices) : null };
  });
  const qualityCount = (q: number) => lots.filter((l) => qualityOf(l.additional) === q).length;
  // ключевые характеристики модуля в лотах; число — лотов выбранного качества
  const allVariants = variantsOf(lots);
  // в меню — только уникальные ключевые (без простых статов вроде «Стрелка»)
  const variants = allVariants.filter(isUniqueKey);
  const variantCounts: Record<string, number> = {};
  for (const l of lots) {
    const v = variantOf(l.additional);
    if (v && (!picked.length || picked.includes(qualityOf(l.additional) ?? -1))) {
      variantCounts[v] = (variantCounts[v] ?? 0) + 1;
    }
  }

  return (
    <div className={styles.panel}>
      {variants.length > 0 && (
        <ModuleStatPicker
          variants={variants}
          counts={variantCounts}
          value={filter.variant ?? null}
          quality={picked.length === 1 ? picked[0] : null}
          onChange={(variant) => onFilter({ ...filter, variant })}
        />
      )}

      <div className={styles.row} role="group" aria-label={t.qualityAria}>
        <button
          type="button"
          className={styles.chip}
          aria-pressed={!picked.length}
          onClick={() => pick({ ...filter, quality: null, qualities: null })}
        >
          {t.all}
        </button>
        {QUALITY.map((q, i) => (
          <button
            key={q.color}
            type="button"
            className={styles.chip}
            aria-pressed={picked.includes(i)}
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
      {!allVariants.length && (
        <UpgradeDial
          levels={byLevel}
          value={filter.upgrades ?? []}
          onChange={(upgrades) => onFilter({ ...filter, upgrade: null, upgrades: upgrades.length ? upgrades : null })}
        />
      )}

      <div className={styles.deals} role="radiogroup" aria-label={t.dealAria}>
        {(
          [
            ["all", t.allLots, null],
            ["good", t.good, dealCounts.good],
            ["bad", t.bad, dealCounts.bad],
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
