"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { Tilt } from "@/components/Tilt/Tilt";
import { FavButton, ShareButton } from "@/components/ui/Buttons";
import { StatTile } from "@/components/ui/PageHeader";
import { SearchField } from "@/components/ui/SearchField";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { allianceOf } from "@/features/alliances";
import { useCharacter, type Character, type Stat } from "@/features/character";
import { RANKS } from "@/features/clans";
import { STAT_CATEGORIES, useMeta, type Meta } from "@/features/meta";
import { isNotFound } from "@/lib/api";
import { McText, stripMc } from "@/lib/mcText";
import { formatDate, formatNumber, formatRelative } from "@/lib/format";
import { actions, sameChar, useApp, type Region } from "@/lib/store";
import { useNow } from "@/lib/useNow";
import styles from "./character.module.css";

export function CharacterView({ region, name }: { region: Region; name: string }) {
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
          <ShareButton text={`Досье сталкера ${data?.username ?? name}`} />
          <FavButton active={isFav} onToggle={() => actions.toggleFavCharacter({ region, name: data?.username ?? name })} />
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
          <EmptyState icon="user" title="Сталкер не найден" text={`Нет персонажа «${name}» в регионе ${region.toUpperCase()}. Проверьте ник или регион.`}>
            <Link href="/character" className="btn">
              Новый поиск
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
  const now = useNow(60_000);
  const alliance = allianceOf(c.alliance);
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

  return (
    <>
      <Tilt className={`glass ${styles.hero}`} style={{ "--ally": alliance.color } as React.CSSProperties} max={7}>
        <div className={`${styles.emblem} depth`}>
          {alliance.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={alliance.image} alt={alliance.label} width={72} height={72} />
          ) : (
            <span className="display">{c.username.slice(0, 1).toUpperCase()}</span>
          )}
        </div>
        <h1 className={`display ${styles.name}`}>{c.username}</h1>
        <div className="row" style={{ flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
          <span className="pill" style={{ color: alliance.color }}>
            <span className="dot" />
            {alliance.label}
          </span>
          <span className="pill" style={{ color: online ? "var(--green)" : "var(--text-3)" }}>
            <span className={`dot ${online ? "live" : ""}`} />
            {online ? "В сети" : now && c.lastLogin ? `был ${formatRelative(c.lastLogin, now)}` : "Не в сети"}
          </span>
        </div>
      </Tilt>

      {c.clan?.info && (
        <Link href={`/clans/${region}/${c.clan.info.id}`} className={`list-row ${styles.clan}`}>
          <span className={styles.clanTag}>{stripMc(c.clan.info.tag)}</span>
          <span style={{ flex: 1, minWidth: 0, display: "grid", gap: 2 }}>
            <strong className="truncate">
              <McText text={c.clan.info.name} />
            </strong>
            <span className="dim" style={{ fontSize: 12, fontWeight: 600 }}>
              {RANKS[c.clan.member.rank] ?? c.clan.member.rank}
              {c.clan.member.joinTime && ` · с ${formatDate(c.clan.member.joinTime)}`}
            </span>
          </span>
          <Icon name="chevron" size={18} className="dim" />
        </Link>
      )}

      <section className={`${styles.highlights} stagger`}>
        <StatTile label="K/D" tone="acc" value={deaths ? (kills / deaths).toFixed(2) : kills ? "∞" : "—"} hint={`${formatNumber(kills)} / ${formatNumber(deaths)}`} />
        <StatTile label="В игре" value={playMs ? `${formatNumber(playMs / 3_600_000)} ч` : "—"} hint={regTime ? `в Зоне с ${formatDate(regTime)}` : undefined} />
        <StatTile label="Точность" value={shots ? `${((hits / shots) * 100).toFixed(1)}%` : "—"} hint={hits ? `в голову ${((stat("sho-hea") / hits) * 100).toFixed(1)}%` : undefined} />
        <StatTile label="Макс. серия" value={formatNumber(stat("max-kil-ser"))} hint={`мутантов ${formatNumber(stat("mut-kil"))}`} />
      </section>

      {c.displayedAchievements?.length > 0 && (
        <section className="section">
          <h2 className="section-title">
            Витрина достижений <small>{c.displayedAchievements.length}</small>
          </h2>
          <div className={styles.achievements}>
            {c.displayedAchievements.map((id) => {
              const a = meta?.achievements[id];
              return (
                <div key={id} className={styles.achievement}>
                  <Icon name="trophy" size={18} />
                  <span style={{ minWidth: 0 }}>
                    <strong>{a?.[0] ?? id}</strong>
                    {a?.[1] && <small>{a[1]}</small>}
                  </span>
                  {a?.[2] ? <b className="mono">{a[2]}</b> : null}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {c.stats?.length > 0 && <AllStats stats={c.stats} meta={meta} />}
    </>
  );
}

function formatStat(stat: Stat) {
  const v = stat.value;
  if (typeof v !== "number" && typeof v !== "string") return null;
  switch (stat.type) {
    case "DATE":
      return formatDate(v);
    case "DURATION":
      return `${formatNumber(Number(v) / 3_600_000)} ч`;
    case "DECIMAL":
      return formatNumber(Number(v));
    case "INTEGER":
      return formatNumber(Number(v));
    default:
      return null;
  }
}

function AllStats({ stats, meta }: { stats: Stat[]; meta?: Meta }) {
  const [filter, setFilter] = useState("");
  const q = useDeferredValue(filter.trim().toLowerCase());

  const groups = new Map<string, { label: string; value: string }[]>();
  for (const s of stats) {
    const value = formatStat(s);
    if (value == null) continue;
    const [label, category] = meta?.stats[s.id] ?? [s.id, "NONE"];
    if (q && !label.toLowerCase().includes(q)) continue;
    const list = groups.get(category) ?? [];
    list.push({ label, value });
    groups.set(category, list);
  }

  return (
    <section className="section">
      <h2 className="section-title">Вся статистика</h2>
      <SearchField value={filter} onChange={setFilter} placeholder="Найти показатель" aria-label="Фильтр статистики" />
      <div className="stack" style={{ marginTop: 12 }}>
        {[...groups].map(([category, list]) => (
          <details key={category} className={styles.group} open={!!q || category === "COMBAT" || category === "SURVIVAL"}>
            <summary>
              {STAT_CATEGORIES[category] ?? category}
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
        {!groups.size && <EmptyState title="Нет совпадений" />}
      </div>
    </section>
  );
}
