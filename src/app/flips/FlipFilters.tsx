"use client";

import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { SearchField } from "@/components/ui/SearchField";
import type { Confidence } from "@/features/flips";
import { useFormat, useT } from "@/i18n/client";
import { parseGamePrice } from "@/lib/format";
import type { FlipSettings } from "@/lib/store";
import { haptic } from "@/lib/telegram";
import { Signal } from "./OfferCard";
import f from "./filters.module.css";

export const MIN_PROFIT = [20_000, 50_000, 100_000, 250_000, 500_000, 1_000_000];
export const BUDGET = [500_000, 1_000_000, 5_000_000, 10_000_000];
const SORT_KEYS: FlipSettings["sort"][] = ["profit", "pct", "hour", "fast"];
const CONF_KEYS: Confidence[] = ["high", "medium", "low"];

type PanelId = "sort" | "profit" | "budget" | "conf";

export interface GroupChip {
  id: string;
  icon: string;
  label: string;
  /** флипов в категории при остальных фильтрах */
  count: number;
}

/** Кнопка фильтра: что настраивает и текущее значение словами. changed - отличается от обычного. */
function Pill({
  id,
  open,
  onToggle,
  icon,
  label,
  value,
  changed,
}: {
  id: PanelId;
  open: PanelId | null;
  onToggle: (id: PanelId) => void;
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
  changed: boolean;
}) {
  return (
    <button
      type="button"
      className={f.pill}
      aria-expanded={open === id}
      aria-controls="flip-filter-panel"
      data-changed={changed || undefined}
      onClick={() => onToggle(id)}
    >
      {icon}
      <span>{label}</span>
      <b>{value}</b>
      <Icon name="down" size={14} className={f.caret} />
    </button>
  );
}

/** Своя сумма: «300к», «1,5кк», «2 000 000». */
function CustomAmount({ onApply }: { onApply: (v: number) => void }) {
  const t = useT().flips;
  const [text, setText] = useState("");
  const [bad, setBad] = useState(false);
  return (
    <form
      className={f.custom}
      data-bad={bad || undefined}
      onSubmit={(e) => {
        e.preventDefault();
        const v = parseGamePrice(text);
        if (!v) return setBad(true);
        onApply(v);
      }}
    >
      <label>
        <span>{t.custom}</span>
        <input
          inputMode="decimal"
          autoComplete="off"
          placeholder={t.customPlaceholder}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setBad(false);
          }}
        />
      </label>
      <button type="submit" className="btn" disabled={!text}>
        {t.apply}
      </button>
    </form>
  );
}

/** Вариант с пояснением (сортировка, надёжность): кружок выбора, название и строка «что это значит». */
function Option({
  pressed,
  onClick,
  title,
  hint,
  icon,
}: {
  pressed: boolean;
  onClick: () => void;
  title: string;
  hint: string;
  icon?: React.ReactNode;
}) {
  return (
    <button type="button" className={f.option} aria-pressed={pressed} onClick={onClick}>
      <span className={f.radio} aria-hidden />
      <span className={f.optionText}>
        <b>
          {icon}
          {title}
        </b>
        <small>{hint}</small>
      </span>
    </button>
  );
}

