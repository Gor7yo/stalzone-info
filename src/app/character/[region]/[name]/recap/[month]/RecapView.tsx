"use client";

import Link from "next/link";
import { useState } from "react";
import { ShareButton } from "@/components/ui/Buttons";
import { useT } from "@/i18n/client";
import type { Region } from "@/lib/store";
import styles from "./recap.module.css";

/** Итоги месяца: картинка-сторис (её же присылает бот), скачать и поделиться. */
export function RecapView({ region, name, month }: { region: Region; name: string; month: string }) {
  const t = useT().player.recap;
  const [loaded, setLoaded] = useState(false);
  const src = `/story/${region}/${encodeURIComponent(name)}/${month}`;
  const m = Number(month.slice(5)) - 1;

  return (
    <main className="page">
      <div className={styles.toolbar}>
        <Link href={`/character/${region}/${encodeURIComponent(name)}`} className="pill">
          ← {name}
        </Link>
        <ShareButton text={t.shareText(t.months[m], name)} />
      </div>

      <h1 className={`display ${styles.title}`}>{t.title(t.months[m])}</h1>

      <div className={styles.story} data-loaded={loaded || undefined}>
        {!loaded && <div className="skeleton" />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={t.title(t.months[m])} width={1080} height={1920} onLoad={() => setLoaded(true)} />
      </div>

      <div className={styles.actions}>
        <a className="btn primary" href={src} download={`${name}-${month}.png`}>
          {t.download}
        </a>
      </div>
      <p className={styles.hint}>{t.hint}</p>
    </main>
  );
}
