"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { useRouter } from "next/navigation";
import { Anomaly } from "@/components/Anomaly/Anomaly";
import { EmissionStatus } from "@/components/Emission/EmissionStatus";
import { Icon, type IconName } from "@/components/Icon";
import { ItemRow } from "@/components/ItemRow";
import { MarketRadar } from "@/components/MarketRadar/MarketRadar";
import { Tilt } from "@/components/Tilt/Tilt";
import { ItemIcon } from "@/components/ui/ItemIcon";
import { RegionSwitch } from "@/components/ui/RegionSwitch";
import { SearchField } from "@/components/ui/SearchField";
import { useIsAdmin } from "@/features/admin";
import { useBestPrice } from "@/features/auction";
import { allianceOf } from "@/features/alliances";
import { CRAFT_ENABLED, LOOT_ENABLED } from "@/lib/flags";
import { emissionState, useEmission } from "@/features/emission";
import { searchItems, useItems, type Item } from "@/features/items";
import { useFormat, useT } from "@/i18n/client";
import type { Dict } from "@/i18n/ru";
import { useApp, type Region } from "@/lib/store";
import { haptic } from "@/lib/telegram";
import styles from "./home.module.css";

type Tile = {
  href: string;
  key: keyof Dict["home"]["tiles"];
  icon: IconName;
  accent: string;
};

const TILES = (
  [
    { href: "/auction", key: "market", icon: "market", accent: "#5aa9ff" },
    { href: "/craft", key: "craft", icon: "sparkle", accent: "var(--acc)" },
    { href: "/character", key: "players", icon: "user", accent: "var(--cyan)" },
    { href: "/clans", key: "clans", icon: "shield", accent: "#c08bff" },
    { href: "/emission", key: "emission", icon: "radiation", accent: "var(--ember)" },
    { href: "/loot", key: "loot", icon: "bag", accent: "#ffc94a" },
  ] satisfies Tile[]
).filter((t) => (CRAFT_ENABLED || t.href !== "/craft") && (LOOT_ENABLED || t.href !== "/loot"));

