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
import { isNotFound } from "@/lib/api";
import { formatDate, formatDateTime, formatNumber, formatRelative } from "@/lib/format";
import { haptic } from "@/lib/telegram";
import styles from "./admin.module.css";

type Tab = "dash" | "users" | "log";

export default function AdminPage() {
  const me = useMe();
  const [tab, setTab] = useState<Tab>("dash");
  const admin = Boolean(me.me?.admin);

  if (me.pending)
    return (
      <main className="page">
        <PageHeader eyebrow="Служебное" title="Админка" />
        <RowSkeleton count={4} />
      </main>
    );
  if (!me.loggedIn)
    return (
      <main className="page">
        <PageHeader eyebrow="Служебное" title="Админка" />
        <LoginCard text="Админка открывается для аккаунта с Telegram администратора. Войдите через EXBO." />
      </main>
    );
  if (!admin)
    return (
      <main className="page">
        <EmptyState icon="shield" title="Сюда не ходят" text="Эта страница только для администраторов." />
      </main>
    );

  return (
    <main className="page">
      <PageHeader eyebrow="Служебное" title="Админка" />
      <div style={{ marginBottom: 14 }}>
        <Segmented
          label="Раздел"
          value={tab}
          onChange={(v) => setTab(v as Tab)}
          options={[
            { value: "dash", label: "Дашборд" },
            { value: "users", label: "Пользователи" },
            { value: "log", label: "Журнал" },
          ]}
        />
      </div>
      {tab === "dash" ? <DashboardTab /> : tab === "users" ? <UsersTab /> : <LogTab />}
    </main>
  );
}

// ---------- дашборд ----------

const money = (rows: Money[]) =>
  rows.length ? rows.map((r) => `${formatNumber(r.amount / 100)} ${r.currency.toUpperCase()}`).join(" · ") : "0";

function DashboardTab() {
  const { data, isLoading, error, refetch } = useDashboard(true);
  if (isLoading) return <RowSkeleton count={6} />;
  if (error || !data) return <ErrorState onRetry={() => void refetch()} />;
  const { users, pro, revenue, alerts, series, collector } = data;

  return (
    <>
      <section className={styles.tiles}>
        <Stat
          label="Аккаунтов"
          value={users.total}
          hint={`+${users.new1} за сутки · +${users.new7} за неделю · с Telegram ${users.telegram}`}
        />
        <Stat label="Активны сегодня" value={users.dau} hint={`неделя ${users.wau} · месяц ${users.mau}`} />
        <Stat label="Pro активен" value={pro.active} hint={`пробных взято ${pro.trials}`} accent />
        <Stat label="Платящих" value={pro.paidUsers} hint={`платежей ${pro.payments}`} />
        <Stat label="Выручка за 30 дней" text={money(revenue.last30)} hint={`всего ${money(revenue.total)}`} accent />
        <Stat
          label="Алерты"
          value={alerts.price + alerts.flip}
          hint={`цен ${alerts.price} · флип ${alerts.flip} · выброс ${alerts.emission}`}
        />
        <Stat label="Забанено" value={users.banned} />
      </section>

      <Bars title="Активные пользователи по дням" points={series.active} />
      <Bars title="Новые пользователи по дням" points={series.newUsers} />
      <Bars title="Платежи по дням" points={series.payments} />

      <section className={`section ${styles.card}`}>
        <h2 className="section-title">Сборщик аукциона</h2>
        <dl className={styles.facts}>
          <Fact k="Регионы" v={collector.regions.join(", ").toUpperCase()} />
          <Fact k="Предметов в работе" v={formatNumber(collector.tracked)} />
          <Fact k="Просрочено лотов / продаж" v={`${collector.overdue.lots} / ${collector.overdue.sales}`} />
          <Fact k="Догружают историю" v={formatNumber(collector.backfilling)} />
          <Fact k="Квота EXBO" v={`${collector.budget.available} из ${collector.budget.perMinute}/мин`} />
          <Fact k="Продаж в базе" v={formatNumber(collector.stored.sales)} />
          <Fact k="Активных лотов" v={formatNumber(collector.stored.activeLots)} />
        </dl>
      </section>
      <p className={`dim ${styles.updated}`}>Обновлено {formatDateTime(data.updatedAt)} · раз в минуту</p>
    </>
  );
}

