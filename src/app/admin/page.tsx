"use client";

import { useDeferredValue, useState } from "react";
import { LoginCard } from "@/components/Account/AccountGate";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchField } from "@/components/ui/SearchField";
import { Segmented } from "@/components/ui/Segmented";
import { EmptyState, ErrorState, RowSkeleton } from "@/components/ui/States";
import {
  useAdminAction,
  useAdminLog,
  useAdminUser,
  useAdminUsers,
  useDashboard,
  type AdminUser,
  type LogEntry,
  type Money,
  type Point,
  type Term,
} from "@/features/admin";
import { useMe } from "@/features/account";
import { useFormat, useT } from "@/i18n/client";
import { isNotFound } from "@/lib/api";
import { haptic } from "@/lib/telegram";
import styles from "./admin.module.css";

type Tab = "dash" | "users" | "log";

export default function AdminPage() {
  const t = useT();
  const a = t.admin;
  const me = useMe();
  const [tab, setTab] = useState<Tab>("dash");
  const admin = Boolean(me.me?.admin);

  if (me.pending)
    return (
      <main className="page">
        <PageHeader eyebrow={a.eyebrow} title={a.title} />
        <RowSkeleton count={4} />
      </main>
    );
  if (!me.loggedIn)
    return (
      <main className="page">
        <PageHeader eyebrow={a.eyebrow} title={a.title} />
        <LoginCard text={a.login} />
      </main>
    );
  if (!admin)
    return (
      <main className="page">
        <EmptyState icon="shield" title={t.common.notFoundTitle} text={a.forbidden} />
      </main>
    );

  return (
    <main className="page">
      <PageHeader eyebrow={a.eyebrow} title={a.title} />
      <div style={{ marginBottom: 14 }}>
        <Segmented
          label={a.sectionAria}
          value={tab}
          onChange={(v) => setTab(v as Tab)}
          options={[
            { value: "dash", label: a.tabDash },
            { value: "users", label: a.tabUsers },
            { value: "log", label: a.tabLog },
          ]}
        />
      </div>
      {tab === "dash" ? <DashboardTab /> : tab === "users" ? <UsersTab /> : <LogTab />}
    </main>
  );
}

// ---------- дашборд ----------

const money = (rows: Money[], formatNumber: (v: number) => string) =>
  rows.length ? rows.map((r) => `${formatNumber(r.amount / 100)} ${r.currency.toUpperCase()}`).join(" · ") : "0";

function DashboardTab() {
  const a = useT().admin;
  const { formatDateTime, formatNumber } = useFormat();
  const { data, isLoading, error, refetch } = useDashboard(true);
  if (isLoading) return <RowSkeleton count={6} />;
  if (error || !data) return <ErrorState onRetry={() => void refetch()} />;
  const { users, pro, revenue, alerts, series, collector } = data;

  return (
    <>
      <section className={styles.tiles}>
        <Stat label={a.accounts} value={users.total} hint={a.accountsHint(users.new1, users.new7, users.telegram)} />
        <Stat label={a.activeToday} value={users.dau} hint={a.activeHint(users.wau, users.mau)} />
        <Stat label={a.proActive} value={pro.active} hint={a.trialsTaken(pro.trials)} accent />
        <Stat label={a.paying} value={pro.paidUsers} hint={a.payments(pro.payments)} />
        <Stat label={a.revenue30} text={money(revenue.last30, formatNumber)} hint={a.total(money(revenue.total, formatNumber))} accent />
        <Stat label={a.alerts} value={alerts.price + alerts.flip} hint={a.alertsHint(alerts.price, alerts.flip, alerts.emission)} />
        <Stat label={a.banned} value={users.banned} />
      </section>

      <Bars title={a.seriesActive} points={series.active} />
      <Bars title={a.seriesNew} points={series.newUsers} />
      <Bars title={a.seriesPayments} points={series.payments} />

      <section className={`section ${styles.card}`}>
        <h2 className="section-title">{a.collector}</h2>
        <dl className={styles.facts}>
          <Fact k={a.regions} v={collector.regions.join(", ").toUpperCase()} />
          <Fact k={a.tracked} v={formatNumber(collector.tracked)} />
          <Fact k={a.overdue} v={`${collector.overdue.lots} / ${collector.overdue.sales}`} />
          <Fact k={a.backfilling} v={formatNumber(collector.backfilling)} />
          <Fact k={a.quota} v={a.quotaValue(collector.budget.available, collector.budget.perMinute)} />
          <Fact k={a.storedSales} v={formatNumber(collector.stored.sales)} />
          <Fact k={a.activeLots} v={formatNumber(collector.stored.activeLots)} />
        </dl>
      </section>
      <p className={`dim ${styles.updated}`}>{a.updated(formatDateTime(data.updatedAt))}</p>
    </>
  );
}

