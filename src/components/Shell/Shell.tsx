"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { emissionState, useEmission } from "@/features/emission";
import { CREATOR, creatorHref } from "@/lib/creator";
import { useApp } from "@/lib/store";
import { bindBackButton, haptic, useIsTelegram } from "@/lib/telegram";
import { Icon, type IconName } from "../Icon";
import styles from "./Shell.module.css";

const TABS: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Главная", icon: "home" },
  { href: "/auction", label: "Рынок", icon: "market" },
  { href: "/character", label: "Игроки", icon: "user" },
  { href: "/clans", label: "Кланы", icon: "shield" },
  { href: "/emission", label: "Выброс", icon: "radiation" },
];

const tabIndex = (path: string) => {
  if (["/loot", "/craft", "/flips"].some((p) => path.startsWith(p))) return 1; // часть рынка
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

  // история переходов внутри приложения: «Назад» показываем, только если есть куда возвращаться
  const [trail, setTrail] = useState<string[]>([pathname]);
  // обновляем при рендере, а не в эффекте — без лишнего перерендера
  if (trail[trail.length - 1] !== pathname) {
    setTrail(trail[trail.length - 2] === pathname ? trail.slice(0, -1) : [...trail.slice(-49), pathname]);
  }
  const inTelegram = useIsTelegram();
  const canGoBack = !inTelegram && trail.length > 1;

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

      <footer className={styles.credit}>
        STALZONE INFO · by{" "}
        <Link href={creatorHref} onClick={() => haptic.tap()}>
          {CREATOR.nick}
        </Link>
      </footer>

      {canGoBack && (
        <button
          type="button"
          className={styles.back}
          aria-label="Назад на прошлый экран"
          onClick={() => {
            haptic.tap();
            const from = window.location.pathname;
            const prev = trail[trail.length - 2];
            router.back();
            // браузер не вернулся (начало истории вкладки) — переходим на прошлый экран сами
            setTimeout(() => {
              if (window.location.pathname === from) router.replace(prev);
            }, 400);
          }}
        >
          <Icon name="back" size={18} />
          Назад
        </button>
      )}

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
