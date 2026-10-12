"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  currencyLabel,
  priceIdsFor,
  priceLines,
  totalCost,
  useBestPrices,
  type BarterIndex,
  type Line,
} from "@/features/barter";
import { buildTree, treeCategories, type TreeNode } from "@/features/barterTree";
import { categoryLabel, GROUPS, rarityOf, type Item, type ItemIndex } from "@/features/items";
import { formatNumber, formatPrice } from "@/lib/format";
import { actions, type Region } from "@/lib/store";
import { haptic } from "@/lib/telegram";
import { Icon } from "../Icon";
import { ItemIcon } from "../ui/ItemIcon";
import { CostSummary } from "./Barter";
import styles from "./BarterTree.module.css";

const COL_W = 196;
const COL_GAP = 40;
const ROW_H = 76;

const FACTION_BASES = ["База «Зари»", "Фракции Севера", "Обитель «Завета»", "База «Рубежа»", "Лагерь Наемников"];

/** Рецепт одинаков на всех базах фракций — в шапке показываем их одним словом. */
const placeKind = (settlement: string) =>
  FACTION_BASES.includes(settlement) ? "База фракции" : settlement.startsWith("Бар") ? "Бар" : settlement;

/** Древо бартера по категории + панель рецепта выбранного предмета. */
export function BarterTreeView({ barter, index, region }: { barter: BarterIndex; index: ItemIndex; region: Region }) {
  const categories = useMemo(() => {
    const order = GROUPS.map((g) => g.id);
    return treeCategories(barter, index).sort(
      (a, b) => order.indexOf(a.split("/")[0]) - order.indexOf(b.split("/")[0]) || categoryLabel(a).localeCompare(categoryLabel(b), "ru"),
    );
  }, [barter, index]);
  const [category, setCategory] = useState(() => (categories.includes("weapon/sniper_rifle") ? "weapon/sniper_rifle" : categories[0]));
  const tree = useMemo(() => buildTree(barter, index, category), [barter, index, category]);
  const [selected, setSelected] = useState<string | null>(null);
  const cats = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const dragged = useDragScroll(scroller);

  // при смене категории — в начало дерева
  useEffect(() => {
    scroller.current?.scrollTo({ left: 0, top: 0 });
  }, [category]);

  // ветка выбранного предмета: все предки и потомки
  const chain = useMemo(() => {
    if (!selected) return null;
    const up = new Map<string, string[]>();
    const down = new Map<string, string[]>();
    for (const [a, b] of tree.edges) {
      up.set(b, [...(up.get(b) ?? []), a]);
      down.set(a, [...(down.get(a) ?? []), b]);
    }
    const out = new Set([selected]);
    const walk = (id: string, links: Map<string, string[]>) => {
      for (const next of links.get(id) ?? [])
        if (!out.has(next)) {
          out.add(next);
          walk(next, links);
        }
    };
    walk(selected, up);
    walk(selected, down);
    return out;
  }, [selected, tree]);

  // выбранная категория — в зоне видимости ленты
  useEffect(() => {
    const el = cats.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    const box = cats.current;
    if (el && box) box.scrollTo({ left: el.offsetLeft - box.clientWidth / 2 + el.offsetWidth / 2, behavior: "smooth" });
  }, [category]);

  const pos = useMemo(() => new Map(tree.nodes.map((n) => [n.id, n])), [tree]);
  const width = tree.cols * COL_W + (tree.cols - 1) * COL_GAP;
  const height = Math.max(1, tree.rows) * ROW_H;
  const x = (n: TreeNode) => n.col * (COL_W + COL_GAP);
  const y = (n: TreeNode) => n.row * ROW_H;

  // шапка колонки как в игре: «Бар | 7 уровень» — самое частое место и уровень обмена в колонке
  const colHeads = Array.from({ length: tree.cols }, (_, c) => {
    const count = new Map<string, { place: string; level: number; n: number }>();
    for (const n of tree.nodes) {
      if (n.col !== c || n.ghost) continue;
      const seen = new Set<string>();
      for (const r of barter.byResult.get(n.id) ?? []) {
        const place = placeKind(r.settlement);
        const key = `${place}|${r.level}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const cur = count.get(key) ?? { place, level: r.level, n: 0 };
        cur.n++;
        count.set(key, cur);
      }
    }
    return [...count.values()].sort((a, b) => b.n - a.n)[0] ?? null;
  });

  return (
    <>
      <div ref={cats} className={styles.cats} role="tablist" aria-label="Категория">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={c === category}
            className={styles.cat}
            onClick={() => {
              haptic.select();
              setCategory(c);
              setSelected(null);
            }}
          >
            {categoryLabel(c)}
          </button>
        ))}
      </div>

      <div className={styles.frame} data-dim={chain ? "" : undefined}>
        <span className={styles.frameHint}>
          <Icon name="sparkle" size={12} /> Зажми и тяни · нажми на предмет
        </span>
        <div
          ref={scroller}
          className={styles.scroller}
          onClick={(e) => {
            // клик по пустому месту (не перетаскивание) закрывает рецепт
            if (!dragged.current && !(e.target as HTMLElement).closest("button")) setSelected(null);
          }}
        >
          <div className={styles.heads} style={{ width }}>
            {colHeads.map((h, c) => (
              <span key={c} className={styles.head} style={{ left: c * (COL_W + COL_GAP), width: COL_W }}>
                {h ? (
                  <>
                    {h.place}
                    <em>{h.level} уровень</em>
                  </>
                ) : (
                  <span className="dim">Начало ветки</span>
                )}
              </span>
            ))}
          </div>
          <div className={styles.canvas} style={{ width, height }}>
            <svg className={styles.links} width={width} height={height} aria-hidden>
              {tree.edges.map(([from, to]) => {
                const a = pos.get(from);
                const b = pos.get(to);
                if (!a || !b) return null;
                const x1 = x(a) + COL_W;
                const y1 = y(a) + ROW_H / 2;
                const x2 = x(b);
                const y2 = y(b) + ROW_H / 2;
                const mid = x2 - COL_GAP / 2;
                const active = !!chain && chain.has(from) && chain.has(to);
                return (
                  <g key={`${from}>${to}`} data-active={active || undefined}>
                    <path d={`M${x1} ${y1} H${mid} V${y2} H${x2 - 6}`} />
                    <path d={`M${x2 - 7} ${y2 - 4} L${x2 - 1} ${y2} L${x2 - 7} ${y2 + 4}`} />
                  </g>
                );
              })}
            </svg>
            {tree.nodes.map((n) => (
              <Node
                key={n.id}
                node={n}
                style={{ left: x(n), top: y(n), width: COL_W }}
                selected={selected === n.id}
                inChain={!!chain?.has(n.id)}
                barterable={barter.byResult.has(n.id)}
                onSelect={() => {
                  if (dragged.current) return;
                  haptic.select();
                  if (n.ghost && n.item) {
                    setCategory(n.item.category);
                    setSelected(n.id);
                  } else setSelected(n.id);
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <Drawer open={!!selected} onClose={() => setSelected(null)}>
        {selected && barter.byResult.has(selected) ? (
          <RecipePanel key={selected} itemId={selected} barter={barter} byId={index.byId} region={region} onClose={() => setSelected(null)} />
        ) : selected ? (
          <section className={styles.panel}>
            <PanelHead item={index.byId.get(selected)} onClose={() => setSelected(null)} />
            <p className={`dim ${styles.hint}`}>Этот предмет не получают бартером — это начало ветки, его покупают или находят.</p>
            <Link href={`/auction/${selected}`} className="btn">
              На рынок
            </Link>
          </section>
        ) : null}
      </Drawer>
    </>
  );
}

/** Панель справа поверх древа (портал — чтобы быть выше нижнего меню). */
function Drawer({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  // древо рендерится только на клиенте (после загрузки данных), document есть
  if (typeof document === "undefined") return null;
  return createPortal(
    <>
      <div className={styles.backdrop} data-open={open || undefined} onClick={onClose} aria-hidden />
      <aside className={styles.drawer} data-open={open || undefined} aria-hidden={!open} role="dialog" aria-label="Рецепт бартера">
        {children}
      </aside>
    </>,
    document.body,
  );
}

function PanelHead({ item, onClose }: { item?: Item; onClose: () => void }) {
  return (
    <header className={styles.panelHead}>
      <ItemIcon item={item} size={28} />
      <strong style={{ color: item ? rarityOf(item.rarity).color : undefined }}>{item?.name}</strong>
      <button type="button" className={styles.close} aria-label="Закрыть" onClick={onClose}>
        ✕
      </button>
    </header>
  );
}

/**
 * Перетаскивание мышью с зажатой ЛКМ (+ инерция). Тач и колесо — нативный скролл.
 * dragged.current = true сразу после перетаскивания, чтобы отпускание не считалось кликом.
 */
function useDragScroll(ref: React.RefObject<HTMLDivElement | null>) {
  const dragged = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let start: { x: number; y: number; left: number; top: number } | null = null;
    let last = { x: 0, y: 0, t: 0 };
    let v = { x: 0, y: 0 };
    let raf = 0;

    const down = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      cancelAnimationFrame(raf);
      start = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop };
      last = { x: e.clientX, y: e.clientY, t: performance.now() };
      v = { x: 0, y: 0 };
      dragged.current = false;
    };
    const move = (e: PointerEvent) => {
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (!dragged.current && Math.hypot(dx, dy) < 5) return;
      if (!dragged.current) {
        dragged.current = true;
        el.setPointerCapture(e.pointerId);
        el.dataset.dragging = "";
      }
      el.scrollLeft = start.left - dx;
      el.scrollTop = start.top - dy;
      const now = performance.now();
      const dt = Math.max(1, now - last.t);
      v = { x: (e.clientX - last.x) / dt, y: (e.clientY - last.y) / dt };
      last = { x: e.clientX, y: e.clientY, t: now };
    };
    const up = () => {
      if (!start) return;
      start = null;
      delete el.dataset.dragging;
      if (dragged.current) {
        // инерция
        let vx = v.x * 16;
        let vy = v.y * 16;
        const step = () => {
          el.scrollLeft -= vx;
          el.scrollTop -= vy;
          vx *= 0.92;
          vy *= 0.92;
          if (Math.abs(vx) > 0.4 || Math.abs(vy) > 0.4) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        // click придёт сразу после pointerup — сбрасываем флаг после него
        setTimeout(() => (dragged.current = false), 0);
      }
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [ref]);
  return dragged;
}

function Node({
  node,
  style,
  selected,
  inChain,
  barterable,
  onSelect,
}: {
  node: TreeNode;
  style: React.CSSProperties;
  selected: boolean;
  inChain: boolean;
  barterable: boolean;
  onSelect: () => void;
}) {
  const color = node.item ? rarityOf(node.item.rarity).color : "var(--text-2)";
  return (
    <button
      type="button"
      className={styles.node}
      style={{ ...style, "--rarity": color } as React.CSSProperties}
      data-selected={selected || undefined}
      data-chain={inChain || undefined}
      data-ghost={node.ghost || undefined}
      data-base={!barterable || undefined}
      onClick={onSelect}
    >
      <span className={styles.nodeIcon}>
        <ItemIcon item={node.item} size={44} />
      </span>
      <span className={styles.nodeText}>
        <strong className={styles.nodeName}>{node.item?.name ?? node.id}</strong>
        <span className={styles.nodeMeta}>
          {node.ghost ? `→ ${categoryLabel(node.item?.category ?? "")}` : barterable ? `ур. ${node.level}` : "начало ветки"}
        </span>
      </span>
    </button>
  );
}

const KIND_LABEL = { market: "аукцион", pack: "блоки", farm: "фарм" } as const;

/** Рецепт в стиле игрового окна: результат, слоты ингредиентов, поселения и предложения. */
export function RecipePanel({
  itemId,
  barter,
  byId,
  region,
  onClose,
}: {
  itemId: string;
  barter: BarterIndex;
  byId: Map<string, Item>;
  region: Region;
  onClose: () => void;
}) {
  const recipes = useMemo(() => barter.byResult.get(itemId) ?? [], [barter, itemId]);
  const [ri, setRi] = useState(0);
  const [oi, setOi] = useState(0);
  const [added, setAdded] = useState(false);
  const recipe = recipes[ri] ?? recipes[0];
  const offer = recipe?.offers[oi] ?? recipe?.offers[0];
  const item = byId.get(itemId);

  const ids = offer ? offer.items.map((i) => i.id) : [];
  const { prices, isLoading } = useBestPrices(region, priceIdsFor(barter, ids));
  if (!recipe || !offer) return null;
  const cost = totalCost(priceLines(barter, offer.items, prices), [offer]);
  const lineById = new Map<string, Line>(cost.lines.map((l) => [l.id, l]));
  const color = item ? rarityOf(item.rarity).color : "var(--text)";

  return (
    <section className={styles.panel}>
      <PanelHead item={item} onClose={onClose} />

      {recipes.length > 1 && (
        <div className={styles.tabs} role="tablist" aria-label="Поселение">
          {recipes.map((r, i) => (
            <button
              key={`${r.settlement}-${i}`}
              type="button"
              role="tab"
              aria-selected={i === ri}
              onClick={() => (haptic.select(), setRi(i), setOi(0), setAdded(false))}
            >
              {r.settlement}
            </button>
          ))}
        </div>
      )}
      {recipe.offers.length > 1 && (
        <div className={styles.offers} role="tablist" aria-label="Предложение">
          {recipe.offers.map((_, i) => (
            <button key={i} type="button" role="tab" aria-selected={i === oi} onClick={() => (haptic.select(), setOi(i), setAdded(false))}>
              Предложение #{i + 1}
            </button>
          ))}
        </div>
      )}

      <div className={styles.block}>
        <span className={styles.blockTitle}>Результат</span>
        <Link href={`/auction/${itemId}`} className={styles.result} style={{ "--rarity": color } as React.CSSProperties}>
          <span className={styles.resultCat}>{item ? categoryLabel(item.category) : ""}</span>
          <strong className={styles.resultName}>{item?.name}</strong>
          <span className={styles.resultArt}>
            <ItemIcon item={item} size={96} />
          </span>
        </Link>
      </div>

      <div className={styles.block}>
        <span className={styles.blockTitle}>Необходимые предметы</span>
        <div className={styles.slots}>
          {offer.items.map((ing) => {
            const it = byId.get(ing.id);
            const line = lineById.get(ing.id);
            return (
              <Link
                key={ing.id}
                href={`/auction/${ing.id}`}
                className={styles.slot}
                data-kind={line?.source.kind}
                title={it?.name}
                style={{ "--rarity": it ? rarityOf(it.rarity).color : "var(--text-3)" } as React.CSSProperties}
              >
                <ItemIcon item={it} size={52} />
                <span className={styles.slotCount}>×{formatNumber(ing.amount)}</span>
                <span className={styles.slotName}>{it?.name ?? ing.id}</span>
                <span className={styles.slotPrice}>
                  {line?.source.kind === "farm"
                    ? KIND_LABEL.farm
                    : line?.total != null
                      ? formatPrice(line.total)
                      : isLoading
                        ? "…"
                        : "нет лотов"}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      <dl className={styles.facts}>
        <div>
          <dt>Стоимость</dt>
          <dd className="mono">{offer.cost > 0 ? `${formatNumber(offer.cost)} ${currencyLabel(offer.currency, offer.cost)}` : "—"}</dd>
        </div>
        <div>
          <dt>База для обмена</dt>
          <dd>{recipe.settlement}</dd>
        </div>
        <div>
          <dt>Необходимый уровень</dt>
          <dd className="mono">{recipe.level}</dd>
        </div>
      </dl>

      <CostSummary cost={cost} loading={isLoading} />

      <div className={styles.actions}>
        <Link href={`/auction/${itemId}`} className="btn">
          На рынок
        </Link>
        <button
          type="button"
          className="btn primary"
          data-done={added || undefined}
          onClick={() => {
            haptic.notify("success");
            actions.addToPlan({ id: itemId, recipe: ri, offer: oi });
            setAdded(true);
          }}
        >
          <Icon name={added ? "star" : "sparkle"} size={16} filled={added} />
          {added ? "В плане" : "В план крафта"}
        </button>
      </div>
    </section>
  );
}
