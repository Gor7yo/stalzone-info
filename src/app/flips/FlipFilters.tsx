"use client";

import { useState } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { SearchField } from "@/components/ui/SearchField";
import { CONFIDENCE, type Confidence } from "@/features/flips";
import { useFormat, useT } from "@/i18n/client";
import type { FlipSettings } from "@/lib/store";
import { haptic } from "@/lib/telegram";
import f from "./filters.module.css";

/** Готовые режимы: тапнул - и лента настроена. Категория и «только новые» не меняются. */
export const PRESETS = {
  best: { sort: "profit", minConfidence: "medium", minProfit: 20_000, budget: 0, fastOnly: false },
  fast: { sort: "fast", minConfidence: "medium", minProfit: 20_000, budget: 0, fastOnly: true },
  safe: { sort: "profit", minConfidence: "high", minProfit: 20_000, budget: 0, fastOnly: false },
  cheap: { sort: "pct", minConfidence: "medium", minProfit: 20_000, budget: 1_000_000, fastOnly: false },
} satisfies Record<string, Omit<FlipSettings, "group">>;
export type PresetId = keyof typeof PRESETS;
const PRESET_IDS = Object.keys(PRESETS) as PresetId[];
const PRESET_ICON: Record<PresetId, IconName> = { best: "flame", fast: "bolt", safe: "shieldCheck", cheap: "wallet" };

/** Какой режим сейчас включён; null - настроено вручную. */
export function activePreset(s: FlipSettings): PresetId | null {
  return (
    PRESET_IDS.find((id) => {
      const p = PRESETS[id];
      return (
        p.sort === s.sort &&
        p.minConfidence === s.minConfidence &&
        p.minProfit === s.minProfit &&
        p.budget === s.budget &&
        p.fastOnly === !!s.fastOnly
      );
    }) ?? null
  );
}

const SORT_KEYS: FlipSettings["sort"][] = ["profit", "fast", "pct", "hour"];
const SORT_ICON: Record<FlipSettings["sort"], IconName> = { profit: "trophy", fast: "bolt", pct: "market", hour: "clock" };
const BUDGETS = [0, 500_000, 1_000_000, 5_000_000, 10_000_000];
const PROFITS = [20_000, 50_000, 100_000, 500_000];
/** Надёжность светофором (цветной кружок): от надёжного к рискованному. */
const CONF_KEYS: Confidence[] = ["high", "medium", "low"];

/** Кружок цвета надёжности - зелёный, жёлтый, красный. */
export function ConfDot({ level }: { level: Confidence }) {
  return <span className={f.dot} style={{ background: CONFIDENCE[level].color }} aria-hidden />;
}

export interface GroupChip {
  id: string;
  icon: string;
  label: string;
  /** флипов в категории при остальных фильтрах */
  count: number;
}

/** Строка настройки: подпись простыми словами и чипы (на телефоне листаются вбок). */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={f.row}>
      <span className={f.rowLabel}>{label}</span>
      <div className={`chips ${f.rowChips}`}>{children}</div>
    </div>
  );
}

/**
 * Фильтры ленты - как можно проще: поиск, четыре режима-карточки («Лучшие», «Быстрые», «Без риска»,
 * «Недорогие») с числом флипов, а для желающих - «Настроить»: те же настройки обычными чипами.
 */