function Stat({ label, value, text, hint, accent }: { label: string; value?: number; text?: string; hint?: string; accent?: boolean }) {
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
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...points.map((p) => p.n));
  const total = points.reduce((s, p) => s + p.n, 0);
  const shown = hover != null ? points[hover] : null;
  return (
    <section className={`section ${styles.card}`}>
      <h2 className="section-title">
        {title} <small>{shown ? `${formatDate(shown.day)}: ${shown.n}` : `за 30 дней: ${formatNumber(total)}`}</small>
      </h2>
      <div className={styles.bars} onMouseLeave={() => setHover(null)} role="img" aria-label={`${title}: всего ${total}`}>
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
        <span>сегодня</span>
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
  const [query, setQuery] = useState("");
  const q = useDeferredValue(query.trim());
  const [selected, setSelected] = useState<string | null>(null);
  const list = useAdminUsers(q, !selected);

  if (selected) return <UserCard id={selected} onBack={() => setSelected(null)} />;

  return (
    <>
      <SearchField value={query} onChange={setQuery} placeholder="Логин EXBO, @ник Telegram или Telegram id" aria-label="Поиск аккаунта" />
      <div className="stack" style={{ gap: 6, marginTop: 10 }}>
        {list.isLoading && <RowSkeleton count={4} />}
        {list.data?.map((u) => (
          <UserRow key={u.id} user={u} onOpen={() => setSelected(u.id)} />
        ))}
        {list.data && !list.data.length && (
          <EmptyState icon="user" title="Никого не нашли" text="Аккаунт появляется после первого входа через EXBO." />
        )}
      </div>
    </>
  );
}

function Badges({ user }: { user: AdminUser }) {
  return (
    <span className={styles.badges}>
      {user.pro && (
        <span className={styles.badge} data-tone="pro">
          Pro
        </span>
      )}
      {user.banned && (
        <span className={styles.badge} data-tone="ban">
          Бан
        </span>
      )}
      {user.trialUsedAt && !user.pro && <span className={styles.badge}>пробный был</span>}
      {user.telegram?.botBlocked && <span className={styles.badge}>бот заблокирован</span>}
      {!user.telegram && <span className={styles.badge}>без Telegram</span>}
    </span>
  );
}

/** «@ник» или имя в Telegram */
const telegramOf = (t: NonNullable<AdminUser["telegram"]>) => (t.username ? `@${t.username}` : t.firstName || `id ${t.chatId}`);

function UserRow({ user, onOpen }: { user: AdminUser; onOpen: () => void }) {
  return (
    <button type="button" className="list-row" onClick={() => (haptic.select(), onOpen())}>
      <span style={{ flex: 1, minWidth: 0, textAlign: "left", display: "grid", gap: 2 }}>
        <strong className="truncate" style={{ fontSize: 14 }}>
          {user.login} {user.telegram && <span className="dim">· {telegramOf(user.telegram)}</span>}
        </strong>
        <span className="dim mono" style={{ fontSize: 11 }}>
          {user.lastSeenAt ? `был ${formatRelative(user.lastSeenAt)}` : "не заходил"}
        </span>
      </span>
      <Badges user={user} />
    </button>
  );
}

const PRO_PRESETS = [1, 3, 7, 30, 90, 365];
const BAN_PRESETS = [1, 7, 30];

