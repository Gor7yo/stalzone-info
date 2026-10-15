"use client";

import Link from "next/link";
import { LoginCard, TelegramLinkCard } from "@/components/Account/AccountGate";
import { Icon } from "@/components/Icon";
import { ProBadge } from "@/components/Pro/Pro";
import { PageHeader } from "@/components/ui/PageHeader";
import { RowSkeleton } from "@/components/ui/States";
import { type Me, useLogin, useLogout, useMe, useRefreshCharacters, useUnlinkTelegram } from "@/features/account";
import { formatDate, formatRelative } from "@/lib/format";
import { REGIONS } from "@/lib/store";
import { haptic, useIsTelegram } from "@/lib/telegram";
import styles from "./account.module.css";

const regionLabel = (r: string) => REGIONS.find((x) => x.value === r)?.label ?? r.toUpperCase();

/** Аккаунт: вход через EXBO, Pro, персонажи и Telegram для уведомлений. */
export default function AccountPage() {
  const { me, pending } = useMe();

  return (
    <main className="page">
      <PageHeader eyebrow="ПДА" title="Аккаунт">
        Вход через EXBO: Pro, персонажи и уведомления в Telegram — на сайте и в мини-приложении.
      </PageHeader>

      {pending ? (
        <RowSkeleton count={3} />
      ) : !me ? (
        <LoginCard text="Войдите через EXBO - сайт сам найдёт ваших персонажей и их кланы во всех регионах, а Pro и алерты будут на вашем аккаунте." />
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
  const inTelegram = useIsTelegram();
  const logout = useLogout();

  return (
    <section className={`glass ${styles.card}`}>
      <div className={styles.head}>
        <span className={styles.avatar}>{me.login.slice(0, 1).toUpperCase()}</span>
        <span className={styles.who}>
          <strong>{me.login}</strong>
          <span>Аккаунт EXBO</span>
        </span>
      </div>
      <Link href="/pro" className={`list-row ${styles.row}`} onClick={() => haptic.tap()}>
        <ProBadge />
        <span className={styles.who}>
          <strong>{me.pro ? "Pro активен" : "Бесплатная версия"}</strong>
          <span>
            {me.pro && me.proUntil
              ? `до ${formatDate(me.proUntil)}`
              : me.trialAvailable
                ? "Пробные 3 дня - бесплатно"
                : "Флиппер, графики, флип-алерты"}
          </span>
        </span>
        <Icon name="chevron" size={18} />
      </Link>
      {/* в мини-приложении аккаунт узнаётся по Telegram - «выйти» значит отвязать его */}
      {!inTelegram && (
        <button type="button" className={`btn ${styles.unlink}`} disabled={logout.isPending} onClick={() => logout.mutate()}>
          Выйти
        </button>
      )}
    </section>
  );
}

function Characters({ me }: { me: Me }) {
  const refresh = useRefreshCharacters();

  return (
    <section className="section">
      <h2 className="section-title">Персонажи</h2>
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
                  <span>{c.clan ? `${c.clan.tag ? `[${c.clan.tag}] ` : ""}${c.clan.name}` : "Без клана"}</span>
                </span>
                <Icon name="chevron" size={18} />
              </Link>
            ))}
          </div>
        ) : (
          <p className="dim">Персонажей на этом аккаунте EXBO не нашли.</p>
        )}

        <div className={styles.actions}>
          <span className={styles.meta}>{me.charactersAt ? `Обновлено ${formatRelative(me.charactersAt)}` : "Ещё не загружены"}</span>
          {!me.revoked && (
            <button type="button" className="btn" disabled={refresh.isPending} onClick={() => refresh.mutate()}>
              <Icon name="refresh" size={16} /> {refresh.isPending ? "Обновляем…" : "Обновить"}
            </button>
          )}
        </div>
        {refresh.error && <p className={styles.error}>{refresh.error.message}</p>}
      </div>
    </section>
  );
}

function Telegram({ me }: { me: Me }) {
  const inTelegram = useIsTelegram();
  const unlink = useUnlinkTelegram();

  return (
    <section className="section">
      <h2 className="section-title">Telegram</h2>
      {!me.telegram ? (
        <TelegramLinkCard text="Алерты цен, флипов и выброса приходят в Telegram-бота. Привяжите Telegram — это один клик в боте." />
      ) : (
        <div className={`glass ${styles.card}`}>
          <div className={styles.head}>
            <span className={styles.avatar}>
              <Icon name="bell" size={18} />
            </span>
            <span className={styles.who}>
              <strong>{me.telegram.username ? `@${me.telegram.username}` : (me.telegram.firstName ?? "Telegram привязан")}</strong>
              <span>
                {me.telegram.blocked ? "Бот заблокирован - нажмите /start в боте, иначе уведомления не дойдут" : "Сюда приходят алерты"}
              </span>
            </span>
          </div>
          <button
            type="button"
            className={`btn ${styles.unlink}`}
            disabled={unlink.isPending}
            onClick={() => {
              const text = inTelegram
                ? "Отвязать этот Telegram? Алерты перестанут приходить, а в мини-приложении нужно будет снова войти через EXBO."
                : "Отвязать Telegram? Алерты перестанут приходить, пока не привяжете снова.";
              if (confirm(text)) unlink.mutate();
            }}
          >
            Отвязать
          </button>
          {unlink.error && <p className={styles.error}>{unlink.error.message}</p>}
        </div>
      )}
    </section>
  );
}

function ReLogin() {
  const login = useLogin();
  return (
    <div className="stack" style={{ gap: 8 }}>
      <p className={styles.error}>EXBO отозвал доступ сайта к аккаунту - войдите заново, чтобы обновлять персонажей.</p>
      <button type="button" className="btn primary" disabled={login.isPending} onClick={() => login.mutate(undefined)}>
        {login.isPending ? "Открываем EXBO…" : "Войти заново"}
      </button>
    </div>
  );
}