export function FlipFilters({
  settings,
  set,
  query,
  onQuery,
  onlyNew,
  onOnlyNew,
  newCount,
  groups,
  total,
  presetCounts,
  showFast,
  onReset,
}: {
  settings: FlipSettings;
  set: (patch: Partial<FlipSettings>) => void;
  query: string;
  onQuery: (q: string) => void;
  onlyNew: boolean;
  onOnlyNew: (v: boolean) => void;
  newCount: number;
  groups: GroupChip[];
  /** флипов при всех фильтрах, кроме категории - для чипа «Все» */
  total: number;
  /** сколько флипов покажет каждый режим (при текущих поиске и категории) */
  presetCounts: Record<PresetId, number>;
  /** у ленты есть оценка времени продажи */
  showFast: boolean;
  onReset: () => void;
}) {
  const t = useT().flips;
  const { formatShort } = useFormat();
  const preset = activePreset(settings);
  // вручную настроили - панель настроек сразу открыта, чтобы было видно, что включено
  const [open, setOpen] = useState(preset === null);
  const changed = preset !== "best" || settings.group !== null || onlyNew || !!query;

  const chip = (pressed: boolean, onClick: () => void, children: React.ReactNode, key?: string | number) => (
    <button key={key} type="button" className="chip" aria-pressed={pressed} onClick={onClick}>
      {children}
    </button>
  );

  return (
    <div className={f.filters}>
      <SearchField className={f.search} value={query} onChange={onQuery} placeholder={t.search} aria-label={t.search} />

      <div className={f.presets} role="radiogroup" aria-label={t.modesAria}>
        {PRESET_IDS.map((id) => (
          <button key={id} type="button" role="radio" aria-checked={preset === id} className={f.preset} onClick={() => set(PRESETS[id])}>
            <span className={f.presetIcon} data-preset={id} aria-hidden>
              <Icon name={PRESET_ICON[id]} size={18} strokeWidth={2} />
            </span>
            <b>{t.presets[id][0]}</b>
            <small>{t.presets[id][1]}</small>
            <span className={`mono ${f.presetCount}`}>{t.flipsCount(presetCounts[id])}</span>
          </button>
        ))}
      </div>

      <div className={f.bar}>
        <button
          type="button"
          className={f.tune}
          aria-expanded={open}
          aria-controls="flip-tune"
          onClick={() => {
            haptic.tap();
            setOpen((v) => !v);
          }}
        >
          <Icon name="sort" size={15} />
          {t.tune}
          {preset === null && <span className={f.customDot}>{t.custom}</span>}
          <Icon name="down" size={14} className={f.caret} />
        </button>
        {(newCount > 0 || onlyNew) && (
          <button
            type="button"
            className="chip"
            aria-pressed={onlyNew}
            onClick={() => {
              haptic.select();
              onOnlyNew(!onlyNew);
            }}
          >
            <Icon name="sparkle" size={15} />
            {t.onlyNew}
            <small className={f.chipCount}>{newCount}</small>
          </button>
        )}
        {changed && (
          <button type="button" className={f.reset} onClick={onReset}>
            {t.reset}
          </button>
        )}
      </div>

      {open && (
        <section id="flip-tune" className={`glass ${f.panel}`}>
          <Row label={t.sortLabel}>
            {SORT_KEYS.map((k) =>
              chip(
                settings.sort === k,
                () => set({ sort: k }),
                <>
                  <Icon name={SORT_ICON[k]} size={15} />
                  {t.sort[k]}
                </>,
                k,
              ),
            )}
          </Row>
          <Row label={t.budgetLabel}>
            {BUDGETS.map((v) => chip(settings.budget === v, () => set({ budget: v }), v ? formatShort(v) : t.anyBudget, v))}
            {/* своя сумма из старых настроек - тоже видна */}
            {settings.budget > 0 && !BUDGETS.includes(settings.budget) && chip(true, () => {}, formatShort(settings.budget))}
          </Row>
          <Row label={t.profitLabel}>
            {PROFITS.map((v) => chip(settings.minProfit === v, () => set({ minProfit: v }), formatShort(v), v))}
            {!PROFITS.includes(settings.minProfit) && chip(true, () => {}, formatShort(settings.minProfit))}
          </Row>
          <Row label={t.confLabel}>
            {CONF_KEYS.map((k) =>
              chip(
                settings.minConfidence === k,
                () => set({ minConfidence: k }),
                <>
                  <ConfDot level={k} />
                  {t.confShort[k]}
                </>,
                k,
              ),
            )}
          </Row>
          {showFast && (
            <Row label={t.speedLabel}>
              {chip(!settings.fastOnly, () => set({ fastOnly: false }), t.anySpeed)}
              {chip(
                !!settings.fastOnly,
                () => set({ fastOnly: true }),
                <>
                  <Icon name="clock" size={15} />
                  {t.fastOnly}
                </>,
              )}
            </Row>
          )}
        </section>
      )}

      {groups.length > 0 && (
        <div className="chips">
          {chip(
            !settings.group,
            () => set({ group: null }),
            <>
              {t.all}
              <small className={f.chipCount}>{total}</small>
            </>,
          )}
          {groups.map((g) => (
            <button
              key={g.id}
              type="button"
              className="chip"
              aria-pressed={settings.group === g.id}
              data-empty={g.count === 0 || undefined}
              onClick={() => set({ group: settings.group === g.id ? null : g.id })}
            >
              <span aria-hidden>{g.icon}</span> {g.label}
              <small className={f.chipCount}>{g.count}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