function Stat({ label, value, text, hint, accent }: { label: string; value?: number; text?: string; hint?: string; accent?: boolean }) {
  const { formatNumber } = useFormat();
  return (
    <div className={styles.stat} data-accent={accent || undefined}>
      <span className={styles.statLabel}>{label}</span>
      <strong className={`mono ${styles.statValue}`}>{text ?? formatNumber(value ?? 0)}</strong>
      {hint && <span className={styles.statHint}>{hint}</span>}
    </div>
  );
}

/** Один ряд по дням: тонкие столбики, подсказка при наведении/нажатии. */
function Bars({ title, points }: { title: string; points: Point[] }) {
  const a = useT().admin;
  const { formatDate, formatNumber } = useFormat();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...points.map((p) => p.n));
  const total = points.reduce((s, p) => s + p.n, 0);
  const shown = hover != null ? points[hover] : null;
  return (
    <section className={`section ${styles.card}`}>
      <h2 className="section-title">
        {title} <small>{shown ? `${formatDate(shown.day)}: ${shown.n}` : a.days30(formatNumber(total))}</small>
      </h2>
      <div className={styles.bars} onMouseLeave={() => setHover(null)} role="img" aria-label={a.barsAria(title, total)}>
        {points.map((p, i) => (
          <span
            key={p.day}
            className={styles.barHit}
            data-active={hover === i || undefined}
            onMouseEnter={() => setHover(i)}
            onClick={() => setHover(i)}
          >
            <span className={styles.bar} style={{ height: `${p.n ? Math.max(4, (p.n / max) * 100) : 0}%` }} />
          </span>
        ))}
      </div>
      <div className={styles.axis}>
        <span>{points[0] ? formatDate(points[0].day) : ""}</span>
        <span>{a.today}</span>
      </div>
    </section>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt>{k}</dt>
      <dd className="mono">{v}</dd>
    </div>
  );
}

// ---------- пользователи ----------

function UsersTab() {
  const a = useT().admin;
  const [query, setQuery] = useState("");
  const q = useDeferredValue(query.trim());
  const [selected, setSelected] = useState<string | null>(null);
  const list = useAdminUsers(q, !selected);

  if (selected) return <UserCard id={selected} onBack={() => setSelected(null)} />;

  return (
    <>
      <SearchField value={query} onChange={setQuery} placeholder={a.searchPlaceholder} aria-label={a.searchAria} />
      <div className="stack" style={{ gap: 6, marginTop: 10 }}>
        {list.isLoading && <RowSkeleton count={4} />}
        {list.data?.map((u) => (
          <UserRow key={u.id} user={u} onOpen={() => setSelected(u.id)} />
        ))}
        {list.data && !list.data.length && <EmptyState icon="user" title={a.nobody} text={a.nobodyText} />}
      </div>
    </>
  );
}

function Badges({ user }: { user: AdminUser }) {
  const a = useT().admin;
  return (
    <span className={styles.badges}>
      {user.pro && (
        <span className={styles.badge} data-tone="pro">
          Pro
        </span>
      )}
      {user.banned && (
        <span className={styles.badge} data-tone="ban">
          {a.ban}
        </span>
      )}
      {user.trialUsedAt && !user.pro && <span className={styles.badge}>{a.trialUsed}</span>}
      {user.telegram?.botBlocked && <span className={styles.badge}>{a.botBlocked}</span>}
      {!user.telegram && <span className={styles.badge}>{a.noTelegram}</span>}
    </span>
  );
}

/** «@ник» или имя в Telegram */
const telegramOf = (t: NonNullable<AdminUser["telegram"]>) => (t.username ? `@${t.username}` : t.firstName || `id ${t.chatId}`);

