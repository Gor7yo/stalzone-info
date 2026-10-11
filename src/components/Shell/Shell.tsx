"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { emissionState, useEmission } from "@/features/emission";
import { useApp } from "@/lib/store";
import { bindBackButton, haptic } from "@/lib/telegram";
import { Icon, type IconName } from "../Icon";
import styles from "./Shell.module.css";

const TABS: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Главная", icon: "home" },
  { href: "/auction", label: "Рынок", icon: "market" },
  { href: "/character", label: "Сталкер", icon: "user" },
  { href: "/clans", label: "Кланы", icon: "shield" },
  { href: "/emission", label: "Выброс", icon: "radiation" },
];

const tabIndex = (path: string) => {
  if (path.startsWith("/loot") || path.startsWith("/craft")) return 1; // часть рынка
  const i = TABS.findIndex((t) => t.href !== "/" && path.startsWith(t.href));
  return i === -1 ? 0 : i;
};

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const region = useApp((s) => s.region);
  const { data } = useEmission(region);
  const emissionActive = emissionState(data).phase === "active";
  const active = tabIndex(pathname);

  // нативная кнопка «Назад» Telegram на вложенных экранах
  useEffect(() => {
    if (pathname === "/") return;
    return bindBackButton(() => {
      haptic.tap();
      if (window.history.length > 1) router.back();
      else router.push(pathname.split("/").slice(0, -1).join("/") || "/");
    });
  }, [pathname, router]);

  // при выбросе — вибро-сигнал
  useEffect(() => {
    if (emissionActive) haptic.notify("warning");
  }, [emissionActive]);

  return (
    <>
      <div className={styles.backdrop} data-alert={emissionActive || undefined} aria-hidden>
        <span className={styles.aurora} />
        <span className={styles.grid} />
        <span className={styles.noise} />
      </div>

      {children}

      <nav className={styles.dock} aria-label="Навигация" style={{ "--index": active } as React.CSSProperties}>
        <span className={styles.indicator} aria-hidden />
        {TABS.map((tab, i) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={styles.tab}
            aria-current={i === active ? "page" : undefined}
            onClick={() => i !== active && haptic.select()}
          >
            <span className={styles.tabIcon}>
              <Icon name={tab.icon} size={21} strokeWidth={i === active ? 2.2 : 1.8} />
              {tab.href === "/emission" && emissionActive && <span className={styles.alert} />}
            </span>
            <span className={styles.tabLabel}>{tab.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
