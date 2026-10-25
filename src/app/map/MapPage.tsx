"use client";

import { useState } from "react";
import { ShareButton } from "@/components/ui/Buttons";
import { PageHeader } from "@/components/ui/PageHeader";
import { MAP_LOCATIONS, mapLocation } from "@/features/map";
import { useLang, useT } from "@/i18n/client";
import { haptic } from "@/lib/telegram";
import { MapView, type MapPosition } from "./MapView";
import styles from "./map.module.css";

/** Ссылка на место — в адресе, без перехода (карта не пересоздаётся). */
function writeUrl(id: string, pos: MapPosition | null) {
  const params = new URLSearchParams({ l: id });
  if (pos) {
    params.set("x", String(pos.x));
    params.set("z", String(pos.z));
    params.set("zoom", String(pos.zoom));
  }
  window.history.replaceState(null, "", `/map?${params}`);
}

export function MapPage({ initialLocation, initial }: { initialLocation: string; initial: MapPosition | null }) {
  const t = useT().map;
  const lang = useLang();
  const [id, setId] = useState(initialLocation);
  // позиция из ссылки — только для первой открытой локации
  const [start, setStart] = useState(initial);
  const location = mapLocation(id) ?? MAP_LOCATIONS[0];
  const name = (l: (typeof MAP_LOCATIONS)[number]) => (lang === "en" ? l.nameEn : l.name);

  return (
    <main className="page">
      <PageHeader eyebrow={t.eyebrow} title={t.title} aside={<ShareButton text={t.shareText(name(location))} withQuery />}>
        {t.lead}
      </PageHeader>

      <div className={styles.locations} role="group" aria-label={t.locationsAria}>
        {MAP_LOCATIONS.map((l) => (
          <button
            key={l.id}
            type="button"
            className={styles.location}
            aria-pressed={l.id === location.id}
            onClick={() => {
              if (l.id === location.id) return;
              haptic.select();
              setStart(null);
              setId(l.id);
              writeUrl(l.id, null);
            }}
          >
            {name(l)}
            {(lang === "en" ? l.hintEn : l.hint) && <small>{lang === "en" ? l.hintEn : l.hint}</small>}
          </button>
        ))}
      </div>

      <MapView key={location.id} location={location} initial={start} onMove={(pos) => writeUrl(location.id, pos)} />
      <p className={`dim ${styles.note}`}>{t.note}</p>
    </main>
  );
}
