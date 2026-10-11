"use client";

import Link from "next/link";
import { useState } from "react";
import {
  currencyLabel,
  priceIdsFor,
  priceLines,
  totalCost,
  useBarter,
  useBestPrices,
  type BarterIndex,
  type Cost,
  type Line,
  type Recipe,
} from "@/features/barter";
import { useItems, type Item } from "@/features/items";
import { formatNumber, formatPrice, plural } from "@/lib/format";
import { actions, type Region } from "@/lib/store";
import { haptic } from "@/lib/telegram";
import { Icon } from "../Icon";
import { ItemIcon } from "../ui/ItemIcon";
import { Segmented } from "../ui/Segmented";
import styles from "./Barter.module.css";

const PREVIEW = 3;

/** Блок бартера на странице предмета. Ничего не рендерит, если предмет не связан с бартером. */
export function BarterSection({ itemId, region, marketPrice }: { itemId: string; region: Region; marketPrice?: number | null }) {
  const { data: barter } = useBarter();
  const { data: index } = useItems();
  const [showAll, setShowAll] = useState(false);

  if (!barter || !index) return null;
  const recipes = barter.byResult.get(itemId) ?? [];

  return (
    <>
      <ResourceInfo itemId={itemId} barter={barter} byId={index.byId} region={region} />

      {recipes.length > 0 && (
        <section className="section">
          <h2 className="section-title">
            Бартер или купить? <small>{recipes.length} {plural(recipes.length, ["рецепт", "рецепта", "рецептов"])}</small>
          </h2>
          <div className="stack">
            {(showAll ? recipes : recipes.slice(0, PREVIEW)).map((recipe, i) => (
              <RecipeCard
                key={`${recipe.settlement}-${i}`}
                recipe={recipe}
                recipeIndex={i}
                region={region}
                marketPrice={marketPrice}
                barter={barter}
                byId={index.byId}
                defaultOpen={i === 0}
              />
            ))}
          </div>
          {recipes.length > PREVIEW && !showAll && (
            <button type="button" className="btn" style={{ width: "100%", marginTop: 10 }} onClick={() => setShowAll(true)}>
              Ещё {recipes.length - PREVIEW}
            </button>
          )}
        </section>
      )}
    </>
  );
}

/** Подсказка для бартерного ресурса или «пакета» (блока данных и т.п.). */
function ResourceInfo({ itemId, barter, byId, region }: { itemId: string; barter: BarterIndex; byId: Map<string, Item>; region: Region }) {
  const pack = barter.packs.get(itemId);
  const unpack = barter.unpacks.get(itemId);
  const farm = barter.farm.has(itemId);
  const uses = barter.byIngredient.get(itemId)?.length ?? 0;
  const priceId = pack?.id ?? (unpack ? itemId : undefined);
  const { prices } = useBestPrices(region, priceId ? [priceId] : []);

  if (!farm && !unpack) return null;

  const buyer = barter.buyer.get(itemId);
  const packPrice = priceId ? prices.get(priceId) : null;

  return (
    <section className={`section ${styles.info}`}>
      {farm && (
        <p>
          <Icon name="radiation" size={16} /> Бартерный ресурс — <b>на аукционе не продаётся</b>, добывается в открытом мире.
          {buyer ? ` Скупщик даёт ${formatPrice(buyer)} за штуку.` : ""}
        </p>
      )}
      {pack && (
        <Link href={`/auction/${pack.id}`} className={styles.packLink}>
          <ItemIcon item={byId.get(pack.id)} size={36} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <strong className="truncate" style={{ display: "block" }}>
              Пересоздаётся из «{byId.get(pack.id)?.name}»
            </strong>
            <span className="dim">
              1 → {pack.amount} шт{packPrice ? ` · ≈ ${formatPrice(packPrice / pack.amount)} за штуку` : ""}
            </span>
          </span>
          <Icon name="chevron" size={18} className="dim" />
        </Link>
      )}
      {unpack && (
        <Link href={`/auction/${unpack.id}`} className={styles.packLink}>
          <ItemIcon item={byId.get(unpack.id)} size={36} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <strong className="truncate" style={{ display: "block" }}>
              Пересоздаётся в {unpack.amount} × «{byId.get(unpack.id)?.name}»
            </strong>
            <span className="dim">
              {packPrice ? `≈ ${formatPrice(packPrice / unpack.amount)} за ресурс · ` : ""}
              нужен в {barter.byIngredient.get(unpack.id)?.length ?? 0} бартерах
            </span>
          </span>
          <Icon name="chevron" size={18} className="dim" />
        </Link>
      )}
      {farm && uses > 0 && (
        <Link href="/craft" className={styles.packLink}>
          <span className={styles.planIcon}>
            <Icon name="sparkle" size={18} />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <strong>Нужен в {uses} {plural(uses, ["бартере", "бартерах", "бартерах"])}</strong>
            <span className="dim" style={{ display: "block" }}>
              Добавьте цели в планировщик — посчитаем, сколько фармить
            </span>
          </span>
          <Icon name="chevron" size={18} className="dim" />
        </Link>
      )}
    </section>
  );
}