/**
 * Фильтры ленты всегда на виду: поиск, кнопки с текущим значением (по нажатию - варианты
 * с пояснениями под рядом), быстрые «за сутки» и «новые», категории с числом флипов.
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
  /** у ленты есть оценка времени продажи */
  showFast: boolean;
  onReset: () => void;
}) {
  const t = useT().flips;
  const { formatShort } = useFormat();
  const [open, setOpen] = useState<PanelId | null>(null);
  const root = useRef<HTMLDivElement>(null);

  // панель закрывается тапом мимо фильтров и Esc
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = (id: PanelId) => {
    haptic.tap();
    setOpen((v) => (v === id ? null : id));
  };
  const choose = (patch: Partial<FlipSettings>) => {
    set(patch);
    setOpen(null);
  };

  const changed =
    settings.minProfit !== defaults.minProfit ||
    settings.budget !== defaults.budget ||
    settings.minConfidence !== defaults.minConfidence ||
    settings.group !== defaults.group ||
    !!settings.fastOnly ||
    onlyNew ||
    !!query;

  const money = (presets: number[], value: number, key: "minProfit" | "budget", any?: string) => {
    const pick = (v: number) => choose(key === "minProfit" ? { minProfit: v } : { budget: v });
    return (
      <>
        <div className={f.presets}>
          {any && (
            <button type="button" className="chip" aria-pressed={value === 0} onClick={() => pick(0)}>
              {any}
            </button>
          )}
          {presets.map((v) => (
            <button key={v} type="button" className="chip" aria-pressed={value === v} onClick={() => pick(v)}>
              {formatShort(v)}
            </button>
          ))}
          {/* своя сумма, которой нет среди готовых */}
          {value > 0 && !presets.includes(value) && (
            <button type="button" className="chip" aria-pressed onClick={() => setOpen(null)}>
              {formatShort(value)}
            </button>
          )}
        </div>
        <CustomAmount onApply={pick} />
      </>
    );
  };

  const panels: Record<PanelId, { title: string; hint: string; body: React.ReactNode }> = {
    sort: {
      title: t.sortPill,
      hint: "",
      body: (
        <div className={f.options}>
          {/* в кнопке значение строчными («Сначала прибыль»), в списке - с заглавной */}
          {SORT_KEYS.map((k) => (
            <Option
              key={k}
              pressed={settings.sort === k}
              onClick={() => choose({ sort: k })}
              title={t.sort[k][0].charAt(0).toUpperCase() + t.sort[k][0].slice(1)}
              hint={t.sort[k][1]}
            />
          ))}
        </div>
      ),
    },
    profit: { title: t.profitPill, hint: t.profitHint, body: money(MIN_PROFIT, settings.minProfit, "minProfit") },
    budget: { title: t.budgetPill, hint: t.budgetHint, body: money(BUDGET, settings.budget, "budget", t.anyBudget) },
    conf: {
      title: t.confPill,
      hint: t.confHint,
      body: (
        <div className={f.options}>
          {CONF_KEYS.map((k) => (
            <Option
              key={k}
              pressed={settings.minConfidence === k}
              onClick={() => choose({ minConfidence: k })}
              icon={<Signal level={k} />}
              title={t.confOptions[k][0]}
              hint={t.confOptions[k][1]}
            />
          ))}
        </div>
      ),
    },
  };
  const panel = open && panels[open];

  const quick = (icon: IconName, label: string, pressed: boolean, onClick: () => void, title?: string, count?: number) => (
    <button type="button" className={f.quick} aria-pressed={pressed} title={title} onClick={onClick}>
      <Icon name={icon} size={15} />
      {label}
      {count !== undefined && <b className="mono">{count}</b>}
    </button>
  );

  return (
    <div ref={root} className={f.filters}>
      <div className={f.top}>
        <SearchField className={f.search} value={query} onChange={onQuery} placeholder={t.search} aria-label={t.search} />
        <div className={f.pills}>
          <Pill
            id="sort"
            open={open}
            onToggle={toggle}
            icon={<Icon name="sort" size={15} />}
            label={t.sortPill}
            value={t.sort[settings.sort][0]}
            changed={false}
          />
          <Pill
            id="profit"
            open={open}
            onToggle={toggle}
            label={t.profitPill}
            value={formatShort(settings.minProfit)}
            changed={settings.minProfit !== defaults.minProfit}
          />
          <Pill
            id="budget"
            open={open}
            onToggle={toggle}
            label={t.budgetPill}
            value={settings.budget ? formatShort(settings.budget) : t.anyBudget}
            changed={settings.budget !== defaults.budget}
          />
          <Pill
            id="conf"
            open={open}
            onToggle={toggle}
            icon={<Signal level={settings.minConfidence} />}
            label={t.confPill}
            value={t.confShort[settings.minConfidence]}
            changed={settings.minConfidence !== defaults.minConfidence}
          />
          {showFast && quick("clock", t.fastOnly, !!settings.fastOnly, () => set({ fastOnly: !settings.fastOnly }), t.fastHint)}
          {(newCount > 0 || onlyNew) &&
            quick(
              "sparkle",
              t.onlyNew,
              onlyNew,
              () => {
                haptic.select();
                onOnlyNew(!onlyNew);
              },
              undefined,
              newCount,
            )}
          {changed && (
            <button
              type="button"
              className={f.reset}
              onClick={() => {
                setOpen(null);
                onReset();
              }}
            >
              <Icon name="undo" size={14} />
              {t.reset}
            </button>
          )}
        </div>
      </div>

      {panel && (
        <section id="flip-filter-panel" className={`glass ${f.panel}`} aria-label={panel.title}>
          <header className={f.panelHead}>
            <b>{panel.title}</b>
            {panel.hint && <span>{panel.hint}</span>}
          </header>
          {panel.body}
        </section>
      )}

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
