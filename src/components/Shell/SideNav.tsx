"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMe } from "@/features/account";
import { emissionState, useEmission, type EmissionState } from "@/features/emission";
import { useFormat, useT } from "@/i18n/client";
import type { Dict } from "@/i18n/ru";
import { DONATE_URL } from "@/lib/creator";
import { useApp } from "@/lib/store";
import { haptic } from "@/lib/telegram";
import { SIDE_KEY } from "@/lib/theme";
import { useNow } from "@/lib/useNow";
import { Icon, type IconName } from "../Icon";
import { PlayerAvatar } from "../PlayerAvatar";
import { ThemeToggle } from "../Theme/ThemeToggle";
import { LangSwitch } from "../ui/RegionSwitch";
import styles from "./SideNav.module.css";

type Shell = Dict["shell"];
/** Ключи словаря меню, которые просто строки (без функций вроде proUntil). */
export type ShellLabel = { [K in keyof Shell]: Shell[K] extends string ? K : never }[keyof Shell];

interface Item {
  href: string;
  label: ShellLabel;
  icon: IconName;
  match: (path: string) => boolean;
  /** pro - метка PRO; emission - живой статус выброса справа */
  kind?: "pro" | "emission";
}

const starts =
  (...prefixes: string[]) =>
  (path: string) =>
    prefixes.some((p) => path.startsWith(p));

/** Разделы группами: рынок (цены, флиппер, выброс) и сообщество (игроки, кланы). Аккаунт - карточкой внизу. */
const GROUPS: { title?: ShellLabel; items: Item[] }[] = [
  { items: [{ href: "/", label: "home", icon: "home", match: (p) => p === "/" }] },
  {
    title: "groupMarket",
    items: [
      { href: "/auction", label: "prices", icon: "market", match: starts("/auction", "/loot", "/craft") },
      { href: "/flips", label: "flipper", icon: "flip", match: starts("/flips"), kind: "pro" },
      { href: "/emission", label: "emission", icon: "radiation", match: starts("/emission"), kind: "emission" },
    ],
  },
  {
    title: "groupCommunity",
    items: [
      { href: "/character", label: "players", icon: "users", match: starts("/character") },
      { href: "/clans", label: "clans", icon: "shield", match: starts("/clans") },
    ],
  },
];

const isAccountPath = starts("/account", "/pro", "/admin", "/auth");

/** Свернуть в рельсу / развернуть: атрибут на <html> (его же ставит скрипт до отрисовки) + запоминаем выбор. */
function toggleRail() {
  const d = document.documentElement.dataset;
  if (d.side === "rail") delete d.side;
  else d.side = "rail";
  try {
    localStorage.setItem(SIDE_KEY, d.side ?? "full");
  } catch {
    /* приватный режим - до перезагрузки */
  }
}

/** Боковое меню широкого экрана (на телефоне - нижний док в Shell). Сворачивается в рельсу с иконками. */
export function SideNav() {
  const path = usePathname();
  const t = useT().shell;
  const region = useApp((s) => s.region);
  const { data } = useEmission(region);
  const emission = emissionState(data);

  return (
    <nav className={styles.side} aria-label={t.nav}>
      <Link href="/" className={styles.brand} aria-label={t.brandAria}>
        <span className={styles.brandMark} />
        <span className={styles.brandText}>
          STALZONE <span style={{ color: "var(--acc)" }}>INFO</span>
        </span>
      </Link>

      {GROUPS.map((g, i) => (
        <div key={i} className={styles.group}>
          {g.title && <span className={styles.groupTitle}>{t[g.title]}</span>}
          {g.items.map((item) => {
            const active = item.match(path);
            const label = t[item.label];
            return (
              <Link
                key={item.href}
                href={item.href}
                className={styles.item}
                aria-current={active ? "page" : undefined}
                data-label={label}
                data-alert={(item.kind === "emission" && emission.phase === "active") || undefined}
                onClick={() => !active && haptic.select()}
              >
                <Icon name={item.icon} size={19} strokeWidth={active ? 2.2 : 1.8} />
                <span className={styles.label}>{label}</span>
                {item.kind === "pro" && <span className={styles.pro}>PRO</span>}
                {item.kind === "emission" && <EmissionBadge state={emission} />}
              </Link>
            );
          })}
        </div>
      ))}

      <div className={styles.bottom}>
        <AccountCard active={isAccountPath(path)} />
        <div className={styles.toggles}>
          <ThemeToggle />
          <LangSwitch />
        </div>
        <div className={styles.tools}>
          <Link href="/guide" className={styles.tool} aria-label={t.guide} data-label={t.guide}>
            <Icon name="help" size={18} />
          </Link>
          <a
            href={DONATE_URL}
            target="_blank"
            rel="noopener"
            className={styles.tool}
            data-donate
            aria-label={t.donate}
            data-label={t.donate}
          >
            <Icon name="heart" size={18} />
          </a>
          <button
            type="button"
            className={styles.tool}
            data-collapse
            aria-label={t.toggleSide}
            data-label={t.toggleSide}
            onClick={() => {
              haptic.tap();
              toggleRail();
            }}
          >
            <Icon name="collapse" size={18} />
          </button>
        </div>
      </div>
    </nav>
  );
}

/** Выброс прямо в меню: идёт - красная метка, затишье - сколько прошло с прошлого. */
function EmissionBadge({ state }: { state: EmissionState }) {
  const t = useT().shell;
  const { formatDuration } = useFormat();
  // минутной точности хватает: секунды в меню только отвлекали бы
  const now = useNow(30_000);
  if (state.phase === "active") return <span className={styles.live}>{t.emissionLive}</span>;
  if (state.phase !== "calm" || !now) return null;
  return (
    <span className={`mono ${styles.since}`} title={t.emissionSince}>
      {formatDuration(now - state.since)}
    </span>
  );
}

/** Кто вошёл и до какого числа Pro; не вошли - приглашение войти через EXBO. */
function AccountCard({ active }: { active: boolean }) {
  const t = useT().shell;
  const { formatShortDate } = useFormat();
  const { me, pending } = useMe();
  const sub = me ? (me.pro && me.proUntil ? t.proUntil(formatShortDate(me.proUntil)) : t.noPro) : t.signInHint;
  return (
    <Link href="/account" className={styles.account} aria-current={active ? "page" : undefined} data-label={me?.login ?? t.signIn}>
      {me ? (
        <PlayerAvatar size={32} />
      ) : (
        <span className={styles.avatarEmpty}>
          <Icon name="user" size={16} />
        </span>
      )}
      <span className={styles.accountText}>
        <b className="truncate">{me ? me.login : pending ? "…" : t.signIn}</b>
        <small data-pro={me?.pro || undefined}>{pending ? "" : sub}</small>
      </span>
    </Link>
  );
}
