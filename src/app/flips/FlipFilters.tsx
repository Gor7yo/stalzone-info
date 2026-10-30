"use client";

import { useRef, useState } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { SearchField } from "@/components/ui/SearchField";
import { CONFIDENCE, type Confidence } from "@/features/flips";
import { useFormat, useT } from "@/i18n/client";
import type { FlipSettings } from "@/lib/store";
import { haptic } from "@/lib/telegram";
import f from "./filters.module.css";

/** Пороги прибыли (шкала прицела): столбик i - флипы с прибылью от PROFIT[i] до PROFIT[i + 1]. */
export const PROFIT_STOPS = [
  20_000, 30_000, 50_000, 75_000, 100_000, 150_000, 250_000, 400_000, 600_000, 1_000_000, 1_500_000, 2_500_000, 4_000_000,
];
/** Потолки выкупа: столбик i - выкуп от BUDGET[i - 1] до BUDGET[i]; последний - «любой». */
export const BUDGET_STOPS = [
  100_000,
  250_000,
  500_000,
  1_000_000,
  2_000_000,
  3_000_000,
  5_000_000,
  7_500_000,
  10_000_000,
  15_000_000,
  25_000_000,
  Infinity,
];

/** Столбик прибыли для флипа; -1 - ниже первого порога. */
export const profitBucket = (v: number) => PROFIT_STOPS.findLastIndex((s) => v >= s);
export const budgetBucket = (v: number) => BUDGET_STOPS.findIndex((s) => v <= s);

/** Где стоит прицел при текущих настройках (своя сумма из старых настроек - на ближайшем делении). */
const profitIndex = (minProfit: number) => Math.max(0, profitBucket(minProfit));
const budgetIndex = (budget: number) => (budget ? Math.max(0, budgetBucket(budget)) : BUDGET_STOPS.length - 1);

const SORT_KEYS: FlipSettings["sort"][] = ["profit", "pct", "hour", "fast"];
const SORT_ICON: Record<FlipSettings["sort"], IconName> = { profit: "trophy", pct: "market", hour: "clock", fast: "bolt" };
const CONF_KEYS: Confidence[] = ["low", "medium", "high"];

export interface GroupChip {
  id: string;
  icon: string;
  label: string;
  /** флипов в категории при остальных фильтрах */
  count: number;
}

/**
 * «Прицел»: гистограмма флипов по шкале и визир, который тянут пальцем или мышью (или стрелками).
 * min - в прицеле всё правее визира (прибыль от), max - левее (выкуп до).
 */
function Scope({
  label,
  hint,
  value,
  counts,
  index,
  mode,
  ticks,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  counts: number[];
  index: number;
  mode: "min" | "max";
  ticks: [string, string, string];
  onChange: (index: number) => void;
}) {
  const t = useT().flips;
  const ref = useRef<HTMLDivElement>(null);
  // какой палец/мышь тащит визир; захват указателя - по возможности (старые WebView его не умеют)
  const dragging = useRef<number | null>(null);
  const n = counts.length;
  const max = Math.max(1, ...counts);
  const inside = (i: number) => (mode === "min" ? i >= index : i <= index);
  const caught = counts.reduce((s, c, i) => s + (inside(i) ? c : 0), 0);
  const move = (i: number) => {
    const next = Math.min(n - 1, Math.max(0, i));
    if (next !== index) onChange(next);
  };
  const at = (x: number) => {
    const r = ref.current?.getBoundingClientRect();
    return r ? Math.floor(((x - r.left) / r.width) * n) : index;
  };
  // визир - на границе: у «от» слева от выбранного столбика, у «до» справа
  const cut = ((mode === "min" ? index : index + 1) / n) * 100;

  return (
    <div className={f.scope} title={hint}>
      <div className={f.scopeHead}>
        <span>{label}</span>
        <b className="mono">{value}</b>
        <small className="mono">{t.flipsCount(caught)}</small>
      </div>
      <div
        ref={ref}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={n - 1}
        aria-valuenow={index}
        aria-valuetext={`${value}, ${t.flipsCount(caught)}`}
        className={f.bars}
        data-mode={mode}
        style={{ "--cut": `${cut}%` } as React.CSSProperties}
        onPointerDown={(e) => {
          dragging.current = e.pointerId;
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            /* без захвата визир тянется, пока указатель над шкалой */
          }
          move(at(e.clientX));
        }}
        onPointerMove={(e) => {
          if (dragging.current === e.pointerId) move(at(e.clientX));
        }}
        onPointerUp={() => (dragging.current = null)}
        onPointerCancel={() => (dragging.current = null)}
        onKeyDown={(e) => {
          const step = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0;
          if (!step) return;
          e.preventDefault();
          move(index + step);
        }}
      >
        {counts.map((c, i) => (
          <span
            key={i}
            data-on={inside(i) || undefined}
            // корень - чтобы редкие дорогие флипы не терялись рядом с горой дешёвых
            style={{ height: c ? `${14 + Math.sqrt(c / max) * 86}%` : "5%" }}
          />
        ))}
        <i className={f.cut} aria-hidden />
      </div>
      <div className={`mono ${f.ticks}`} aria-hidden>
        {ticks.map((x) => (
          <span key={x}>{x}</span>
        ))}
      </div>
    </div>
  );
}

