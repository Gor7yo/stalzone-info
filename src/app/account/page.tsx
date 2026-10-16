"use client";

import Link from "next/link";
import { LoginCard, TelegramLinkCard } from "@/components/Account/AccountGate";
import { Icon } from "@/components/Icon";
import { ProBadge } from "@/components/Pro/Pro";
import { PageHeader } from "@/components/ui/PageHeader";
import { LangSwitch } from "@/components/ui/RegionSwitch";
import { RowSkeleton } from "@/components/ui/States";
import { type Me, useLogin, useLogout, useMe, useRefreshCharacters, useUnlinkTelegram } from "@/features/account";
import { useFormat, useT } from "@/i18n/client";
import { REGIONS } from "@/lib/store";
import { haptic, useIsTelegram } from "@/lib/telegram";
import styles from "./account.module.css";

const regionLabel = (r: string) => REGIONS.find((x) => x.value === r)?.label ?? r.toUpperCase();

/** Аккаунт: вход через EXBO, Pro, персонажи и Telegram для уведомлений. */
export default function AccountPage() {
  const t = useT().account;
  const { me, pending } = useMe();

  return (
    <main className="page">
      <PageHeader eyebrow={t.eyebrow} title={t.title} aside={<LangSwitch />}>
        {t.lead}
      </PageHeader>

      {pending ? (
        <RowSkeleton count={3} />
      ) : !me ? (
        <LoginCard text={t.login} />
      ) : (
        <>
          <Profile me={me} />
          <Characters me={me} />
          <Telegram me={me} />
        </>
      )}
    </main>
  );
}

function Profile({ me }: { me: Me }) {
  const t = useT().account;
  const { formatDate } = useFormat();
  const inTelegram = useIsTelegram();
  const logout = useLogout();

  return (
    <section className={`glass ${styles.card}`}>
      <div className={styles.head}>
        <span className={styles.avatar}>{me.login.slice(0, 1).toUpperCase()}</span>
        <span className={styles.who}>
          <strong>{me.login}</strong>
          <span>{t.exboAccount}</span>
        </span>
      </div>
      <Link href="/pro" className={`list-row ${styles.row}`} onClick={() => haptic.tap()}>
        <ProBadge />
        <span className={styles.who}>
          <strong>{me.pro ? t.proActive : t.free}</strong>
          <span>{me.pro && me.proUntil ? t.until(formatDate(me.proUntil)) : me.trialAvailable ? t.trial : t.proPitch}</span>
        </span>
        <Icon name="chevron" size={18} />
      </Link>
      {/* в мини-приложении аккаунт узнаётся по Telegram - «выйти» значит отвязать его */}
      {!inTelegram && (
        <button type="button" className={`btn ${styles.unlink}`} disabled={logout.isPending} onClick={() => logout.mutate()}>
          {t.logout}
        </button>
      )}
    </section>
  );
}

function Characters({ me }: { me: Me }) {
  const t = useT().account;
  const { formatRelative } = useFormat();
  const refresh = useRefreshCharacters();

  return (
    <section className="section">
      <h2 className="section-title">{t.characters}</h2>
      <div className={`glass ${styles.card}`}>
        {me.revoked && <ReLogin />}

        {me.characters.length > 0 ? (
          <div className="stack" style={{ gap: 8 }}>
            {me.characters.map((c) => (
              <Link
                key={`${c.region}-${c.name}`}
                href={`/character/${c.region}/${encodeURIComponent(c.name)}`}
                className={`list-row ${styles.row}`}
                onClick={() => haptic.tap()}
              >
                <span className={styles.region}>{regionLabel(c.region)}</span>
                <span className={styles.who}>
                  <strong>{c.name}</strong>
                  <span>{c.clan ? `${c.clan.tag ? `[${c.clan.tag}] ` : ""}${c.clan.name}` : t.noClan}</span>
                </span>
                <Icon name="chevron" size={18} />
              </Link>
            ))}
          </div>
        ) : (
          <p className="dim">{t.noCharacters}</p>
        )}

        <div className={styles.actions}>
          <span className={styles.meta}>{me.charactersAt ? t.updated(formatRelative(me.charactersAt)) : t.notLoaded}</span>
          {!me.revoked && (
            <button type="button" className="btn" disabled={refresh.isPending} onClick={() => refresh.mutate()}>
              <Icon name="refresh" size={16} /> {refresh.isPending ? t.refreshing : t.refresh}
            </button>
          )}
        </div>
        {refresh.error && <p className={styles.error}>{refresh.error.message}</p>}
      </div>
    </section>
  );
}

function Telegram({ me }: { me: Me }) {
  const t = useT().account;
  const inTelegram = useIsTelegram();
  const unlink = useUnlinkTelegram();

  return (
    <section className="section">
      <h2 className="section-title">Telegram</h2>
      {!me.telegram ? (
        <TelegramLinkCard text={t.linkTelegram} />
      ) : (
        <div className={`glass ${styles.card}`}>
          <div className={styles.head}>
            <span className={styles.avatar}>
              <Icon name="bell" size={18} />
            </span>
            <span className={styles.who}>
              <strong>{me.telegram.username ? `@${me.telegram.username}` : (me.telegram.firstName ?? t.telegramLinked)}</strong>
              <span>{me.telegram.blocked ? t.botBlocked : t.alertsHere}</span>
            </span>
          </div>
          <button
            type="button"
            className={`btn ${styles.unlink}`}
            disabled={unlink.isPending}
            onClick={() => {
              if (confirm(inTelegram ? t.unlinkConfirmTma : t.unlinkConfirm)) unlink.mutate();
            }}
          >
            {t.unlink}
          </button>
          {unlink.error && <p className={styles.error}>{unlink.error.message}</p>}
        </div>
      )}
    </section>
  );
}

function ReLogin() {
  const t = useT();
  const login = useLogin();
  return (
    <div className="stack" style={{ gap: 8 }}>
      <p className={styles.error}>{t.account.revoked}</p>
      <button type="button" className="btn primary" disabled={login.isPending} onClick={() => login.mutate(undefined)}>
        {login.isPending ? t.gate.opening : t.account.reLogin}
      </button>
    </div>
  );
}