export default function HomePage() {
  const t = useT();
  const region = useApp((s) => s.region);
  const favItems = useApp((s) => s.favItems);
  const favCharacters = useApp((s) => s.favCharacters);
  const favClans = useApp((s) => s.favClans);

  const emission = useEmission(region);
  const phase = emissionState(emission.data).phase;
  const isAdmin = useIsAdmin();

  return (
    <main className="page">
      <header className={styles.top}>
        <Link href="/" className={styles.logo} aria-label="STALZONE INFO">
          <span className={styles.logoMark} />
          <span>
            STALZONE <span style={{ color: "var(--acc)" }}>INFO</span>
          </span>
        </Link>
        <RegionSwitch />
      </header>

      <div className="desk-split">
        <div className="desk-main">
          <section className={`glass ${styles.hero}`} data-phase={phase}>
            <div className={styles.heroText}>
              <EmissionStatus data={emission.data} isLoading={emission.isLoading} isError={emission.isError} />
              <Link href="/emission" className={styles.heroLink}>
                {t.home.allRegions} <Icon name="chevron" size={14} />
              </Link>
            </div>
            <Anomaly
              className={styles.orb}
              mode={phase === "active" ? "active" : phase === "unknown" && !emission.isLoading ? "idle" : "calm"}
              onTap={() => haptic.tap("heavy")}
              label={t.home.anomalyAria}
            />
          </section>

          {/* новичкам: после рекламы спрашивали «что тут делать» — гайд на самом видном месте */}
          <Link href="/guide" className={`list-row ${styles.guide}`} onClick={() => haptic.tap()}>
            <Icon name="help" size={20} />
            <strong>{t.shell.guideBanner}</strong>
            <Icon name="chevron" size={18} className="dim" />
          </Link>

          <UniversalSearch region={region} wantIndex={favItems.length > 0} />

          <section className={`${styles.bento} stagger`}>
            {TILES.map((tile, i) => (
              <Tilt
                key={tile.href}
                as={Link}
                href={tile.href}
                className={`glass ${styles.tile}`}
                data-wide={i < 2 || undefined}
                style={{ "--tile": tile.accent } as React.CSSProperties}
                onClick={() => haptic.tap()}
              >
                <span className={`${styles.tileIcon} depth`}>
                  <Icon name={tile.icon} size={22} />
                </span>
                <span className={styles.tileBody}>
                  <strong className="display">{t.home.tiles[tile.key][0]}</strong>
                  <span>{t.home.tiles[tile.key][1]}</span>
                </span>
                <Icon name="chevron" size={18} className={styles.tileArrow} />
              </Tilt>
            ))}
          </section>

          {isAdmin && (
            <Link href="/admin" className="list-row" style={{ marginTop: 12 }} onClick={() => haptic.tap()}>
              <Icon name="shield" size={20} />
              <strong style={{ flex: 1, fontSize: 14 }}>{t.home.admin}</strong>
              <Icon name="chevron" size={18} className="dim" />
            </Link>
          )}
        </div>

        <div className={`desk-side ${styles.side}`}>
          <MarketRadar region={region} fill />

          {favItems.length > 0 && (
            <section className="section">
              <h2 className="section-title">
                {t.home.myMarket} <small>{t.home.myMarketHint}</small>
              </h2>
              <Watchlist ids={favItems.slice(0, 8)} region={region} />
            </section>
          )}

          {(favCharacters.length > 0 || favClans.length > 0) && (
            <section className="section">
              <h2 className="section-title">{t.home.favorites}</h2>
              <div className="chips">
                {favCharacters.map((c) => (
                  <Link key={`c-${c.region}-${c.name}`} href={`/character/${c.region}/${encodeURIComponent(c.name)}`} className="chip">
                    <Icon name="user" size={15} /> {c.name}
                    <span className="dim">{c.region.toUpperCase()}</span>
                  </Link>
                ))}
                {favClans.map((c) => (
                  <Link key={`k-${c.id}`} href={`/clans/${c.region}/${c.id}`} className="chip">
                    <span className="dot" style={{ color: allianceOf(c.alliance).color }} />[{c.tag}] {c.name}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      <footer className={styles.footer}>
        <span>STALZONE INFO v0.2</span>
        <span>{t.home.dataSource}</span>
      </footer>
    </main>
  );
}

function UniversalSearch({ region, wantIndex }: { region: Region; wantIndex: boolean }) {
  const t = useT();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const deferred = useDeferredValue(query.trim());
  const { data: index } = useItems(focused || wantIndex || query.length > 0);

  const items = index && deferred.length >= 2 ? searchItems(index, deferred, undefined, 5) : [];
  const looksLikeNick = /^[\p{L}\p{N}_.-]{3,32}$/u.test(deferred);

  return (
    <section className={styles.search}>
      <SearchField
        value={query}
        onChange={setQuery}
        onFocus={() => setFocused(true)}
        placeholder={t.home.searchPlaceholder}
        aria-label={t.home.searchAria}
        onSubmit={() => {
          if (items[0]) router.push(`/auction/${items[0].id}`);
          else if (looksLikeNick) router.push(`/character/${region}/${encodeURIComponent(deferred)}`);
        }}
      />

      {deferred.length >= 2 && (
        <div className={`stack ${styles.results}`}>
          {items.map((item) => (
            <ItemRow key={item.id} item={item} />
          ))}
          {looksLikeNick && (
            <Link href={`/character/${region}/${encodeURIComponent(deferred)}`} className="list-row" onClick={() => haptic.tap()}>
              <span className={styles.resultIcon}>
                <Icon name="user" size={20} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <strong className="truncate">{t.home.playerResult(deferred)}</strong>
                <span className="dim" style={{ display: "block", fontSize: 12, fontWeight: 600 }}>
                  {t.home.openProfile} · {region.toUpperCase()}
                </span>
              </span>
              <Icon name="chevron" size={18} className="dim" />
            </Link>
          )}
          {!items.length && !looksLikeNick && (
            <p className="dim" style={{ fontSize: 13, padding: "4px 4px 0" }}>
              {t.home.nothingFound}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function Watchlist({ ids, region }: { ids: string[]; region: Region }) {
  const { data: index } = useItems();

  return (
    <div className={`chips ${styles.watchlist}`}>
      {ids.map((id) => (
        <WatchCard key={id} item={index?.byId.get(id)} id={id} region={region} />
      ))}
    </div>
  );
}

function WatchCard({ item, id, region }: { item?: Item; id: string; region: Region }) {
  const t = useT();
  const { formatPrice } = useFormat();
  const { data, isLoading } = useBestPrice(region, id);

  return (
    <Link href={`/auction/${id}`} className={`glass ${styles.watch}`} onClick={() => haptic.tap()}>
      <ItemIcon item={item} size={40} />
      <span className="truncate" style={{ fontSize: 13, fontWeight: 700 }}>
        {item?.name ?? id}
      </span>
      {isLoading ? (
        <span className="skeleton" style={{ height: 16, width: "70%" }} />
      ) : (
        <strong
          className="mono"
          style={{
            fontSize: 15,
            color: data?.price ? "var(--acc)" : "var(--text-3)",
          }}
        >
          {data?.price ? formatPrice(data.price) : t.home.noLots}
        </strong>
      )}
    </Link>
  );
}
