"use client";

import Link from "next/link";
import { ClanEmblem } from "@/components/ClanEmblem";
import { Icon } from "@/components/Icon";
import { Tilt } from "@/components/Tilt/Tilt";
import { FavButton, ShareButton } from "@/components/ui/Buttons";
import { StatTile } from "@/components/ui/PageHeader";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { allianceName, allianceOf } from "@/features/alliances";
import { useClan } from "@/features/clans";
import { useFormat, useLang, useT } from "@/i18n/client";
import { ClanMetrics } from "./ClanMetrics";
import { isNotFound } from "@/lib/api";
import { clanLevel } from "@/lib/clanLevel";
import { McText, stripMc } from "@/lib/mcText";
import { actions, useApp, type Region } from "@/lib/store";
import { haptic } from "@/lib/telegram";
import { useNow } from "@/lib/useNow";
import styles from "./clan.module.css";

export function ClanView({ region, id }: { region: Region; id: string }) {
  const t = useT().clans;
  const lang = useLang();
  const { formatNumber, formatRelative, formatShortDate } = useFormat();
  const { data: clan, isLoading, error, refetch } = useClan(region, id);
  const isFav = useApp((s) => s.favClans.some((c) => c.id === id));
  const now = useNow(60_000);

  if (isLoading) {
    return (
      <main className="page stack">
        <div className="skeleton" style={{ height: 220, borderRadius: 22 }} />
        <div className="skeleton" style={{ height: 150, borderRadius: 22 }} />
      </main>
    );
  }

  if (error || !clan) {
    return (
      <main className="page">
        {error && !isNotFound(error) ? (
          <ErrorState onRetry={() => refetch()} />
        ) : (
          <EmptyState icon="shield" title={t.clanNotFound} text={t.clanNotFoundText}>
            <Link href="/clans" className="btn">
              {t.toList}
            </Link>
          </EmptyState>
        )}
      </main>
    );
  }

  const alliance = allianceOf(clan.alliance);

  return (
    <main className="page">
      <div className={styles.toolbar}>
        <span className="pill dim">{region.toUpperCase()}</span>
        <div className="row" style={{ gap: 8 }}>
          <ShareButton text={t.shareText(stripMc(clan.tag), stripMc(clan.name))} />
          <FavButton
            active={isFav}
            onToggle={() =>
              actions.toggleFavClan({
                region,
                id: clan.id,
                name: stripMc(clan.name),
                tag: stripMc(clan.tag),
                alliance: clan.alliance,
              })
            }
          />
        </div>
      </div>

      <div className="desk-split">
        <div className="desk-main">
          <Tilt className={`glass ${styles.hero}`} style={{ "--ally": alliance.color } as React.CSSProperties} max={7}>
            <span className="depth">
              <ClanEmblem alliance={clan.alliance} tag={clan.tag} size={92} />
            </span>
            <span className={`mono ${styles.tag}`}>
              [<McText text={clan.tag} />]
            </span>
            <h1 className={`display ${styles.name}`}>
              <McText text={clan.name} />
            </h1>
            <div className="row" style={{ gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
              <span className="pill" style={{ color: alliance.color }}>
                <span className="dot" />
                {allianceName(alliance, lang)}
              </span>
              <span className="pill">{t.levelN(clanLevel(clan.level))}</span>
            </div>
          </Tilt>

          <ClanMetrics region={region} id={clan.id} />
        </div>
        <div className="desk-side">
          <section className={`${styles.stats} stagger`}>
            <StatTile label={t.members} tone="acc" value={formatNumber(clan.memberCount)} />
            <StatTile label={t.level} value={formatNumber(clanLevel(clan.level))} />
            <StatTile
              label={t.founded}
              value={clan.registrationTime ? formatShortDate(clan.registrationTime) : "—"}
              hint={clan.registrationTime && now ? formatRelative(clan.registrationTime, now) : undefined}
            />
            <StatTile label="ID" value={<span className={styles.clanId}>{clan.id}</span>} />
          </section>

          {clan.leader && (
            <Link
              href={`/character/${region}/${encodeURIComponent(clan.leader)}`}
              className={`list-row ${styles.leader}`}
              onClick={() => haptic.tap()}
            >
              <span className={styles.crown}>
                <Icon name="trophy" size={20} />
              </span>
              <span style={{ flex: 1, minWidth: 0, display: "grid", gap: 2 }}>
                <span
                  className="dim"
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  {t.leader}
                </span>
                <strong className="truncate">{clan.leader}</strong>
              </span>
              <span className="dim" style={{ fontSize: 12, fontWeight: 700 }}>
                {t.dossier}
              </span>
              <Icon name="chevron" size={18} className="dim" />
            </Link>
          )}

          {clan.description && (
            <section className="section">
              <h2 className="section-title">{t.description}</h2>
              <div className={styles.description}>
                <McText text={clan.description} />
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
