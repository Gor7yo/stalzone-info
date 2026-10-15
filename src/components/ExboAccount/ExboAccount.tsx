"use client";

import Link from "next/link";
import { type ExboAccount as Account, useExbo, useExboLogin, useExboRefresh, useExboUnlink } from "@/features/exbo";
import { formatRelative } from "@/lib/format";
import { REGIONS } from "@/lib/store";
import { haptic } from "@/lib/telegram";
import { Icon } from "../Icon";
import styles from "./ExboAccount.module.css";

const regionLabel = (r: string) => REGIONS.find((x) => x.value === r)?.label ?? r.toUpperCase();

/** Карточка «Аккаунт EXBO»: вход через EXBO привязывает игровой аккаунт к Telegram. */
export function ExboAccount() {
  const exbo = useExbo();
  if (!exbo.available || exbo.isPending) return null;

  return (
    <section className="section">
      <h2 className="section-title">Аккаунт EXBO</h2>
      {exbo.data ? <Linked account={exbo.data} /> : <LoginCard />}
    </section>
  );
}

function LoginCard({ text }: { text?: string }) {
  const login = useExboLogin();
  return (
    <div className={`glass ${styles.card}`}>
      <p className={styles.note}>
        <Icon name="user" size={18} />
        <span>
          {text ?? "Войдите через EXBO - сайт сам найдёт ваших персонажей и их кланы во всех регионах. Пароль вводится только на exbo.net."}
        </span>
      </p>
      <button
        type="button"
        className="btn primary"
        disabled={login.isPending}
        onClick={() => {
          haptic.tap();
          login.mutate();
        }}
      >
        {login.isPending ? "Открываем EXBO…" : "Войти через EXBO"}
      </button>
      {login.error && <p className={styles.error}>{login.error.message}</p>}
    </div>
  );
}

function Linked({ account }: { account: Account }) {
  const refresh = useExboRefresh();
  const unlink = useExboUnlink();

  return (
    <div className={`glass ${styles.card}`}>
      <div className={styles.head}>
        <span className={styles.avatar}>{account.login.slice(0, 1).toUpperCase()}</span>
        <span className={styles.who}>
          <strong>{account.login}</strong>
          <span>{account.charactersAt ? `Персонажи обновлены ${formatRelative(account.charactersAt)}` : "Персонажи ещё не загружены"}</span>
        </span>
      </div>

      {account.revoked && (
        <p className={styles.error}>EXBO отозвал доступ сайта к аккаунту - войдите заново, чтобы обновлять персонажей.</p>
      )}

      {account.characters.length > 0 ? (
        <div className="stack" style={{ gap: 8 }}>
          {account.characters.map((c) => (
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
        {account.revoked ? (
          <ReLogin />
        ) : (
          <button type="button" className="btn" disabled={refresh.isPending} onClick={() => refresh.mutate()}>
            <Icon name="refresh" size={16} /> {refresh.isPending ? "Обновляем…" : "Обновить"}
          </button>
        )}
        <button
          type="button"
          className={`btn ${styles.unlink}`}
          disabled={unlink.isPending}
          onClick={() => {
            if (confirm("Отвязать аккаунт EXBO? Сайт забудет его и токен доступа.")) unlink.mutate();
          }}
        >
          Отвязать
        </button>
      </div>
      {(refresh.error ?? unlink.error) && <p className={styles.error}>{(refresh.error ?? unlink.error)?.message}</p>}
    </div>
  );
}

function ReLogin() {
  const login = useExboLogin();
  return (
    <button type="button" className="btn primary" disabled={login.isPending} onClick={() => login.mutate()}>
      {login.isPending ? "Открываем EXBO…" : "Войти заново"}
    </button>
  );
}
