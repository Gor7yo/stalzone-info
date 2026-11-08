"use client";

import Link from "next/link";
import { useState } from "react";
import { useMe } from "@/features/account";
import { useSite, type SiteStatus } from "@/features/site";
import { useFormat, useT } from "@/i18n/client";
import { useNow } from "@/lib/useNow";
import { Icon, type IconName } from "../Icon";
import s from "./Site.module.css";

/** Скрытый посетителем баннер помним по тексту: новый текст - покажем снова. */
const CLOSED_KEY = "stalzone:bannerClosed";

/** Эти страницы открыты и на тех. работах: админка и возврат после входа (иначе админу не войти). */
const OPEN_PATHS = ["/admin", "/auth"];

interface Bar {
  key: string;
  tone: "info" | "warn" | "admin";
  icon: IconName;
  text: string;
  /** ссылка справа («Управлять») */
  link?: { href: string; label: string };
  closable?: boolean;
}

/**
 * Состояние сайта для Shell: closed - вместо страницы показать «Технические работы»
 * (админы и OPEN_PATHS проходят); bars - полоски сверху: баннер админов, «сервер не отвечает»,
 * админам - напоминание, что сайт закрыт.
 */
export function useSiteGate(pathname: string) {
  const t = useT().site;
  const { data, isError } = useSite();
  const { me } = useMe();
  const [closedText, setClosedText] = useState(() => {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem(CLOSED_KEY);
    } catch {
      return null;
    }
  });

  const maintenance = data?.maintenance ?? null;
  const admin = Boolean(me?.admin);
  // пока не знаем, админ ли это, - тоже закрыто: обычный посетитель не увидит сайт даже мельком
  const closed = Boolean(maintenance) && !admin && !OPEN_PATHS.some((p) => pathname.startsWith(p));

  const bars: Bar[] = [];
  if (maintenance && admin) {
    bars.push({ key: "admin", tone: "admin", icon: "settings", text: t.adminPlate, link: { href: "/admin", label: t.manage } });
  }
  // сервер не ответил - скорее всего, обновляется (деплой) или недоступен
  if (isError && !data) bars.push({ key: "offline", tone: "warn", icon: "refresh", text: t.offline });
  const banner = data?.banner;
  if (banner && banner.text !== closedText) {
    bars.push({ key: "banner", tone: banner.tone, icon: banner.tone === "warn" ? "alert" : "bell", text: banner.text, closable: true });
  }

  const closeBanner = () => {
    if (!banner) return;
    setClosedText(banner.text);
    try {
      localStorage.setItem(CLOSED_KEY, banner.text);
    } catch {
      /* приватный режим - скроем до перезагрузки */
    }
  };

  return { closed, maintenance, bars, closeBanner };
}

/** Полоски сверху страницы. */
export function SiteBars({ bars, onClose }: { bars: Bar[]; onClose: () => void }) {
  const t = useT().site;
  if (!bars.length) return null;
  return (
    <div className={s.bars}>
      {bars.map((b) => (
        <div key={b.key} className={s.bar} data-tone={b.tone} role={b.tone === "warn" ? "alert" : "status"}>
          <Icon name={b.icon} size={16} />
          <span className={s.barText}>{b.text}</span>
          {b.link && (
            <Link href={b.link.href} className={s.barLink}>
              {b.link.label}
            </Link>
          )}
          {b.closable && (
            <button type="button" className={s.barClose} aria-label={t.close} title={t.close} onClick={onClose}>
              <Icon name="close" size={14} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/** Вместо сайта на тех. работах: что происходит и примерно когда закончим. Страница откроется сама. */
export function MaintenanceScreen({ maintenance }: { maintenance: NonNullable<SiteStatus["maintenance"]> }) {
  const t = useT().site;
  const { formatTime, formatDateTime } = useFormat();
  // «примерно до» прошло - пишем «заканчиваем»; часы раз в 30 с
  const now = useNow(30_000);
  const until = maintenance.until ? new Date(maintenance.until) : null;
  const sameDay = until && now && until.toDateString() === new Date(now).toDateString();
  const passed = until && now && until.getTime() < now;

  return (
    <main className={s.screen}>
      <div className={`glass ${s.card}`}>
        <span className={s.icon}>
          <Icon name="settings" size={28} />
        </span>
        <h1 className={`display ${s.title}`}>{t.title}</h1>
        <p className={s.message}>{maintenance.message || t.defaultMessage}</p>
        {until && (
          <p className={s.until}>
            <Icon name="clock" size={15} />
            {passed ? t.soon : t.until(sameDay ? formatTime(until) : formatDateTime(until))}
          </p>
        )}
        <p className={s.note}>{t.autoReload}</p>
        <p className={s.note}>{t.alertsWork}</p>
      </div>
    </main>
  );
}
