"use client";

import { Icon } from "@/components/Icon";
import { LinkedAs, TelegramLink } from "@/components/PriceAlert/TelegramLink";
import { useAlerts, useDeleteFlipAlert, useSetFlipAlert, type FlipAlert, type FlipAlertInput } from "@/features/alerts";
import { GROUPS } from "@/features/items";
import { formatShort } from "@/lib/format";
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
  a.minProfit === b.minProfit &&
  a.minConfidence === b.minConfidence &&
  a.maxBudget === b.maxBudget &&
  a.groups.join() === b.groups.join();

/** «от 100к · надёжно · до 5кк · Артефакты» */
function describe(a: Pick<FlipAlert, "minProfit" | "minConfidence" | "maxBudget" | "groups">) {
  return [
    `от +${formatShort(a.minProfit)}`,
    a.minConfidence === "low" ? "любая надёжность" : a.minConfidence === "high" ? "только надёжные" : "надёжность средняя+",
    a.maxBudget ? `выкуп до ${formatShort(a.maxBudget)}` : null,
    a.groups.length ? a.groups.map((g) => GROUPS.find((x) => x.id === g)?.label ?? g).join(", ") : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Флип-алерт региона: бот присылает новые выгодные лоты по фильтрам ленты. */
export function FlipAlertCard({ region, settings }: { region: Region; settings: FlipSettings }) {
  const alerts = useAlerts();
  const save = useSetFlipAlert();
  const remove = useDeleteFlipAlert();

  if (!alerts.available) {
    return <TelegramLink text="Бот может присылать новые флипы по вашим фильтрам. Привяжите Telegram — это один клик, без пароля." />;
  }

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
        <strong>{alert ? "Флипы приходят в Telegram" : "Присылать новые флипы в Telegram"}</strong>
        <span className="dim">
          {alert ? describe(alert) : `${describe(wanted)} · по текущим фильтрам`}
        </span>
        {changed && <span className={styles.alertChanged}>Фильтры изменились: {describe(wanted)}</span>}
        {alerts.linkedAs && <LinkedAs session={alerts.linkedAs} />}
        {error && <span className={styles.alertError}>{error.message}</span>}
      </div>
      <div className={styles.alertActions}>
        {!alert ? (
          <button type="button" className="btn primary" disabled={busy || alerts.isLoading} onClick={enable}>
            Включить
          </button>
        ) : (
          <>
            {changed && (
              <button type="button" className="btn primary" disabled={busy} onClick={enable}>
                Обновить
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
              Выключить
            </button>
          </>
        )}
      </div>
    </section>
  );
}
