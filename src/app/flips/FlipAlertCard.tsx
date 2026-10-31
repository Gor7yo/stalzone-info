"use client";

import { Icon } from "@/components/Icon";
import { LoginCard, SentTo, TelegramLinkCard } from "@/components/Account/AccountGate";
import { useAlerts, useDeleteFlipAlert, useSetFlipAlert, useToggleRadar, type FlipAlert, type FlipAlertInput } from "@/features/alerts";
import { GROUPS, groupLabel } from "@/features/items";
import { useFormat, useLang, useT } from "@/i18n/client";
import type { Lang } from "@/i18n/lang";
import type { Dict } from "@/i18n/ru";
import type { FlipSettings, Region } from "@/lib/store";
import { haptic } from "@/lib/telegram";
import styles from "./flips.module.css";

/** Условия алерта = текущие фильтры ленты. */
const inputOf = (region: Region, s: FlipSettings): FlipAlertInput => ({
  region,
  minProfit: s.minProfit,
  minConfidence: s.minConfidence,
  maxBudget: s.budget,
  groups: s.group ? [s.group] : [],
});

const same = (a: FlipAlert, b: FlipAlertInput) =>
  a.minProfit === b.minProfit && a.minConfidence === b.minConfidence && a.maxBudget === b.maxBudget && a.groups.join() === b.groups.join();

/** «от 100к · надёжно · до 5кк · Артефакты» */
export function describeFlipAlert(
  a: Pick<FlipAlert, "minProfit" | "minConfidence" | "maxBudget" | "groups">,
  t: Dict["flipAlert"],
  formatShort: (v: number) => string,
  lang: Lang,
) {
  return [
    t.from(formatShort(a.minProfit)),
    a.minConfidence === "low" ? t.confAny : a.minConfidence === "high" ? t.confHigh : t.confMedium,
    a.maxBudget ? t.budget(formatShort(a.maxBudget)) : null,
    a.groups.length
      ? a.groups
          .map((g) => {
            const group = GROUPS.find((x) => x.id === g);
            return group ? groupLabel(group, lang) : g;
          })
          .join(", ")
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Флип-алерт региона: бот присылает новые выгодные лоты по фильтрам ленты. */
export function FlipAlertCard({ region, settings }: { region: Region; settings: FlipSettings }) {
  const t = useT().flipAlert;
  const lang = useLang();
  const { formatShort } = useFormat();
  const alerts = useAlerts();
  const save = useSetFlipAlert();
  const remove = useDeleteFlipAlert();

  if (alerts.pending) return null;
  if (!alerts.available) {
    return <LoginCard text={t.login} />;
  }
  if (!alerts.telegram) {
    return <TelegramLinkCard text={t.linkTelegram} />;
  }

  const describe = (a: Parameters<typeof describeFlipAlert>[0]) => describeFlipAlert(a, t, formatShort, lang);
  const alert = alerts.data?.flip?.find((f) => f.region === region);
  const wanted = inputOf(region, settings);
  const changed = alert && !same(alert, wanted);
  const busy = save.isPending || remove.isPending;
  const error = save.error ?? remove.error;

  const enable = () => {
    haptic.tap("medium");
    save.mutate(wanted, { onSuccess: () => haptic.notify("success") });
  };

  return (
    <section className={`glass ${styles.alert}`} data-on={alert ? "" : undefined}>
      <span className={styles.alertIcon}>
        <Icon name="bell" size={18} />
      </span>
      <div className={styles.alertBody}>
        <strong>{alert ? t.on : t.off}</strong>
        <span className="dim">{alert ? describe(alert) : `${describe(wanted)} · ${t.byFilters}`}</span>
        {changed && <span className={styles.alertChanged}>{t.changed(describe(wanted))}</span>}
        {alerts.sentTo && <SentTo telegram={alerts.sentTo} />}
        {error && <span className={styles.alertError}>{error.message}</span>}
      </div>
      <div className={styles.alertActions}>
        {!alert ? (
          // на странице флиппера главное - лента: кнопка алерта мягкая, не перетягивает внимание
          <button type="button" className="btn soft" disabled={busy || alerts.isLoading} onClick={enable}>
            {t.enable}
          </button>
        ) : (
          <>
            {changed && (
              <button type="button" className="btn soft" disabled={busy} onClick={enable}>
                {t.update}
              </button>
            )}
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={() => {
                haptic.notify("warning");
                remove.mutate(region);
              }}
            >
              {t.disable}
            </button>
          </>
        )}
      </div>
    </section>
  );
}

/** Радар рынка (Pro): галочка - бот пишет о резких движениях цен по ходовым предметам региона. */
export function RadarToggle({ region, regionLabel }: { region: Region; regionLabel: string }) {
  const t = useT().flipAlert;
  const alerts = useAlerts();
  const toggle = useToggleRadar();

  // вход и привязку Telegram уже просит карточка флип-алерта выше
  if (alerts.pending || !alerts.available || !alerts.telegram) return null;

  const on = alerts.data?.radar?.includes(region) ?? false;
  return (
    <section className={`glass ${styles.alert}`} data-on={on ? "" : undefined}>
      <span className={styles.alertIcon}>
        <Icon name="bolt" size={18} />
      </span>
      <div className={styles.alertBody}>
        <strong>{t.radarTitle(regionLabel)}</strong>
        <span className="dim">{t.radarText}</span>
        {toggle.error && <span className={styles.alertError}>{toggle.error.message}</span>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={t.radarTitle(regionLabel)}
        className={styles.switch}
        disabled={alerts.isLoading || toggle.isPending}
        onClick={() => {
          haptic.select();
          toggle.mutate({ region, enabled: !on });
        }}
      />
    </section>
  );
}
