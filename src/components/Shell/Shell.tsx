"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useMe } from "@/features/account";
import { useT } from "@/i18n/client";
import type { Dict } from "@/i18n/ru";
import { emissionState, useEmission } from "@/features/emission";
import { CREATOR, creatorHref, DONATE_URL } from "@/lib/creator";
import { useApp } from "@/lib/store";
import { bindBackButton, haptic, useIsTelegram } from "@/lib/telegram";
import { ContactButton } from "../Contact/ContactButton";
import { Icon, type IconName } from "../Icon";
import { ThemeToggle } from "../Theme/ThemeToggle";
import { LangSwitch } from "../ui/RegionSwitch";
import styles from "./Shell.module.css";

const TABS: { href: string; label: keyof Dict["shell"]; icon: IconName }[] = [
  { href: "/", label: "home", icon: "home" },
  { href: "/auction", label: "market", icon: "market" },
  { href: "/character", label: "players", icon: "users" },
  { href: "/clans", label: "clans", icon: "shield" },
  { href: "/emission", label: "emission", icon: "radiation" },
  // подпись меняется: «Войти» / «Аккаунт»
  { href: "/account", label: "account", icon: "user" },
];

const tabIndex = (path: string) => {
  if (["/loot", "/craft", "/flips"].some((p) => path.startsWith(p))) return 1; // часть рынка
  if (["/pro", "/admin", "/auth"].some((p) => path.startsWith(p))) return TABS.length - 1; // аккаунт
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
  // вкладка аккаунта: не вошли — «Войти»
  const { me, pending: mePending } = useMe();
  const t = useT();
  const accountLabel = me || mePending ? t.shell.account : t.shell.signIn;

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
        <div className={styles.footerActions}>
          <a className={styles.donateBtn} href={DONATE_URL} target="_blank" rel="noopener" onClick={() => haptic.tap()}>
            <Icon name="heart" size={15} />
            {t.shell.donate}
          </a>
          <ThemeToggle />
          <LangSwitch />
        </div>
        <nav className={styles.footerLinks} aria-label={t.shell.docsNav}>
          <Link href="/guide">{t.shell.guide}</Link>
          <Link href="/reviews">{t.shell.reviews}</Link>
          <Link href="/rules">{t.shell.rules}</Link>
          <Link href="/privacy">{t.shell.privacy}</Link>
        </nav>
        STALZONE INFO · by{" "}
        <Link href={creatorHref} onClick={() => haptic.tap()}>
          {CREATOR.nick}
        </Link>
        <span className={styles.disclaimer}>{t.shell.disclaimer}</span>
      </footer>

      <ContactButton label={t.shell.contact} />

      {canGoBack && (
        <button
          type="button"
          className={styles.back}
          aria-label={t.shell.backAria}
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
          {t.common.back}
        </button>
      )}

      <nav className={styles.dock} aria-label={t.shell.nav} style={{ "--index": active } as React.CSSProperties}>
        {/* логотип — только в боковой панели широкого экрана */}
        <Link href="/" className={styles.brand} aria-label={t.shell.brandAria}>
          <span className={styles.brandMark} />
          {/* одним элементом: иначе gap флекса добавляется к пробелу между словами */}
          <span>
            STALZONE <span style={{ color: "var(--acc)" }}>INFO</span>
          </span>
        </Link>
        <div className={styles.tabs}>
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
              <span className={styles.tabLabel}>{tab.href === "/account" ? accountLabel : t.shell[tab.label]}</span>
            </Link>
          ))}
        </div>
        {/* только в боковой панели широкого экрана; на телефоне — кнопка в подвале */}
        <div className={styles.sideExtra}>
          <Link href="/guide" className={styles.sideDonate} data-guide>
            <Icon name="help" size={18} />
            {t.shell.guide}
          </Link>
          <div className={styles.sideToggles}>
            <ThemeToggle />
            <LangSwitch />
          </div>
          <a className={styles.sideDonate} href={DONATE_URL} target="_blank" rel="noopener">
            <Icon name="heart" size={18} />
            {t.shell.donate}
          </a>
        </div>
      </nav>
    </>
  );
}
