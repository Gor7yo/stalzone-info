"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { Tilt } from "@/components/Tilt/Tilt";
import { FavButton, ShareButton } from "@/components/ui/Buttons";
import { StatTile } from "@/components/ui/PageHeader";
import { SearchField } from "@/components/ui/SearchField";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { allianceName, allianceOf } from "@/features/alliances";
import { useCharacter, type Character, type Stat } from "@/features/character";
import { rankLabel } from "@/features/clans";
import { STAT_CATEGORIES, STAT_CATEGORIES_EN, useMeta, type Meta } from "@/features/meta";
import { useFormat, useLang, useT } from "@/i18n/client";
import { isNotFound } from "@/lib/api";
import { McText, stripMc } from "@/lib/mcText";
import type { Format } from "@/lib/format";
import { CREATOR, isCreator } from "@/lib/creator";
import { actions, sameChar, useApp, type Region } from "@/lib/store";
import { useNow } from "@/lib/useNow";
import { CompareEntry } from "./CompareEntry";
import { PlayerProgress } from "./Progress";
import styles from "./character.module.css";

export function CharacterView({ region, name }: { region: Region; name: string }) {
  const t = useT().player;
  const { data, isLoading, error, refetch } = useCharacter(region, name);
  const isFav = useApp((s) => s.favCharacters.some((c) => sameChar(c, { region, name })));
  const { data: meta } = useMeta();

  useEffect(() => {
    if (data) actions.pushRecentCharacter({ region, name: data.username });
  }, [data, region]);

  return (
    <main className="page">
      <div className={styles.toolbar}>
        <span className="pill dim">{region.toUpperCase()}</span>
        <div className="row" style={{ gap: 8 }}>
          <ShareButton text={t.shareText(data?.username ?? name)} />
          <FavButton
            active={isFav}
            onToggle={() =>
              actions.toggleFavCharacter({
                region,
                name: data?.username ?? name,
              })
            }
          />
        </div>
      </div>

      {isLoading ? (
        <div className="stack">
          <div className="skeleton" style={{ height: 190, borderRadius: 22 }} />
          <div className="skeleton" style={{ height: 80, borderRadius: 22 }} />
          <div className="skeleton" style={{ height: 160, borderRadius: 22 }} />
        </div>
      ) : error ? (
        isNotFound(error) ? (
          <EmptyState icon="user" title={t.notFound} text={t.notFoundText(name, region.toUpperCase())}>
            <Link href="/character" className="btn">
              {t.newSearch}
            </Link>
          </EmptyState>
        ) : (
          <ErrorState onRetry={() => refetch()} />
        )
      ) : data ? (
        <Profile character={data} region={region} meta={meta} />
      ) : null}
    </main>
  );
}