/** Надёжность «сигналом»: горящие палочки - уровни, которые в ленте. Нажал на палочку - от неё и выше. */
function SignalPicker({
  value,
  counts,
  onChange,
}: {
  value: Confidence;
  counts: Record<Confidence, number>;
  onChange: (v: Confidence) => void;
}) {
  const t = useT().flips;
  return (
    <div className={f.block} title={t.confHint}>
      <span className={f.blockTitle}>{t.confPill}</span>
      <div className={f.signal} role="radiogroup" aria-label={t.confPill}>
        {CONF_KEYS.map((k, i) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={value === k}
            aria-label={t.confOptions[k][0]}
            title={`${t.confOptions[k][0]}: ${t.confOptions[k][1]}`}
            data-on={CONFIDENCE[k].rank >= CONFIDENCE[value].rank || undefined}
            style={{ "--c": CONFIDENCE[k].color, "--h": `${16 + i * 12}px` } as React.CSSProperties}
            onClick={() => onChange(k)}
          >
            <span />
            <small className="mono">{counts[k]}</small>
          </button>
        ))}
      </div>
      <b className={f.blockValue}>{t.confShort[value]}</b>
    </div>
  );
}

/**
 * Фильтры ленты - «пульт» ПДА: прицелы по прибыли и выкупу с гистограммой флипов,
 * надёжность сигналом, режим сортировки, огоньки «за сутки» и «новые», категории с числом флипов.
 * На телефоне пульт свёрнут в строку-сводку и раскрывается по нажатию.
 */
