"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { CostSummary, IngredientList } from "@/components/Barter/Barter";
import { ItemIcon } from "@/components/ui/ItemIcon";
import { PageHeader } from "@/components/ui/PageHeader";
import { RegionSwitch } from "@/components/ui/RegionSwitch";
import { SearchField } from "@/components/ui/SearchField";
import { EmptyState, RowSkeleton } from "@/components/ui/States";
import {
  currencyLabel,
  mergeItems,
  priceIdsFor,
  priceLines,
  totalCost,
  useBarter,
  useBestPrices,
  type BarterIndex,
  type Line,
} from "@/features/barter";
import { searchItems, useItems, type Item } from "@/features/items";
import { formatNumber, plural } from "@/lib/format";
import { actions, useApp, type PlanEntry } from "@/lib/store";
import { haptic } from "@/lib/telegram";
import styles from "./craft.module.css";

export default function CraftPage() {
  const region = useApp((s) => s.region);
  const plan = useApp((s) => s.plan);
  const { data: index } = useItems();
  const { data: barter } = useBarter();

  const [query, setQuery] = useState("");
  const q = useDeferredValue(query.trim());

  if (!index || !barter) {
    return (
      <main className="page">
        <PageHeader eyebrow="Планировщик" title="Крафт" />
        <RowSkeleton count={4} />
      </main>
    );
  }

  // в поиске — только то, что можно получить бартером
  const results =
    q.length >= 2 ? searchItems(index, q, undefined, 60).filter((i) => barter.byResult.has(i.id)).slice(0, 6) : [];

  return (
    <main className="page">
      <PageHeader eyebrow="Планировщик" title="Крафт" aside={<RegionSwitch />}>
        Добавь, что хочешь получить бартером, — соберём общий список: что нафармить, что докупить и во что это обойдётся.
      </PageHeader>

      <SearchField
        value={query}
        onChange={setQuery}
        placeholder="Что хотим скрафтить?"
        aria-label="Добавить цель крафта"
        onSubmit={() => {
          if (!results[0]) return;
          actions.addToPlan({ id: results[0].id, recipe: 0, offer: 0 });
          setQuery("");
        }}
      />
      {results.length > 0 && (
        <div className="stack" style={{ gap: 6, marginTop: 8 }}>
          {results.map((item) => (
            <button
              key={item.id}
              type="button"
              className="list-row"
              onClick={() => {
                haptic.tap("medium");
                actions.addToPlan({ id: item.id, recipe: 0, offer: 0 });
                setQuery("");
              }}
            >
              <ItemIcon item={item} size={36} />
              <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                <strong className="truncate" style={{ display: "block", fontSize: 14 }}>
                  {item.name}
                </strong>
                <span className="dim" style={{ fontSize: 12, fontWeight: 600 }}>
                  {barter.byResult.get(item.id)?.length} {plural(barter.byResult.get(item.id)?.length ?? 0, ["рецепт", "рецепта", "рецептов"])}
                </span>
              </span>
              <span className={styles.plus}>+</span>
            </button>
          ))}
        </div>
      )}
      {q.length >= 2 && !results.length && (
        <p className="dim" style={{ fontSize: 13, marginTop: 10 }}>
          Не нашли предмет, который получают бартером.
        </p>
      )}

      {plan.length ? (
        <>
          <section className="section">
            <h2 className="section-title">
              Цели <small>{plan.length}</small>
              <button type="button" onClick={() => (haptic.notify("warning"), actions.clearPlan())}>
                Очистить
              </button>
            </h2>
            <div className="stack" style={{ gap: 8 }}>
              {plan.map((entry, i) => (
                <Target key={`${entry.id}-${entry.recipe}-${entry.offer}`} entry={entry} index={i} item={index.byId.get(entry.id)} barter={barter} />
              ))}
            </div>
          </section>
          <Totals plan={plan} barter={barter} byId={index.byId} region={region} />
        </>
      ) : (
        <div className="section">
          <EmptyState
            icon="sparkle"
            title="План пуст"
            text="Найди предмет выше или нажми «В план крафта» на странице предмета — мы сложим все рецепты в один список ресурсов."
          />
        </div>
      )}
    </main>
  );
}

