"use client";

import "leaflet/dist/leaflet.css";
import type { LatLngBoundsExpression, Map as LeafletMap } from "leaflet";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { MAP_TILES, type MapLocation } from "@/features/map";
import { useT } from "@/i18n/client";
import styles from "./map.module.css";

/** Сколько можно приблизить сверх родного масштаба (1 px = 1 блок): плитки растягиваются без размытия. */
const OVERZOOM = 2;

export interface MapPosition {
  /** мировые координаты центра, блоки */
  x: number;
  z: number;
  zoom: number;
}

/**
 * Карта одной локации на Leaflet. Свои координаты: 1 единица = 1 блок картинки
 * (на последнем родном зуме 1 px = 1 блок), Y вниз — как на картинке и в игре (Z).
 * Leaflet грузим только в браузере: ему нужен window.
 */
export function MapView({
  location,
  initial,
  onMove,
}: {
  location: MapLocation;
  initial?: MapPosition | null;
  onMove?: (pos: MapPosition) => void;
}) {
  const t = useT().map;
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const [cursor, setCursor] = useState<{ x: number; z: number } | null>(null);
  // колбэк меняется на каждом рендере родителя — карту из-за этого не пересоздаём
  const onMoveRef = useRef(onMove);
  useEffect(() => {
    onMoveRef.current = onMove;
  });

  useEffect(() => {
    let cancelled = false;
    let created: LeafletMap | null = null;
    void import("leaflet").then((L) => {
      if (cancelled || !box.current) return;
      const scale = 1 / 2 ** location.maxZoom;
      const crs = L.Util.extend({}, L.CRS.Simple, {
        transformation: new L.Transformation(scale, 0, scale, 0),
      });
      const bounds: LatLngBoundsExpression = [
        [0, 0],
        [location.height, location.width],
      ];
      const pad = Math.max(location.width, location.height) * 0.15;
      created = L.map(box.current, {
        crs,
        minZoom: 0,
        maxZoom: location.maxZoom + OVERZOOM,
        zoomSnap: 0.25,
        zoomDelta: 0.5,
        wheelPxPerZoomLevel: 100,
        attributionControl: false,
        zoomControl: false,
        maxBounds: [
          [-pad, -pad],
          [location.height + pad, location.width + pad],
        ],
        maxBoundsViscosity: 0.8,
      });
      L.tileLayer(`${MAP_TILES}/${location.id}/{z}/{y}/{x}.webp`, {
        tileSize: 256,
        noWrap: true,
        bounds,
        minZoom: 0,
        maxNativeZoom: location.maxZoom,
        maxZoom: location.maxZoom + OVERZOOM,
        keepBuffer: 4,
      }).addTo(created);

      // мировые координаты ↔ координаты картинки
      const toWorld = (lat: number, lng: number) => ({
        x: Math.round(location.origin.x + lng),
        z: Math.round(location.origin.z + lat),
      });
      if (initial) {
        created.setView([initial.z - location.origin.z, initial.x - location.origin.x], initial.zoom);
      } else {
        created.fitBounds(bounds);
      }
      created.on("mousemove", (e) => setCursor(toWorld(e.latlng.lat, e.latlng.lng)));
      created.on("mouseout", () => setCursor(null));
      created.on("moveend", () => {
        if (!created) return;
        const c = created.getCenter();
        onMoveRef.current?.({ ...toWorld(c.lat, c.lng), zoom: Math.round(created.getZoom() * 100) / 100 });
      });
      map.current = created;
    });
    return () => {
      cancelled = true;
      created?.remove();
      map.current = null;
    };
    // initial читаем только при создании карты: дальше позицию ведёт сама карта
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  return (
    <div className={styles.frame}>
      <div ref={box} className={styles.map} role="application" aria-label={t.mapAria(location.name)} />
      <div className={styles.controls}>
        <button type="button" className="icon-btn" aria-label={t.zoomIn} onClick={() => map.current?.zoomIn()}>
          <Icon name="plus" size={18} />
        </button>
        <button type="button" className="icon-btn" aria-label={t.zoomOut} onClick={() => map.current?.zoomOut()}>
          <Icon name="minus" size={18} />
        </button>
      </div>
      {cursor && (
        <div className={`mono ${styles.coords}`} aria-hidden>
          X {cursor.x} · Z {cursor.z}
        </div>
      )}
    </div>
  );
}
