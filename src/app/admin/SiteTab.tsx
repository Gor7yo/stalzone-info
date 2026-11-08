"use client";

import { useState } from "react";
import { SiteBars } from "@/components/Site/Site";
import { Segmented } from "@/components/ui/Segmented";
import { ErrorState, RowSkeleton } from "@/components/ui/States";
import { useAdminSite, useSetBanner, useSetMaintenance, type SiteStatus } from "@/features/site";
import { useFormat, useT } from "@/i18n/client";
import { haptic } from "@/lib/telegram";
import { useNow } from "@/lib/useNow";
import styles from "./admin.module.css";

const pad = (n: number) => String(n).padStart(2, "0");
/** ISO → значение для <input type="datetime-local"> (местное время). */
const toLocal = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromLocal = (v: string) => (v ? new Date(v).toISOString() : undefined);

/** Тех. работы: закрыть сайт (с подтверждением), поменять текст, открыть. */
function MaintenanceCard({ state }: { state: SiteStatus["maintenance"] }) {
  const a = useT().admin;
  const { formatDateTime } = useFormat();
  const set = useSetMaintenance();
  const [message, setMessage] = useState(state?.message ?? "");
  const [until, setUntil] = useState(toLocal(state?.until ?? null));
  const [sure, setSure] = useState(false);
  const on = Boolean(state);
  const save = (turnOn: boolean) => {
    haptic.tap("medium");
    setSure(false);
    set.mutate({ on: turnOn, message: message.trim() || undefined, until: fromLocal(until) });
  };

  return (
    <section className={`section ${styles.card}`}>
      <h2 className="section-title">{a.maintenance}</h2>
      <p className={styles.siteStatus} data-on={on || undefined}>
        {on && state ? a.maintenanceOn(formatDateTime(state.since)) : a.maintenanceOff}
      </p>
      <p className={`dim ${styles.siteHint}`}>{a.maintenanceHint}</p>
      <textarea
        className={styles.message}
        maxLength={300}
        placeholder={a.maintenanceMessage}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <label className={styles.siteField}>
        <span>{a.maintenanceUntil}</span>
        <input
          type="datetime-local"
          className={`${styles.input} ${styles.date}`}
          value={until}
          onChange={(e) => setUntil(e.target.value)}
        />
      </label>
      <div className={styles.actions}>
        {on ? (
          <>
            <button type="button" className="btn" disabled={set.isPending} onClick={() => save(true)}>
              {a.saveText}
            </button>
            <button type="button" className="btn primary" disabled={set.isPending} onClick={() => save(false)}>
              {a.turnOff}
            </button>
          </>
        ) : sure ? (
          <button type="button" className="btn" data-confirm disabled={set.isPending} onClick={() => save(true)}>
            {a.sureTurnOn}
          </button>
        ) : (
          <button type="button" className="btn" data-danger onClick={() => setSure(true)}>
            {a.turnOn}
          </button>
        )}
      </div>
      {set.error && <p className={styles.error}>{set.error.message}</p>}
    </section>
  );
}

/** Баннер: текст, вид (обычный / важный), срок; предпросмотр - как увидят посетители. */
function BannerCard({ state }: { state: SiteStatus["banner"] }) {
  const a = useT().admin;
  const set = useSetBanner();
  const [text, setText] = useState(state?.text ?? "");
  const [tone, setTone] = useState<"info" | "warn">(state?.tone ?? "info");
  const [until, setUntil] = useState(toLocal(state?.until ?? null));
  const now = useNow(30_000);
  const expired = Boolean(now && state?.until && Date.parse(state.until) <= now);

  return (
    <section className={`section ${styles.card}`}>
      <h2 className="section-title">{a.banner}</h2>
      <p className={`dim ${styles.siteHint}`}>{a.bannerHint}</p>
      {state && (
        <div className={styles.sitePreview}>
          <span className="dim">{expired ? a.bannerExpired : a.bannerNow}</span>
          <SiteBars
            bars={[{ key: "now", tone: state.tone, icon: state.tone === "warn" ? "alert" : "bell", text: state.text }]}
            onClose={() => {}}
          />
        </div>
      )}
      <textarea
        className={styles.message}
        maxLength={300}
        placeholder={a.bannerText}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className={styles.inline}>
        <Segmented
          size="sm"
          label={a.toneAria}
          value={tone}
          onChange={setTone}
          options={[
            { value: "info", label: a.toneInfo },
            { value: "warn", label: a.toneWarn },
          ]}
        />
      </div>
      <label className={styles.siteField}>
        <span>{a.bannerUntil}</span>
        <input
          type="datetime-local"
          className={`${styles.input} ${styles.date}`}
          value={until}
          onChange={(e) => setUntil(e.target.value)}
        />
      </label>
      <div className={styles.actions}>
        <button
          type="button"
          className="btn primary"
          disabled={set.isPending || !text.trim()}
          onClick={() => {
            haptic.tap();
            set.mutate({ text: text.trim(), tone, until: fromLocal(until) });
          }}
        >
          {state ? a.updateBanner : a.showBanner}
        </button>
        {state && (
          <button
            type="button"
            className="btn"
            data-danger
            disabled={set.isPending}
            onClick={() => {
              haptic.tap();
              set.mutate({});
            }}
          >
            {a.hideBanner}
          </button>
        )}
      </div>
      {set.error && <p className={styles.error}>{set.error.message}</p>}
    </section>
  );
}

/** Вкладка «Сайт»: тех. работы и баннер-объявление. */
export function SiteTab() {
  const { data, isLoading, isError, refetch } = useAdminSite();
  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (isLoading || !data) return <RowSkeleton count={2} />;
  return (
    <>
      {/* key: после сохранения поля заново берут значения с сервера */}
      <MaintenanceCard key={JSON.stringify(data.maintenance)} state={data.maintenance} />
      <BannerCard key={JSON.stringify(data.banner)} state={data.banner} />
    </>
  );
}