function Target({ entry, index, item, barter }: { entry: PlanEntry; index: number; item?: Item; barter: BarterIndex }) {
  const recipes = barter.byResult.get(entry.id) ?? [];
  const recipe = recipes[entry.recipe];
  const offer = recipe?.offers[entry.offer];

  return (
    <article className={styles.target}>
      <Link href={`/auction/${entry.id}`} className={styles.targetHead}>
        <ItemIcon item={item} size={44} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <strong className="truncate" style={{ display: "block", fontSize: 14 }}>
            {item?.name ?? entry.id}
          </strong>
          {offer && (
            <span className="dim" style={{ fontSize: 12, fontWeight: 600 }}>
              {offer.cost > 0 ? `${formatNumber(offer.cost)} ${currencyLabel(offer.currency, offer.cost)} · ` : ""}
              {offer.items.length} {plural(offer.items.length, ["ингредиент", "ингредиента", "ингредиентов"])}
            </span>
          )}
        </span>
      </Link>

      <div className={styles.controls}>
        <select
          className={styles.select}
          aria-label="Рецепт"
          value={`${entry.recipe}:${entry.offer}`}
          onChange={(e) => {
            const [recipe, offer] = e.target.value.split(":").map(Number);
            haptic.select();
            actions.updatePlan(index, { recipe, offer });
          }}
        >
          {recipes.flatMap((r, ri) =>
            r.offers.map((o, oi) => (
              <option key={`${ri}:${oi}`} value={`${ri}:${oi}`}>
                {r.settlement} · ур. {r.level}
                {r.offers.length > 1 ? ` · вар. ${oi + 1}` : ""}
                {o.currency !== "money" ? " · обменки" : ""}
              </option>
            )),
          )}
        </select>

        <div className={styles.stepper}>
          <button type="button" aria-label="Меньше" onClick={() => (haptic.select(), actions.updatePlan(index, { qty: entry.qty - 1 }))}>
            −
          </button>
          <span className="mono">{entry.qty}</span>
          <button type="button" aria-label="Больше" onClick={() => (haptic.select(), actions.updatePlan(index, { qty: entry.qty + 1 }))}>
            +
          </button>
        </div>
      </div>
    </article>
  );
}

const GROUPS: { kind: Line["source"]["kind"]; title: string; hint: string }[] = [
  { kind: "farm", title: "Нафармить", hint: "только в открытом мире" },
  { kind: "pack", title: "Можно докупить блоками", hint: "или нафармить" },
  { kind: "market", title: "Купить на аукционе", hint: "снаряжение и прочее" },
];

function Totals({
  plan,
  barter,
  byId,
  region,
}: {
  plan: PlanEntry[];
  barter: BarterIndex;
  byId: Map<string, Item>;
  region: Parameters<typeof useBestPrices>[0];
}) {
  const offers = plan
    .map((p) => ({ offer: barter.byResult.get(p.id)?.[p.recipe]?.offers[p.offer], qty: p.qty }))
    .filter((x): x is { offer: NonNullable<typeof x.offer>; qty: number } => !!x.offer);

  const items = mergeItems(offers.map(({ offer, qty }) => offer.items.map((i) => ({ id: i.id, amount: i.amount * qty }))));
  const payments = offers.map(({ offer, qty }) => ({ currency: offer.currency, cost: offer.cost * qty }));

  const { prices, isLoading } = useBestPrices(region, priceIdsFor(barter, items.map((i) => i.id)));
  const cost = totalCost(
    priceLines(barter, items, prices).sort((a, b) => b.amount - a.amount),
    payments,
  );

  return (
    <>
      <section className={`glass section ${styles.summary}`}>
        <span className={styles.summaryLabel}>Итого по плану · {region.toUpperCase()}</span>
        <CostSummary cost={cost} loading={isLoading} />
      </section>

      {GROUPS.map((g) => {
        const lines = cost.lines.filter((l) => l.source.kind === g.kind);
        if (!lines.length) return null;
        return (
          <section key={g.kind} className="section">
            <h2 className="section-title">
              {g.title} <small>{g.hint}</small>
            </h2>
            <IngredientList lines={lines} byId={byId} loading={isLoading} />
          </section>
        );
      })}
    </>
  );
}
