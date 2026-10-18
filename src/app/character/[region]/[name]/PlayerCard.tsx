"use client";

import { Tilt } from "@/components/Tilt/Tilt";
import { allianceOf } from "@/features/alliances";
import {
  ARCHETYPES,
  ATTRIBUTE_SHORT,
  ATTRIBUTES,
  TIERS,
  archetypeLabel,
  archetypeText,
  type Archetype,
  type Attribute,
  type Tier,
} from "@/features/archetypes";
import { useRating, type Character, type Metric } from "@/features/character";
import { useFormat, useLang, useT } from "@/i18n/client";
import type { Region } from "@/lib/store";
import styles from "./playerCard.module.css";

/** Какие процентили показываем строками «лучше, чем у X%» — по порядку. */
const PERCENTILE_ROWS: Metric[] = ["kd", "kills", "accuracy", "headshots", "survival", "damage", "mutants", "played"];

/** Карточка игрока как в FIFA: рейтинг, шесть характеристик, архетип и «лучше, чем X% игроков». */
export function PlayerCard({ region, character: c }: { region: Region; character: Character }) {
  const t = useT().player.card;
  const lang = useLang();
  const { formatNumber } = useFormat();
  const { data, isLoading, isError } = useRating(region, c.username);

  if (isError) return null;

  return (
    <section className="section">
      <h2 className="section-title">
        {t.title}
        {data && data.status === "ready" && <small>{t.among(formatNumber(data.population))}</small>}
      </h2>

      {isLoading || !data ? (
        <div className="skeleton" style={{ height: 380, borderRadius: 22 }} />
      ) : data.status !== "ready" ? (
        <div className={`glass ${styles.wait}`}>
          <span aria-hidden>🃏</span>
          <p>{data.status === "newbie" ? t.newbie : t.collecting(formatNumber(data.population))}</p>
        </div>
      ) : (
        <div className={styles.layout}>
          <FifaCard
            name={c.username}
            alliance={c.alliance}
            region={region}
            overall={data.overall}
            tier={data.tier}
            archetype={data.archetype}
            attributes={data.attributes}
          />

          <div className={styles.side}>
            <div className={`glass ${styles.archetype}`} style={{ "--arch": ARCHETYPES[data.archetype].color } as React.CSSProperties}>
              <span className={styles.archEmoji} aria-hidden>
                {ARCHETYPES[data.archetype].emoji}
              </span>
              <span>
                <small>{t.whoYou}</small>
                <b>{archetypeLabel(data.archetype, lang)}</b>
                <span>{archetypeText(data.archetype, lang)}</span>
              </span>
            </div>

            <div className={`glass ${styles.better}`}>
              {PERCENTILE_ROWS.map((m) => {
                const p = Math.round(data.percentiles[m]);
                return (
                  <div key={m} className={styles.betterRow} data-top={p >= 80 || undefined}>
                    <span>{t.better(t.metrics[m], p)}</span>
                    <span className={styles.betterBar} aria-hidden>
                      <i style={{ width: `${p}%` }} />
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/** Сама карточка: общий рейтинг и архетип слева сверху, ник, шесть характеристик в две колонки. */
export function FifaCard({
  name,
  alliance,
  region,
  overall,
  tier,
  archetype,
  attributes,
}: {
  name: string;
  alliance: string;
  region: Region;
  overall: number;
  tier: Tier;
  archetype: Archetype;
  attributes: Record<Attribute, number>;
}) {
  const lang = useLang();
  const colors = TIERS[tier];
  const ally = allianceOf(alliance);
  return (
    <Tilt
      max={14}
      className={styles.card}
      data-tier={tier}
      style={
        {
          "--from": colors.from,
          "--to": colors.to,
          "--edge": colors.edge,
          "--ink": colors.text,
          "--glow": colors.glow,
        } as React.CSSProperties
      }
    >
      <div className={styles.cardTop}>
        <div className={styles.overall}>
          <strong>{overall}</strong>
          <span title={archetypeLabel(archetype, lang)}>{ARCHETYPES[archetype].emoji}</span>
          <small>{region.toUpperCase()}</small>
        </div>
        <div className={styles.avatar}>
          {ally.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ally.image} alt="" width={110} height={110} />
          ) : (
            <span>{name.slice(0, 1).toUpperCase()}</span>
          )}
        </div>
      </div>
      <div className={styles.cardName}>{name}</div>
      <div className={styles.attrs}>
        {ATTRIBUTES.map((a) => (
          <div key={a} title={lang === "en" ? ATTRIBUTE_SHORT[a].nameEn : ATTRIBUTE_SHORT[a].nameRu}>
            <b>{attributes[a]}</b>
            <span>{lang === "en" ? ATTRIBUTE_SHORT[a].en : ATTRIBUTE_SHORT[a].ru}</span>
          </div>
        ))}
      </div>
    </Tilt>
  );
}
