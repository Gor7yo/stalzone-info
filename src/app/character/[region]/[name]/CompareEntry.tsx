"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SearchField } from "@/components/ui/SearchField";
import { useT } from "@/i18n/client";
import { useApp, type Region } from "@/lib/store";
import { haptic } from "@/lib/telegram";
import styles from "./vs/[other]/compare.module.css";

/** Сколько знакомых игроков (избранные и недавние) предлагать кнопками. */
const SUGGEST = 5;

/** «Сравнить с игроком»: ник соперника и быстрые кнопки из избранных и недавних. */
export function CompareEntry({ region, name, exclude = [], title }: { region: Region; name: string; exclude?: string[]; title?: string }) {
  const t = useT().player.compare;
  const router = useRouter();
  const favs = useApp((s) => s.favCharacters);
  const recents = useApp((s) => s.recentCharacters);
  const [other, setOther] = useState("");
  const valid = /^[\p{L}\p{N}_.-]{2,32}$/u.test(other.trim());
  const href = (nick: string) => `/character/${region}/${encodeURIComponent(name)}/vs/${encodeURIComponent(nick)}`;

  const skip = new Set([name, ...exclude].map((n) => n.toLowerCase()));
  const known = [...favs, ...recents]
    .filter((c) => c.region === region && !skip.has(c.name.toLowerCase()))
    .filter((c, i, list) => list.findIndex((x) => x.name.toLowerCase() === c.name.toLowerCase()) === i)
    .slice(0, SUGGEST);

  return (
    <section className={`glass ${styles.entry}`}>
      <span className={styles.entryTitle}>⚔️ {title ?? t.title}</span>
      <SearchField
        value={other}
        onChange={setOther}
        onSubmit={() => {
          if (!valid) return;
          haptic.tap("medium");
          router.push(href(other.trim()));
        }}
        placeholder={t.placeholder}
        aria-label={t.placeholder}
        autoCapitalize="off"
        action={
          <button type="submit" className="btn primary" style={{ height: 40, padding: "0 16px" }} disabled={!valid}>
            {t.go}
          </button>
        }
      />
      {known.length > 0 && (
        <div className={styles.known}>
          {known.map((c) => (
            <Link key={c.name} href={href(c.name)} className="pill" onClick={() => haptic.tap()}>
              {c.name}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
