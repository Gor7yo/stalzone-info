"use client";

import Link from "next/link";
import { useState } from "react";
import { ClanEmblem } from "@/components/ClanEmblem";
import { Icon } from "@/components/Icon";
import { FavButton } from "@/components/ui/Buttons";
import { PageHeader } from "@/components/ui/PageHeader";
import { RegionSwitch } from "@/components/ui/RegionSwitch";
import { SearchField } from "@/components/ui/SearchField";
import { EmptyState, ErrorState, RowSkeleton } from "@/components/ui/States";
import { CLANS_PAGE, useClans, useClanSearch, useDebounced, type Clan } from "@/features/clans";
import { useFormat, useT } from "@/i18n/client";
import { clanLevel } from "@/lib/clanLevel";
import { stripMc } from "@/lib/mcText";
import { actions, useApp, type Region } from "@/lib/store";
import { haptic } from "@/lib/telegram";

export default function ClansPage() {
  const tAll = useT();
  const t = tAll.clans;
  const { formatNumber } = useFormat();
  const region = useApp((s) => s.region);
  const favClans = useApp((s) => s.favClans);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState("");
  const q = useDebounced(filter.trim());

  const { data, isLoading, isError, refetch, isPlaceholderData } = useClans(region, page);
  const total = data?.totalClans ?? 0;
  const pages = Math.max(1, Math.ceil(total / CLANS_PAGE));

  // поиск по всем кланам региона — на сервере; пока сервер не загрузил список (сразу после деплоя),
  // фильтруем открытую страницу, как раньше
  const search = useClanSearch(region, q);
  const searching = q.length > 0;
  const serverSearch = searching && search.data?.syncedAt !== null;
  const lq = q.toLowerCase();
  const pageClans = (data?.data ?? []).filter(
    (c) =>
      !searching ||
      stripMc(c.name).toLowerCase().includes(lq) ||
      stripMc(c.tag).toLowerCase().includes(lq) ||
      c.leader?.toLowerCase().includes(lq),
  );
  const clans = serverSearch ? (search.data?.data ?? []) : pageClans;
  const state = serverSearch ? search : { isLoading, isError, refetch, isPlaceholderData };
  const found = search.data?.total ?? 0;

  const go = (p: number) => {
    haptic.select();
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="page">
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        aside={
          <RegionSwitch
            onChange={(r) => {
              actions.setRegion(r);
              setPage(0);
            }}
          />
        }
      >
        {total ? t.inRegion(t.clansCount(total, formatNumber(total)), region.toUpperCase()) : t.lead}
      </PageHeader>

      {favClans.filter((c) => c.region === region).length > 0 && (
        <section style={{ marginBottom: 20 }}>
          <h2 className="section-title">{t.favorites}</h2>
          <div className="chips">
            {favClans
              .filter((c) => c.region === region)
              .map((c) => (
                <Link key={c.id} href={`/clans/${c.region}/${c.id}`} className="chip">
                  [{stripMc(c.tag)}] {stripMc(c.name)}
                </Link>
              ))}
          </div>
        </section>
      )}

      <Link href="/clans/analytics" className="list-row" style={{ marginBottom: 12 }} onClick={() => haptic.tap()}>
        <span
          style={{
            display: "grid",
            placeItems: "center",
            width: 40,
            height: 40,
            borderRadius: 13,
            background: "rgb(var(--acc-rgb) / 0.12)",
            color: "var(--acc)",
            flex: "none",
          }}
        >
          <Icon name="market" size={20} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ fontSize: 14 }}>{t.analytics}</strong>
          <span className="dim" style={{ display: "block", fontSize: 12, fontWeight: 600 }}>
            {t.analyticsHint}
          </span>
        </span>
        <Icon name="chevron" size={18} className="dim" />
      </Link>

      <SearchField value={filter} onChange={setFilter} placeholder={t.searchPlaceholder} aria-label={t.searchAria} />

      <section className="section" style={{ marginTop: 16 }}>
        {serverSearch && search.data && (
          <p className="dim" style={{ fontSize: 13, fontWeight: 600, margin: "0 2px 10px" }}>
            {found ? t.found(t.clansCount(found, formatNumber(found)), found > clans.length ? clans.length : null) : null}
          </p>
        )}
        {searching && !serverSearch && search.data && (
          <p className="dim" style={{ fontSize: 13, fontWeight: 600, margin: "0 2px 10px" }}>
            {t.syncing}
          </p>
        )}

        {state.isError ? (
          <ErrorState onRetry={() => state.refetch()} />
        ) : state.isLoading ? (
          <RowSkeleton count={8} />
        ) : clans.length ? (
          <div
            className="stack stagger desk-grid"
            style={{ gap: 8, opacity: state.isPlaceholderData ? 0.5 : 1, transition: "opacity 200ms" }}
          >
            {clans.map((clan) => (
              <ClanRow key={clan.id} clan={clan} region={region} />
            ))}
          </div>
        ) : (
          <EmptyState title={t.notFound} text={serverSearch ? t.notFoundSearch : searching ? t.notFoundPage : undefined} />
        )}

        {!serverSearch && pages > 1 && !isError && (
          <nav className="row" style={{ marginTop: 16, justifyContent: "space-between" }} aria-label={tAll.chart.pages}>
            <button type="button" className="btn" disabled={page === 0} onClick={() => go(page - 1)} aria-label={tAll.chart.prevPage}>
              <Icon name="back" size={18} />
            </button>
            <span className="mono muted" style={{ fontSize: 13, fontWeight: 700 }}>
              {page + 1} / {pages}
            </span>
            <button
              type="button"
              className="btn"
              disabled={page >= pages - 1}
              onClick={() => go(page + 1)}
              aria-label={tAll.chart.nextPage}
            >
              <Icon name="chevron" size={18} />
            </button>
          </nav>
        )}
      </section>
    </main>
  );
}

function ClanRow({ clan, region }: { clan: Clan; region: Region }) {
  const t = useT().clans;
  const { formatNumber } = useFormat();
  const isFav = useApp((s) => s.favClans.some((c) => c.id === clan.id));

  return (
    <Link href={`/clans/${region}/${clan.id}`} className="list-row" onClick={() => haptic.tap()}>
      <ClanEmblem alliance={clan.alliance} tag={clan.tag} />
      <span style={{ flex: 1, minWidth: 0, display: "grid", gap: 2 }}>
        <strong className="truncate">
          [{stripMc(clan.tag)}] {stripMc(clan.name)}
        </strong>
        <span className="dim truncate" style={{ fontSize: 12, fontWeight: 600 }}>
          {t.lvl(clanLevel(clan.level))} · {t.fighters(clan.memberCount, formatNumber(clan.memberCount))} · {clan.leader}
        </span>
      </span>
      <FavButton
        active={isFav}
        onToggle={() =>
          actions.toggleFavClan({ region, id: clan.id, name: stripMc(clan.name), tag: stripMc(clan.tag), alliance: clan.alliance })
        }
      />
    </Link>
  );
}