export function FlipFilters({
  settings,
  set,
  defaults,
  query,
  onQuery,
  onlyNew,
  onOnlyNew,
  newCount,
  groups,
  total,
  shown,
  overall,
  profitHist,
  budgetHist,
  confCounts,
  showFast,
  onReset,
}: {
  settings: FlipSettings;
  set: (patch: Partial<FlipSettings>) => void;
  defaults: FlipSettings;
  query: string;
  onQuery: (q: string) => void;
  onlyNew: boolean;
  onOnlyNew: (v: boolean) => void;
  newCount: number;
  groups: GroupChip[];
  /** флипов при всех фильтрах, кроме категории - для чипа «Все» */
  total: number;
  /** в прицеле: столько флипов в ленте из overall */
  shown: number;
  overall: number;
  /** флипы по делениям шкал при остальных фильтрах */
  profitHist: number[];
  budgetHist: number[];
  confCounts: Record<Confidence, number>;
  /** у ленты есть оценка времени продажи */
  showFast: boolean;
  onReset: () => void;
}) {
  const t = useT().flips;
  const { formatShort } = useFormat();
  const [open, setOpen] = useState(false);

  const changed =
    settings.minProfit !== defaults.minProfit ||
    settings.budget !== defaults.budget ||
    settings.minConfidence !== defaults.minConfidence ||
    settings.group !== defaults.group ||
    !!settings.fastOnly ||
    onlyNew ||
    !!query;
  const budgetValue = settings.budget ? formatShort(settings.budget) : t.anyBudget;

  const led = (label: string, on: boolean, onClick: () => void, title?: string, count?: number) => (
    <button type="button" className={f.led} aria-pressed={on} title={title} onClick={onClick}>
      <i aria-hidden />
      {label}
      {count !== undefined && <b className="mono">{count}</b>}
    </button>
  );

  return (
    <div className={f.filters}>
      <SearchField className={f.search} value={query} onChange={onQuery} placeholder={t.search} aria-label={t.search} />

      <section className={f.console} data-open={open || undefined} aria-label={t.consoleTitle}>
        <span className={f.frame} aria-hidden />
        <header className={f.head}>
          <button
            type="button"
            className={f.headToggle}
            aria-expanded={open}
            aria-controls="flip-console"
            onClick={() => {
              haptic.tap();
              setOpen((v) => !v);
            }}
          >
            <span className={f.kicker}>
              <i aria-hidden />
              {t.consoleTitle}
            </span>
            <span className={f.sight}>
              <b className="mono">{shown}</b>
              <span className="mono">/{overall}</span>
              <small>{t.inSight}</small>
            </span>
            {/* свёрнутый пульт на телефоне: настройки одной строкой */}
            <span className={`mono ${f.readout}`}>
              ≥{formatShort(settings.minProfit)} · ≤{budgetValue} · {t.confShort[settings.minConfidence]} · {t.sort[settings.sort][0]}
            </span>
            <Icon name="down" size={16} className={f.caret} />
          </button>
          {changed && (
            <button type="button" className={f.reset} onClick={onReset}>
              <Icon name="undo" size={13} />
              {t.reset}
            </button>
          )}
        </header>

        <div id="flip-console" className={f.body}>
          <div className={f.scopes}>
            <Scope
              label={t.profitPill}
              hint={t.profitHint}
              value={formatShort(settings.minProfit)}
              counts={profitHist}
              index={profitIndex(settings.minProfit)}
              mode="min"
              ticks={[formatShort(PROFIT_STOPS[0]), formatShort(PROFIT_STOPS[6]), `${formatShort(PROFIT_STOPS.at(-1) ?? 0)}+`]}
              onChange={(i) => set({ minProfit: PROFIT_STOPS[i] })}
            />
            <Scope
              label={t.budgetPill}
              hint={t.budgetHint}
              value={budgetValue}
              counts={budgetHist}
              index={budgetIndex(settings.budget)}
              mode="max"
              ticks={[formatShort(BUDGET_STOPS[0]), formatShort(BUDGET_STOPS[5]), "∞"]}
              onChange={(i) => set({ budget: i === BUDGET_STOPS.length - 1 ? 0 : BUDGET_STOPS[i] })}
            />
          </div>

          <div className={f.controls}>
            <SignalPicker value={settings.minConfidence} counts={confCounts} onChange={(minConfidence) => set({ minConfidence })} />

            <div className={`${f.block} ${f.modeBlock}`}>
              <span className={f.blockTitle}>{t.sortTitle}</span>
              <div className={f.modes} role="radiogroup" aria-label={t.sortTitle}>
                {SORT_KEYS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={settings.sort === k}
                    title={t.sort[k][1]}
                    onClick={() => set({ sort: k })}
                  >
                    <Icon name={SORT_ICON[k]} size={15} />
                    <span>{t.sort[k][0]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={f.leds}>
              {showFast && led(t.fastOnly, !!settings.fastOnly, () => set({ fastOnly: !settings.fastOnly }), t.fastHint)}
              {(newCount > 0 || onlyNew) &&
                led(
                  t.onlyNew,
                  onlyNew,
                  () => {
                    haptic.select();
                    onOnlyNew(!onlyNew);
                  },
                  undefined,
                  newCount,
                )}
            </div>
          </div>
        </div>
      </section>

      {groups.length > 0 && (
        <div className="chips">
          <button type="button" className="chip" aria-pressed={!settings.group} onClick={() => set({ group: null })}>
            {t.all}
            <small className={f.chipCount}>{total}</small>
          </button>
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