function Profile({ character: c, region, meta }: { character: Character; region: Region; meta?: Meta }) {
  const t = useT().player;
  const lang = useLang();
  const { formatDate, formatNumber, formatRelative } = useFormat();
  const now = useNow(60_000);
  const alliance = allianceOf(c.alliance);
  const allianceLabel = allianceName(alliance, lang);
  const stat = (id: string) => {
    const v = c.stats?.find((s) => s.id === id)?.value;
    return typeof v === "number" ? v : Number(v) || 0;
  };

  const kills = stat("kil");
  const deaths = stat("dea");
  const shots = stat("sho-fir");
  const hits = stat("sho-hit");
  const playMs = stat("pla-tim");
  const regTime = c.stats?.find((s) => s.id === "reg-tim")?.value;
  const online = /online|playing/i.test(c.status ?? "");
  const creator = isCreator(region, c.username);
  // медиа-партнёр EXBO: видно, только если «Стрингер» выставлен на витрину достижений
  const media = c.displayedAchievements?.includes("media_advanced")
    ? "advanced"
    : c.displayedAchievements?.includes("media_base")
      ? "base"
      : null;

  return (
    <>
      <div className="desk-split">
        <div className="desk-main">
          <Tilt
            className={`glass ${styles.hero}`}
            style={{ "--ally": alliance.color } as React.CSSProperties}
            max={7}
            data-creator={creator || undefined}
            data-media={(!creator && media) || undefined}
          >
            {(creator || media) && (
              <div className="row" style={{ flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                {creator && (
                  <span className={styles.creatorBadge}>
                    <Icon name="star" size={14} filled />
                    {t.creator}
                  </span>
                )}
                {media && (
                  <span className={styles.mediaBadge} data-tier={media}>
                    <Icon name="share" size={13} />
                    {media === "advanced" ? t.mediaAdvanced : t.media}
                  </span>
                )}
              </div>
            )}
            <div className={`${styles.emblem} depth`}>
              {alliance.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={alliance.image} alt={allianceLabel} width={72} height={72} />
              ) : (
                <span className="display">{c.username.slice(0, 1).toUpperCase()}</span>
              )}
            </div>
            <h1 className={`display ${styles.name}`}>{c.username}</h1>
            <div className="row" style={{ flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
              <span className="pill" style={{ color: alliance.color }}>
                <span className="dot" />
                {allianceLabel}
              </span>
              <span className="pill" style={{ color: online ? "var(--green)" : "var(--text-3)" }}>
                <span className={`dot ${online ? "live" : ""}`} />
                {online ? t.online : now && c.lastLogin ? t.lastSeen(formatRelative(c.lastLogin, now)) : t.offline}
              </span>
            </div>
            {creator && (
              <span className={styles.creatorNick}>
                {t.author} · {CREATOR.nick}
              </span>
            )}
          </Tilt>

          {creator ? (
            <CreatorCard status={c.status} />
          ) : (
            hasStatus(c.status) && (
              <section className={`glass ${styles.creatorCard}`}>
                <Status status={c.status} />
              </section>
            )
          )}

          {c.clan?.info && (
            <Link href={`/clans/${region}/${c.clan.info.id}`} className={`list-row ${styles.clan}`}>
              <span className={styles.clanTag}>{stripMc(c.clan.info.tag)}</span>
              <span style={{ flex: 1, minWidth: 0, display: "grid", gap: 2 }}>
                <strong className="truncate">
                  <McText text={c.clan.info.name} />
                </strong>
                <span className="dim" style={{ fontSize: 12, fontWeight: 600 }}>
                  {rankLabel(c.clan.member.rank, lang)}
                  {c.clan.member.joinTime && ` · ${t.since(formatDate(c.clan.member.joinTime))}`}
                </span>
              </span>
              <Icon name="chevron" size={18} className="dim" />
            </Link>
          )}

          <section className={`${styles.highlights} stagger`}>
            <StatTile
              label="K/D"
              tone="acc"
              value={deaths ? (kills / deaths).toFixed(2) : kills ? "∞" : "—"}
              hint={`${formatNumber(kills)} / ${formatNumber(deaths)}`}
            />
            <StatTile
              label={t.played}
              value={playMs ? t.hours(formatNumber(playMs / 3_600_000)) : "—"}
              hint={regTime ? t.inZoneSince(formatDate(regTime)) : undefined}
            />
            <StatTile
              label={t.accuracy}
              value={shots ? `${((hits / shots) * 100).toFixed(1)}%` : "—"}
              hint={hits ? t.headshots(((stat("sho-hea") / hits) * 100).toFixed(1)) : undefined}
            />
            <StatTile label={t.maxStreak} value={formatNumber(stat("max-kil-ser"))} hint={t.mutants(formatNumber(stat("mut-kil")))} />
          </section>

          <PlayerProgress region={region} name={c.username} meta={meta} />

          <CompareEntry region={region} name={c.username} />
        </div>
        <div className="desk-side">
          {c.displayedAchievements?.length > 0 && (
            <section className="section">
              <h2 className="section-title">
                {t.achievements} <small>{c.displayedAchievements.length}</small>
              </h2>
              <div className={styles.achievements}>
                {c.displayedAchievements.map((id) => {
                  const a = meta?.achievements[id];
                  const title = (lang === "en" && a?.[3]) || a?.[0];
                  const description = (lang === "en" && a?.[4]) || a?.[1];
                  return (
                    <div key={id} className={styles.achievement}>
                      <Icon name="trophy" size={18} />
                      <span style={{ minWidth: 0 }}>
                        <strong>{title ?? id}</strong>
                        {description && <small>{description}</small>}
                      </span>
                      {a?.[2] ? <b className="mono">{a[2]}</b> : null}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {c.stats?.length > 0 && <AllStats stats={c.stats} meta={meta} />}
        </div>
      </div>
    </>
  );
}

/** Строка длиннее этого в карточку не влезет — значит, это арт, а не текст. */
const ART_LINE = 34;
const hasStatus = (status?: string) => Boolean(status && stripMc(status).trim());

/**
 * Описание персонажа из игры. Разбиваем на блоки по пустым строкам: обычный текст — как есть,
 * блок с длинными строками (ASCII-арт, рамки) — моноширинно и с уменьшением под ширину карточки.
 */
function Status({ status, divided = false }: { status?: string; divided?: boolean }) {
  const t = useT().player;
  const blocks: string[][] = [];
  let current: string[] = [];
  for (const line of (status ?? "").split("\n")) {
    if (stripMc(line).trim()) {
      current.push(line.replace(/\s+$/, ""));
    } else if (current.length) {
      blocks.push(current);
      current = [];
    }
  }
  if (current.length) blocks.push(current);
  if (!blocks.length) return null;

  return (
    <div className={styles.status} data-divided={divided || undefined}>
      <span className={styles.statusLabel}>{t.description}</span>
      {blocks.map((block, b) => {
        const width = Math.max(...block.map((l) => stripMc(l).length));
        if (width <= ART_LINE) {
          return block.map((l, i) => (
            <span key={`${b}-${i}`} className={styles.statusText}>
              <McText text={l.trim()} />
            </span>
          ));
        }
        return (
          <div key={b} className={styles.art} style={{ "--cols": width } as React.CSSProperties}>
            {block.map((l, i) => (
              <div key={i}>
                <McText text={l} />
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

/** Карточка автора сервиса: пара слов и описание персонажа. */
function CreatorCard({ status }: { status?: string }) {
  const t = useT().player;
  return (
    <section className={`glass ${styles.creatorCard}`}>
      <p className={styles.creatorText}>{t.creatorText}</p>
      <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
        <span className={`pill ${styles.creatorPill}`}>
          <Icon name="sparkle" size={14} /> {t.authorPill}
        </span>
        <Link href="/pro" className={`pill ${styles.creatorPill}`}>
          <Icon name="star" size={14} /> {t.supportPro}
        </Link>
      </div>
      <Status status={status} divided />
    </section>
  );
}

function formatStat(stat: Stat, { formatDate, formatNumber }: Format, hours: (v: string) => string) {
  const v = stat.value;
  if (typeof v !== "number" && typeof v !== "string") return null;
  switch (stat.type) {
    case "DATE":
      return formatDate(v);
    case "DURATION":
      return hours(formatNumber(Number(v) / 3_600_000));
    case "DECIMAL":
      return formatNumber(Number(v));
    case "INTEGER":
      return formatNumber(Number(v));
    default:
      return null;
  }
}

function AllStats({ stats, meta }: { stats: Stat[]; meta?: Meta }) {
  const t = useT().player;
  const lang = useLang();
  const format = useFormat();
  const [filter, setFilter] = useState("");
  const q = useDeferredValue(filter.trim().toLowerCase());
  const categories = lang === "en" ? STAT_CATEGORIES_EN : STAT_CATEGORIES;

  const groups = new Map<string, { label: string; value: string }[]>();
  for (const s of stats) {
    const value = formatStat(s, format, t.hours);
    if (value == null) continue;
    const [labelRu, category, , labelEn] = meta?.stats[s.id] ?? [s.id, "NONE"];
    const label = (lang === "en" && labelEn) || labelRu;
    if (q && !label.toLowerCase().includes(q)) continue;
    const list = groups.get(category) ?? [];
    list.push({ label, value });
    groups.set(category, list);
  }

  return (
    <section className="section">
      <h2 className="section-title">{t.allStats}</h2>
      <SearchField value={filter} onChange={setFilter} placeholder={t.findStat} aria-label={t.statsFilterAria} />
      <div className="stack" style={{ marginTop: 12 }}>
        {[...groups].map(([category, list]) => (
          <details key={category} className={styles.group} open={!!q || category === "COMBAT" || category === "SURVIVAL"}>
            <summary>
              {categories[category] ?? category}
              <span className="dim mono">{list.length}</span>
            </summary>
            <dl>
              {list.map((s) => (
                <div key={s.label}>
                  <dt>{s.label}</dt>
                  <dd className="mono">{s.value}</dd>
                </div>
              ))}
            </dl>
          </details>
        ))}
        {!groups.size && <EmptyState title={t.noMatches} />}
      </div>
    </section>
  );
}