function RecipeCard({
  recipe,
  recipeIndex,
  region,
  marketPrice,
  barter,
  byId,
  defaultOpen,
}: {
  recipe: Recipe;
  recipeIndex: number;
  region: Region;
  marketPrice?: number | null;
  barter: BarterIndex;
  byId: Map<string, Item>;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [variant, setVariant] = useState("0");
  const [added, setAdded] = useState(false);
  const offerIndex = Number(variant);
  const offer = recipe.offers[offerIndex] ?? recipe.offers[0];

  return (
    <div className={styles.card} data-open={open || undefined}>
      <button
        type="button"
        className={styles.head}
        aria-expanded={open}
        onClick={() => {
          haptic.select();
          setOpen((o) => !o);
        }}
      >
        <span className={styles.place}>
          <Icon name="home" size={16} />
          {recipe.settlement}
        </span>
        <span className="pill dim">ур. {recipe.level}</span>
        <Icon name={open ? "up" : "down"} size={18} className="dim" />
      </button>

      {open && (
        <div className={styles.body}>
          {recipe.offers.length > 1 && (
            <Segmented
              label="Вариант бартера"
              size="sm"
              value={variant}
              onChange={setVariant}
              options={recipe.offers.map((_, i) => ({ value: String(i), label: `Вариант ${i + 1}` }))}
            />
          )}

          <OfferBreakdown key={variant} offer={offer} region={region} marketPrice={marketPrice} barter={barter} byId={byId} />

          <button
            type="button"
            className="btn"
            data-done={added || undefined}
            onClick={() => {
              haptic.notify("success");
              actions.addToPlan({ id: recipe.result, recipe: recipeIndex, offer: offerIndex });
              setAdded(true);
            }}
          >
            <Icon name={added ? "star" : "sparkle"} size={16} filled={added} />
            {added ? "Добавлено в план" : "В план крафта"}
          </button>
        </div>
      )}
    </div>
  );
}

function OfferBreakdown({
  offer,
  region,
  marketPrice,
  barter,
  byId,
}: {
  offer: Recipe["offers"][number];
  region: Region;
  marketPrice?: number | null;
  barter: BarterIndex;
  byId: Map<string, Item>;
}) {
  const { prices, isLoading } = useBestPrices(region, priceIdsFor(barter, offer.items.map((i) => i.id)));
  const cost = totalCost(priceLines(barter, offer.items, prices), [offer]);

  return (
    <>
      <IngredientList lines={cost.lines} byId={byId} loading={isLoading} />
      {offer.cost > 0 && (
        <div className={styles.money}>
          <span>Оплата поселению</span>
          <span className="mono">
            {formatNumber(offer.cost)} {currencyLabel(offer.currency, offer.cost)}
          </span>
        </div>
      )}
      <CostSummary cost={cost} loading={isLoading} />
      {!isLoading && <Verdict cost={cost} marketPrice={marketPrice} />}
    </>
  );
}

const SOURCE_LABEL = { market: "аукцион", pack: "блоки", farm: "фарм" } as const;

export function IngredientList({ lines, byId, loading }: { lines: Line[]; byId: Map<string, Item>; loading: boolean }) {
  return (
    <ul className={styles.ingredients}>
      {lines.map((l) => {
        const item = byId.get(l.id);
        return (
          <li key={l.id}>
            <Link href={`/auction/${l.id}`} className={styles.ingredient} data-kind={l.source.kind}>
              <ItemIcon item={item} size={34} />
              <span style={{ flex: 1, minWidth: 0, display: "grid" }}>
                <span className="truncate" style={{ fontSize: 13, fontWeight: 700 }}>
                  {item?.name ?? l.id}
                </span>
                <span className={styles.source}>
                  {SOURCE_LABEL[l.source.kind]}
                  {l.source.kind === "pack" && l.packs ? ` · ${l.packs} × «${byId.get(l.source.pack)?.name}»` : ""}
                  {l.source.kind === "farm" && l.buyerValue ? ` · скупщик ${formatPrice(l.buyerValue)}` : ""}
                </span>
              </span>
              <span className="mono dim" style={{ fontSize: 12 }}>
                ×{formatNumber(l.amount)}
              </span>
              <span className={`mono ${styles.sum}`}>
                {l.source.kind === "farm" ? "—" : l.total != null ? formatPrice(l.total) : loading ? "…" : "нет лотов"}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function CostSummary({ cost, loading }: { cost: Cost; loading: boolean }) {
  return (
    <div className={styles.summary}>
      <div className={styles.total}>
        <span>Купить всё возможное</span>
        <strong className="mono">{loading ? "…" : cost.rubles ? formatPrice(cost.rubles) : "0 ₽"}</strong>
      </div>
      {cost.exchange > 0 && (
        <div className={styles.total}>
          <span>Обменки</span>
          <strong className="mono">{formatNumber(cost.exchange)}</strong>
        </div>
      )}
      {cost.farmOnly.length > 0 && (
        <div className={styles.total}>
          <span>Нафармить</span>
          <strong className="mono">
            {cost.farmOnly.length} {plural(cost.farmOnly.length, ["ресурс", "ресурса", "ресурсов"])}
          </strong>
        </div>
      )}
    </div>
  );
}

function Verdict({ cost, marketPrice }: { cost: Cost; marketPrice?: number | null }) {
  if (cost.noLots.length) {
    return (
      <p className={styles.verdict}>
        Нет лотов на {cost.noLots.length} {plural(cost.noLots.length, ["позицию", "позиции", "позиций"])} — точную цену не посчитать.
      </p>
    );
  }
  if (cost.farmOnly.length || cost.exchange) {
    return (
      <p className={styles.verdict}>
        Часть ресурсов только фармится{cost.exchange ? " или покупается за обменки" : ""} — с ценой аукциона честно не сравнить.
        {marketPrice ? (
          <>
            {" "}
            Готовый предмет на аукционе — <b className="mono">{formatPrice(marketPrice)}</b>
          </>
        ) : null}
      </p>
    );
  }
  if (!marketPrice) return <p className={styles.verdict}>Предмета нет на аукционе — бартер единственный способ.</p>;

  const profit = marketPrice - cost.rubles;
  const pct = Math.abs(profit / marketPrice) * 100;
  return profit > 0 ? (
    <p className={styles.verdict} data-tone="good">
      <Icon name="bolt" size={16} /> Бартер выгоднее на <b className="mono">{formatPrice(profit)}</b> ({pct.toFixed(0)}%)
    </p>
  ) : (
    <p className={styles.verdict} data-tone="bad">
      Дешевле купить на аукционе — экономия <b className="mono">{formatPrice(-profit)}</b>
    </p>
  );
}