function UserRow({ user, onOpen }: { user: AdminUser; onOpen: () => void }) {
  const a = useT().admin;
  const { formatRelative } = useFormat();
  return (
    <button type="button" className="list-row" onClick={() => (haptic.select(), onOpen())}>
      <span style={{ flex: 1, minWidth: 0, textAlign: "left", display: "grid", gap: 2 }}>
        <strong className="truncate" style={{ fontSize: 14 }}>
          {user.login} {user.telegram && <span className="dim">· {telegramOf(user.telegram)}</span>}
        </strong>
        <span className="dim mono" style={{ fontSize: 11 }}>
          {user.lastSeenAt ? a.lastSeen(formatRelative(user.lastSeenAt)) : a.neverSeen}
        </span>
      </span>
      <Badges user={user} />
    </button>
  );
}

const PRO_PRESETS = [1, 3, 7, 30, 90, 365];
const BAN_PRESETS = [1, 7, 30];

function UserCard({ id, onBack }: { id: string; onBack: () => void }) {
  const a = useT().admin;
  const { formatDate, formatDateTime, formatNumber } = useFormat();
  const { data, isLoading, error } = useAdminUser(id);
  const act = useAdminAction(id);
  const [proDays, setProDays] = useState("");
  const [proDate, setProDate] = useState("");
  const [notify, setNotify] = useState(true);
  const [message, setMessage] = useState("");
  const [banDays, setBanDays] = useState("");
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);

  const gone = isNotFound(error);
  const run = (key: string, fn: () => void, dangerous = false) => {
    if (dangerous && confirm !== key) return setConfirm(key);
    setConfirm(null);
    haptic.notify("success");
    fn();
  };
  const pro = (term: Term) => act.mutate({ kind: "pro", term, notify, message }, { onSuccess: () => setMessage("") });
  const ban = (term: Term) => act.mutate({ kind: "ban", term, reason });

  return (
    <>
      <button type="button" className="btn" onClick={onBack} style={{ marginBottom: 12 }}>
        ← {a.toList}
      </button>
      {isLoading && <RowSkeleton count={3} />}
      {error && !gone && <ErrorState />}
      {gone && <EmptyState icon="user" title={a.userNotFound} text={a.userNotFoundText} />}

      <section className={`section ${styles.card}`}>
        <h2 className={styles.userName}>
          {data?.login ?? "…"} {data && <Badges user={data} />}
        </h2>
        {data && (
          <dl className={styles.facts}>
            <Fact k="Telegram" v={data.telegram ? `${telegramOf(data.telegram)} · id ${data.telegram.chatId}` : a.notLinked} />
            <Fact k="Pro" v={data.pro && data.proUntil ? a.until(formatDateTime(data.proUntil)) : a.no} />
            {data.banned && (
              <Fact k={a.ban} v={`${a.until(formatDateTime(data.bannedUntil!))}${data.banReason ? ` · ${data.banReason}` : ""}`} />
            )}
            <Fact k={a.lastVisit} v={data.lastSeenAt ? formatDateTime(data.lastSeenAt) : "—"} />
            <Fact k={a.firstSeen} v={formatDate(data.createdAt)} />
            <Fact k={a.alerts} v={a.alertsShort(data.alerts.price, data.alerts.flip)} />
          </dl>
        )}
      </section>

      <section className={`section ${styles.card}`}>
        <h2 className="section-title">Pro</h2>
        <div className={styles.actions}>
          {PRO_PRESETS.map((d) => (
            <button key={d} type="button" className="btn" disabled={act.isPending} onClick={() => run(`pro${d}`, () => pro({ days: d }))}>
              +{a.daysShort(d)}
            </button>
          ))}
          <button
            type="button"
            className="btn"
            data-confirm={confirm === "proF" || undefined}
            disabled={act.isPending}
            onClick={() => run("proF", () => pro({ forever: true }), true)}
          >
            {confirm === "proF" ? a.sureForever : a.forever}
          </button>
        </div>
        <div className={styles.inline}>
          <input
            className={styles.input}
            inputMode="numeric"
            placeholder={a.daysPlaceholder}
            value={proDays}
            onChange={(e) => setProDays(e.target.value.replace(/\D/g, ""))}
          />
          <button
            type="button"
            className="btn"
            disabled={!proDays || act.isPending}
            onClick={() => run("proN", () => pro({ days: Number(proDays) }))}
          >
            +{a.daysShort(proDays || "N")}
          </button>
          <input
            className={styles.input}
            type="date"
            value={proDate}
            onChange={(e) => setProDate(e.target.value)}
            aria-label={a.proUntilAria}
          />
          <button
            type="button"
            className="btn"
            disabled={!proDate || act.isPending}
            onClick={() => run("proD", () => pro({ until: new Date(`${proDate}T23:59:59`).toISOString() }))}
          >
            {a.untilDate}
          </button>
        </div>
        <label className={styles.check}>
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} /> {a.notifyBot}
        </label>
        {notify && (
          <textarea
            className={styles.message}
            placeholder={a.messagePlaceholder}
            maxLength={1000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        )}
        {data?.pro && (
          <button
            type="button"
            className="btn"
            data-danger
            data-confirm={confirm === "revoke" || undefined}
            disabled={act.isPending}
            onClick={() => run("revoke", () => act.mutate({ kind: "revoke" }), true)}
          >
            {confirm === "revoke" ? a.sureRevoke : a.revoke}
          </button>
        )}
      </section>

      <section className={`section ${styles.card}`}>
        <h2 className="section-title">{a.blocking}</h2>
        {data?.banned ? (
          <button
            type="button"
            className="btn primary"
            disabled={act.isPending}
            onClick={() => run("unban", () => act.mutate({ kind: "unban" }))}
          >
            {a.unban}
          </button>
        ) : (
          <>
            <input
              className={styles.input}
              style={{ width: "100%" }}
              placeholder={a.reasonPlaceholder}
              maxLength={300}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className={styles.actions}>
              {BAN_PRESETS.map((d) => (
                <button
                  key={d}
                  type="button"
                  className="btn"
                  data-danger
                  data-confirm={confirm === `ban${d}` || undefined}
                  disabled={act.isPending}
                  onClick={() => run(`ban${d}`, () => ban({ days: d }), true)}
                >
                  {confirm === `ban${d}` ? a.sure : a.daysShort(d)}
                </button>
              ))}
              <button
                type="button"
                className="btn"
                data-danger
                data-confirm={confirm === "banF" || undefined}
                disabled={act.isPending}
                onClick={() => run("banF", () => ban({ forever: true }), true)}
              >
                {confirm === "banF" ? a.sureForever : a.forever}
              </button>
            </div>
            <div className={styles.inline}>
              <input
                className={styles.input}
                inputMode="numeric"
                placeholder={a.daysPlaceholder}
                value={banDays}
                onChange={(e) => setBanDays(e.target.value.replace(/\D/g, ""))}
              />
              <button
                type="button"
                className="btn"
                data-danger
                data-confirm={confirm === "banN" || undefined}
                disabled={!banDays || act.isPending}
                onClick={() => run("banN", () => ban({ days: Number(banDays) }), true)}
              >
                {confirm === "banN" ? a.sure : a.banFor(banDays || "N")}
              </button>
            </div>
          </>
        )}
      </section>

      {act.error && <p className={styles.error}>{act.error.message}</p>}

      {data && (data.payments.length > 0 || data.log.length > 0) && (
        <section className={`section ${styles.card}`}>
          <h2 className="section-title">{a.history}</h2>
          <ul className={styles.log}>
            {data.payments.map((p) => (
              <li key={p.id}>
                <span className="mono dim">{formatDateTime(p.createdAt)}</span> {a.payment} {p.event}
                {p.amount != null ? ` · ${formatNumber(p.amount / 100)} ${(p.currency ?? "").toUpperCase()}` : ""}
              </li>
            ))}
            {data.log.map((l) => (
              <LogLine key={l.id} entry={l} />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

// ---------- журнал ----------

function LogLine({ entry, withTarget }: { entry: LogEntry; withTarget?: boolean }) {
  const a = useT().admin;
  const { formatDateTime } = useFormat();
  return (
    <li>
      <span className="mono dim">{formatDateTime(entry.createdAt)}</span> {a.actions[entry.action] ?? entry.action}
      {withTarget && <span className="mono"> · {entry.targetLogin ?? (entry.targetId ? `tg ${entry.targetId}` : a.deleted)}</span>}
      {entry.details && <span className="dim"> · {entry.details}</span>}
    </li>
  );
}

function LogTab() {
  const a = useT().admin;
  const { data, isLoading } = useAdminLog(true);
  if (isLoading) return <RowSkeleton count={4} />;
  if (!data?.length) return <EmptyState icon="clock" title={a.logEmpty} text={a.logEmptyText} />;
  return (
    <section className={`section ${styles.card}`}>
      <ul className={styles.log}>
        {data.map((l) => (
          <LogLine key={l.id} entry={l} withTarget />
        ))}
      </ul>
    </section>
  );
}
