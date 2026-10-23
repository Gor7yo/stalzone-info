"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { PageHeader } from "@/components/ui/PageHeader";
import { RegionSwitch } from "@/components/ui/RegionSwitch";
import { SearchField } from "@/components/ui/SearchField";
import { EmptyState } from "@/components/ui/States";
import { useT } from "@/i18n/client";
import { actions, useApp, type CharacterRef } from "@/lib/store";
import { haptic } from "@/lib/telegram";

export default function CharacterSearchPage() {
  const t = useT();
  const router = useRouter();
  const region = useApp((s) => s.region);
  const favs = useApp((s) => s.favCharacters);
  const recents = useApp((s) => s.recentCharacters);
  const [name, setName] = useState("");

  // как на сервере: любые буквы (в т.ч. кириллица), цифры, _ . -
  const valid = /^[\p{L}\p{N}_.-]{2,32}$/u.test(name.trim());

  const open = () => {
    if (!valid) return;
    haptic.tap("medium");
    router.push(`/character/${region}/${encodeURIComponent(name.trim())}`);
  };

  return (
    <main className="page">
      <PageHeader eyebrow={t.players.eyebrow} title={t.players.title} aside={<RegionSwitch />}>
        {t.players.lead}
      </PageHeader>

      <SearchField
        value={name}
        onChange={setName}
        onSubmit={open}
        placeholder={t.players.nick}
        aria-label={t.players.nick}
        autoCapitalize="off"
        action={
          <button type="submit" className="btn primary" style={{ height: 40, padding: "0 16px" }} disabled={!valid}>
            {t.players.find}
          </button>
        }
      />

      {favs.length > 0 && <People title={t.players.favorites} people={favs} />}
      {recents.length > 0 && (
        <People
          title={t.players.recent}
          people={recents}
          action={
            <button type="button" onClick={actions.clearRecentCharacters}>
              {t.common.clear}
            </button>
          }
        />
      )}

      {!favs.length && !recents.length && (
        <div className="section">
          <EmptyState icon="user" title={t.players.emptyTitle} text={t.players.emptyText} />
        </div>
      )}
    </main>
  );
}

function People({ title, people, action }: { title: string; people: CharacterRef[]; action?: React.ReactNode }) {
  return (
    <section className="section">
      <h2 className="section-title">
        {title}
        {action}
      </h2>
      <div className="stack stagger desk-grid" style={{ gap: 8 }}>
        {people.map((p) => (
          <Link
            key={`${p.region}-${p.name}`}
            href={`/character/${p.region}/${encodeURIComponent(p.name)}`}
            className="list-row"
            onClick={() => haptic.tap()}
          >
            <PlayerAvatar alliance={p.alliance} />
            <span className="row" style={{ flex: 1, minWidth: 0, gap: 8 }}>
              <strong className="truncate">{p.name}</strong>
              {p.clanTag && (
                <span className="pill" style={{ color: "#c08bff", fontFamily: "var(--font-mono)", flex: "none" }}>
                  {p.clanTag}
                </span>
              )}
            </span>
            <span className="pill dim">{p.region.toUpperCase()}</span>
            <Icon name="chevron" size={18} className="dim" />
          </Link>
        ))}
      </div>
    </section>
  );
}
