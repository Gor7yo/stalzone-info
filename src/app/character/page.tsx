"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { RegionSwitch } from "@/components/ui/RegionSwitch";
import { SearchField } from "@/components/ui/SearchField";
import { EmptyState } from "@/components/ui/States";
import { actions, useApp, type CharacterRef } from "@/lib/store";
import { haptic } from "@/lib/telegram";

export default function CharacterSearchPage() {
  const router = useRouter();
  const region = useApp((s) => s.region);
  const favs = useApp((s) => s.favCharacters);
  const recents = useApp((s) => s.recentCharacters);
  const [name, setName] = useState("");

  const valid = /^[\w.-]{2,24}$/.test(name.trim());

  const open = () => {
    if (!valid) return;
    haptic.tap("medium");
    router.push(`/character/${region}/${encodeURIComponent(name.trim())}`);
  };

  return (
    <main className="page">
      <PageHeader eyebrow="Досье" title="Сталкеры" aside={<RegionSwitch />}>
        Профиль, группировка, клан и вся статистика по нику.
      </PageHeader>

      <SearchField
        value={name}
        onChange={setName}
        onSubmit={open}
        placeholder="Ник персонажа"
        aria-label="Ник персонажа"
        autoCapitalize="off"
        action={
          <button type="submit" className="btn primary" style={{ height: 40, padding: "0 16px" }} disabled={!valid}>
            Найти
          </button>
        }
      />

      {favs.length > 0 && <People title="Избранные" people={favs} />}
      {recents.length > 0 && (
        <People
          title="Недавние"
          people={recents}
          action={
            <button type="button" onClick={actions.clearRecentCharacters}>
              Очистить
            </button>
          }
        />
      )}

      {!favs.length && !recents.length && (
        <div className="section">
          <EmptyState icon="user" title="Кого ищем?" text="Введите точный ник персонажа и выберите регион сервера." />
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
      <div className="stack stagger" style={{ gap: 8 }}>
        {people.map((p) => (
          <Link
            key={`${p.region}-${p.name}`}
            href={`/character/${p.region}/${encodeURIComponent(p.name)}`}
            className="list-row"
            onClick={() => haptic.tap()}
          >
            <span
              className="display"
              style={{
                display: "grid",
                placeItems: "center",
                width: 44,
                height: 44,
                borderRadius: 14,
                background: "var(--surface-2)",
                fontSize: 16,
                flex: "none",
              }}
            >
              {p.name.slice(0, 1).toUpperCase()}
            </span>
            <strong className="truncate" style={{ flex: 1 }}>
              {p.name}
            </strong>
            <span className="pill dim">{p.region.toUpperCase()}</span>
            <Icon name="chevron" size={18} className="dim" />
          </Link>
        ))}
      </div>
    </section>
  );
}
