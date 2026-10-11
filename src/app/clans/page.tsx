"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { ClanEmblem } from "@/components/ClanEmblem";
import { Icon } from "@/components/Icon";
import { FavButton } from "@/components/ui/Buttons";
import { PageHeader } from "@/components/ui/PageHeader";
import { RegionSwitch } from "@/components/ui/RegionSwitch";
import { SearchField } from "@/components/ui/SearchField";
import { EmptyState, ErrorState, RowSkeleton } from "@/components/ui/States";
import { CLANS_PAGE, useClans, type Clan } from "@/features/clans";
import { formatNumber, plural } from "@/lib/format";
import { stripMc } from "@/lib/mcText";
import { actions, useApp, type Region } from "@/lib/store";
import { haptic } from "@/lib/telegram";

export default function ClansPage() {
  const region = useApp((s) => s.region);
  const favClans = useApp((s) => s.favClans);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState("");
  const q = useDeferredValue(filter.trim().toLowerCase());

  const { data, isLoading, isError, refetch, isPlaceholderData } = useClans(region, page);
  const total = data?.totalClans ?? 0;
  const pages = Math.max(1, Math.ceil(total / CLANS_PAGE));
  const clans = (data?.data ?? []).filter(
    (c) => !q || stripMc(c.name).toLowerCase().includes(q) || stripMc(c.tag).toLowerCase().includes(q) || c.leader?.toLowerCase().includes(q),
  );

  const go = (p: number) => {
    haptic.select();
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="page">
      <PageHeader
        eyebrow="Реестр"
        title="Кланы"
        aside={
          <RegionSwitch
            onChange={(r) => {
              actions.setRegion(r);
              setPage(0);
            }}
          />
        }
      >
        {total ? `${formatNumber(total)} ${plural(total, ["клан", "клана", "кланов"])} в регионе ${region.toUpperCase()}` : "Составы, уровни и лидеры кланов."}
      </PageHeader>

      {favClans.filter((c) => c.region === region).length > 0 && (
        <section style={{ marginBottom: 20 }}>
          <h2 className="section-title">Избранные</h2>
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

      <SearchField value={filter} onChange={setFilter} placeholder="Фильтр по названию, тегу, лидеру" aria-label="Фильтр кланов" />

      <section className="section" style={{ marginTop: 16 }}>
        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : isLoading ? (
          <RowSkeleton count={8} />
        ) : clans.length ? (
          <div className="stack stagger" style={{ gap: 8, opacity: isPlaceholderData ? 0.5 : 1, transition: "opacity 200ms" }}>
            {clans.map((clan, i) => (
              <ClanRow key={clan.id} clan={clan} region={region} rank={page * CLANS_PAGE + (data?.data.indexOf(clan) ?? i) + 1} />
            ))}
          </div>
        ) : (
          <EmptyState title="Кланов не найдено" text={q ? "На этой странице нет совпадений — попробуйте другие страницы." : undefined} />
        )}

        {pages > 1 && !isError && (
          <nav className="row" style={{ marginTop: 16, justifyContent: "space-between" }} aria-label="Страницы">
            <button type="button" className="btn" disabled={page === 0} onClick={() => go(page - 1)} aria-label="Назад">
              <Icon name="back" size={18} />
            </button>
            <span className="mono muted" style={{ fontSize: 13, fontWeight: 700 }}>
              {page + 1} / {pages}
            </span>
            <button type="button" className="btn" disabled={page >= pages - 1} onClick={() => go(page + 1)} aria-label="Вперёд">
              <Icon name="chevron" size={18} />
            </button>
          </nav>
        )}
      </section>
    </main>
  );
}

function ClanRow({ clan, region, rank }: { clan: Clan; region: Region; rank: number }) {
  const isFav = useApp((s) => s.favClans.some((c) => c.id === clan.id));

  return (
    <Link href={`/clans/${region}/${clan.id}`} className="list-row" onClick={() => haptic.tap()}>
      <ClanEmblem alliance={clan.alliance} tag={clan.tag} />
      <span style={{ flex: 1, minWidth: 0, display: "grid", gap: 2 }}>
        <strong className="truncate">
          <span className="mono dim" style={{ fontSize: 12 }}>
            #{rank}{" "}
          </span>
          [{stripMc(clan.tag)}] {stripMc(clan.name)}
        </strong>
        <span className="dim truncate" style={{ fontSize: 12, fontWeight: 600 }}>
          ур. {clan.level} · {formatNumber(clan.memberCount)} {plural(clan.memberCount, ["боец", "бойца", "бойцов"])} · {clan.leader}
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