function UserCard({ id, onBack }: { id: string; onBack: () => void }) {
  const { data, isLoading, error } = useAdminUser(id);
  const act = useAdminAction(id);
  const [proDays, setProDays] = useState("");
  const [proDate, setProDate] = useState("");
  const [notify, setNotify] = useState(true);
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
  const pro = (term: Term) => act.mutate({ kind: "pro", term, notify });
  const ban = (term: Term) => act.mutate({ kind: "ban", term, reason });

  return (
    <>
      <button type="button" className="btn" onClick={onBack} style={{ marginBottom: 12 }}>
        ← К списку
      </button>
      {isLoading && <RowSkeleton count={3} />}
      {error && !gone && <ErrorState />}
      {gone && <EmptyState icon="user" title="Аккаунт не найден" text="Возможно, он удалён." />}

      <section className={`section ${styles.card}`}>
        <h2 className={styles.userName}>
          {data?.login ?? "…"} {data && <Badges user={data} />}
        </h2>
        {data && (
          <dl className={styles.facts}>
            <Fact k="Telegram" v={data.telegram ? `${telegramOf(data.telegram)} · id ${data.telegram.chatId}` : "не привязан"} />
            <Fact k="Pro" v={data.pro && data.proUntil ? `до ${formatDateTime(data.proUntil)}` : "нет"} />
            {data.banned && <Fact k="Бан" v={`до ${formatDateTime(data.bannedUntil!)}${data.banReason ? ` · ${data.banReason}` : ""}`} />}
            <Fact k="Последний визит" v={data.lastSeenAt ? formatDateTime(data.lastSeenAt) : "—"} />
            <Fact k="Впервые" v={formatDate(data.createdAt)} />
            <Fact k="Алерты" v={`цен ${data.alerts.price} · флип ${data.alerts.flip}`} />
          </dl>
        )}
      </section>

      <section className={`section ${styles.card}`}>
        <h2 className="section-title">Pro</h2>
        <div className={styles.actions}>
          {PRO_PRESETS.map((d) => (
            <button key={d} type="button" className="btn" disabled={act.isPending} onClick={() => run(`pro${d}`, () => pro({ days: d }))}>
              +{d} д
            </button>
          ))}
          <button
            type="button"
            className="btn"
            data-confirm={confirm === "proF" || undefined}
            disabled={act.isPending}
            onClick={() => run("proF", () => pro({ forever: true }), true)}
          >
            {confirm === "proF" ? "Точно навсегда?" : "Навсегда"}
          </button>
        </div>
        <div className={styles.inline}>
          <input
            className={styles.input}
            inputMode="numeric"
            placeholder="дней"
            value={proDays}
            onChange={(e) => setProDays(e.target.value.replace(/\D/g, ""))}
          />
          <button
            type="button"
            className="btn"
            disabled={!proDays || act.isPending}
            onClick={() => run("proN", () => pro({ days: Number(proDays) }))}
          >
            +{proDays || "N"} д
          </button>
          <input
            className={styles.input}
            type="date"
            value={proDate}
            onChange={(e) => setProDate(e.target.value)}
            aria-label="Pro до даты"
          />
          <button
            type="button"
            className="btn"
            disabled={!proDate || act.isPending}
            onClick={() => run("proD", () => pro({ until: new Date(`${proDate}T23:59:59`).toISOString() }))}
          >
            До даты
          </button>
        </div>
        <label className={styles.check}>
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} /> Сообщить в боте
        </label>
        {data?.pro && (
          <button
            type="button"
            className="btn"
            data-danger
            data-confirm={confirm === "revoke" || undefined}
            disabled={act.isPending}
            onClick={() => run("revoke", () => act.mutate({ kind: "revoke" }), true)}
          >
            {confirm === "revoke" ? "Точно снять Pro?" : "Снять Pro"}
          </button>
        )}
      </section>

      <section className={`section ${styles.card}`}>
        <h2 className="section-title">Блокировка</h2>
        {data?.banned ? (
          <button
            type="button"
            className="btn primary"
            disabled={act.isPending}
            onClick={() => run("unban", () => act.mutate({ kind: "unban" }))}
          >
            Разбанить
          </button>
        ) : (
          <>
            <input
              className={styles.input}
              style={{ width: "100%" }}
              placeholder="Причина (видна только в админке)"
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
                  {confirm === `ban${d}` ? "Точно?" : `${d} д`}
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
                {confirm === "banF" ? "Точно навсегда?" : "Навсегда"}
              </button>
            </div>
            <div className={styles.inline}>
              <input
                className={styles.input}
                inputMode="numeric"
                placeholder="дней"
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
                {confirm === "banN" ? "Точно?" : `Бан на ${banDays || "N"} д`}
              </button>
            </div>
          </>
        )}
      </section>

      {act.error && <p className={styles.error}>{act.error.message}</p>}

      {data && (data.payments.length > 0 || data.log.length > 0) && (
        <section className={`section ${styles.card}`}>
          <h2 className="section-title">История</h2>
          <ul className={styles.log}>
            {data.payments.map((p) => (
              <li key={p.id}>
                <span className="mono dim">{formatDateTime(p.createdAt)}</span> Оплата {p.event}
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

const ACTION_LABEL: Record<LogEntry["action"], string> = {
  pro_grant: "выдан Pro",
  pro_revoke: "снят Pro",
  ban: "бан",
  unban: "разбан",
};

function LogLine({ entry, withTarget }: { entry: LogEntry; withTarget?: boolean }) {
  return (
    <li>
      <span className="mono dim">{formatDateTime(entry.createdAt)}</span> {ACTION_LABEL[entry.action] ?? entry.action}
      {withTarget && <span className="mono"> · {entry.targetLogin ?? (entry.targetId ? `tg ${entry.targetId}` : "удалён")}</span>}
      {entry.details && <span className="dim"> · {entry.details}</span>}
    </li>
  );
}

function LogTab() {
  const { data, isLoading } = useAdminLog(true);
  if (isLoading) return <RowSkeleton count={4} />;
  if (!data?.length) return <EmptyState icon="clock" title="Пока пусто" text="Здесь появятся выдачи Pro и баны." />;
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
