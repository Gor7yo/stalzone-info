"use client";

import Link from "next/link";
import { Tilt } from "@/components/Tilt/Tilt";
import { ShareButton } from "@/components/ui/Buttons";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { allianceName, allianceOf } from "@/features/alliances";
import { useCharacter, useProgress, type Character, type Progress } from "@/features/character";
import { compareStats, score, type CompareKey } from "@/features/compare";
import { useFormat, useLang, useT } from "@/i18n/client";
import { isNotFound } from "@/lib/api";
import { stripMc } from "@/lib/mcText";
import type { Region } from "@/lib/store";
import { CompareEntry } from "../../CompareEntry";
import { Radar } from "./Radar";
import styles from "./compare.module.css";

const HOUR = 3_600_000;

export interface Row {
  /** показатель профиля; у строк «за неделю» нет — они не идут в октагон */
  key?: CompareKey;
  label: string;
  a: number;
  b: number;
  format: (n: number) => string;
}

/** Два игрока рядом: кто в чём сильнее, общий счёт и прогресс за неделю. */
export function CompareView({ region, a, b }: { region: Region; a: string; b: string }) {
  const t = useT().player;
  const A = useCharacter(region, a);
  const B = useCharacter(region, b);
  const pa = useProgress(region, a, "week", !!A.data);
  const pb = useProgress(region, b, "week", !!B.data);

  const missing = [A, B].map((q, i) => (isNotFound(q.error) ? [a, b][i] : null)).find(Boolean);

  return (
    <main className="page">
      <div className={styles.toolbar}>
        <span className="pill dim">{region.toUpperCase()}</span>
        <ShareButton text={t.compare.shareText(A.data?.username ?? a, B.data?.username ?? b)} />
      </div>

      {A.isLoading || B.isLoading ? (
        <div className="stack">
          <div className="skeleton" style={{ height: 200, borderRadius: 22 }} />
          <div className="skeleton" style={{ height: 320, borderRadius: 22 }} />
        </div>
      ) : missing ? (
        <EmptyState icon="user" title={t.notFound} text={t.notFoundText(missing, region.toUpperCase())}>
          <Link href={`/character/${region}/${encodeURIComponent(missing === a ? b : a)}`} className="btn">
            {t.compare.back}
          </Link>
        </EmptyState>
      ) : A.error || B.error ? (
        <ErrorState
          onRetry={() => {
            void A.refetch();
            void B.refetch();
          }}
        />
      ) : A.data && B.data ? (
        <Versus region={region} a={A.data} b={B.data} pa={pa.data} pb={pb.data} />
      ) : null}
    </main>
  );
}

function Versus({ region, a, b, pa, pb }: { region: Region; a: Character; b: Character; pa?: Progress; pb?: Progress }) {
  const t = useT().player;
  const { formatNumber, formatShort } = useFormat();
  const rows = buildRows(a, b, pa, pb, t, formatNumber, formatShort).filter((r) => r.a || r.b);
  const { a: winsA, b: winsB } = score(rows);
  const leader = winsA === winsB ? null : winsA > winsB ? a.username : b.username;

  return (
    <>
      <div className={styles.heads}>
        <Head region={region} c={a} side="a" />
        <div className={styles.vs}>
          <span className="display">VS</span>
          <strong className="mono">
            <b data-side="a">{winsA}</b>:<b data-side="b">{winsB}</b>
          </strong>
        </div>
        <Head region={region} c={b} side="b" />
      </div>

      <p className={styles.verdict}>{leader ? t.compare.leads(leader) : t.compare.draw}</p>

      {/* октагон — только общие показатели профиля (строки «за неделю» без key) */}
      <Radar axes={rows.filter((r) => r.key)} nameA={a.username} nameB={b.username} />

      <section className={`glass ${styles.rows}`}>
        {rows.map((r) => {
          const total = r.a + r.b || 1;
          const win = r.a === r.b ? null : r.a > r.b ? "a" : "b";
          return (
            <div key={r.label} className={styles.row}>
              <span className={styles.value} data-side="a" data-win={win === "a" || undefined}>
                {r.format(r.a)}
              </span>
              <span className={styles.label}>
                {r.label}
                <span className={styles.bar} style={{ "--share": r.a / total } as React.CSSProperties} aria-hidden>
                  <i data-side="a" data-win={win === "a" || undefined} />
                  <i data-side="b" data-win={win === "b" || undefined} />
                </span>
              </span>
              <span className={styles.value} data-side="b" data-win={win === "b" || undefined}>
                {r.format(r.b)}
              </span>
            </div>
          );
        })}
      </section>

      <CompareEntry region={region} name={a.username} exclude={[b.username]} title={t.compare.another} />
    </>
  );
}

function Head({ region, c, side }: { region: Region; c: Character; side: "a" | "b" }) {
  const lang = useLang();
  const alliance = allianceOf(c.alliance);
  return (
    <Tilt max={8} className={`glass ${styles.head}`} data-side={side}>
      <Link href={`/character/${region}/${encodeURIComponent(c.username)}`} className={styles.headLink}>
        <span className={styles.emblem} style={{ "--ally": alliance.color } as React.CSSProperties}>
          {alliance.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={alliance.image} alt="" width={44} height={44} />
          ) : (
            <span className="display">{c.username.slice(0, 1).toUpperCase()}</span>
          )}
        </span>
        <strong className={`display ${styles.name}`}>
          {/* перенос по «_», а не посреди слова: BANDIT__ / IVAN_KIL */}
          {c.username.split(/(?<=_)(?!_)/).map((part, i) => (
            <span key={i}>
              {i > 0 && <wbr />}
              {part}
            </span>
          ))}
        </strong>
        <small style={{ color: alliance.color }}>
          {allianceName(alliance, lang)}
          {c.clan?.info && ` · [${stripMc(c.clan.info.tag)}]`}
        </small>
      </Link>
    </Tilt>
  );
}

function buildRows(
  a: Character,
  b: Character,
  pa: Progress | undefined,
  pb: Progress | undefined,
  t: ReturnType<typeof useT>["player"],
  formatNumber: (n: number) => string,
  formatShort: (n: number) => string,
): Row[] {
  const num = (n: number) => formatNumber(Math.round(n));
  const hours = (n: number) => t.hours(formatNumber(Math.round(n * 10) / 10));
  const percent = (n: number) => `${n.toFixed(1)}%`;
  const view: Record<CompareKey, { label: string; format: (n: number) => string }> = {
    kd: { label: "K/D", format: (n) => n.toFixed(2) },
    kills: { label: t.compare.kills, format: num },
    played: { label: t.played, format: hours },
    accuracy: { label: t.accuracy, format: percent },
    headshots: { label: t.compare.headshots, format: percent },
    streak: { label: t.maxStreak, format: num },
    mutants: { label: t.compare.mutants, format: num },
    damage: { label: t.compare.damage, format: formatShort },
  };

  const rows: Row[] = compareStats(a, b).map((r) => ({ ...r, ...view[r.key] }));
  // прогресс за неделю — только если история есть у обоих
  if (pa?.from && pb?.from) {
    rows.push(
      { label: t.compare.weekKills, a: pa.deltas.kil ?? 0, b: pb.deltas.kil ?? 0, format: (n) => `+${num(n)}` },
      {
        label: t.compare.weekPlayed,
        a: (pa.deltas["pla-tim"] ?? 0) / HOUR,
        b: (pb.deltas["pla-tim"] ?? 0) / HOUR,
        format: (n) => `+${hours(n)}`,
      },
    );
  }
  return rows;
}
