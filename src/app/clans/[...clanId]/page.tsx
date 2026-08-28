"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import styles from "./page.module.css";
import { useQuery } from "@tanstack/react-query";
import { getClanInfo } from "@/features/clans/api";
import { useEffect } from "react";
import { parseMinecraftText } from "@/utilis/colors";
import Image from "next/image";

const ITEMS_PER_PAGE = 20;

export default function ClanPage() {
  const params = useParams();
  let region: string = "";
  let clanId: string = "";

  if (params.clanId !== undefined && params.clanId?.length > 1) {
    region = params.clanId[0].toLowerCase();
    clanId = params.clanId[1] ?? "";
  }

  const {
    data: clanData,
    isLoading,
    error: errordataClanList,
    refetch: refetchdataClanList,
  } = useQuery({
    queryKey: ["clanInfo", clanId, region],
    enabled: !!clanId && !!region,
    queryFn: async () => {
      return await getClanInfo(region, clanId);
    },
    retry: false,
  });

  useEffect(() => {
    if (clanId && region) {
      refetchdataClanList();
    }
  }, [clanId, region, refetchdataClanList]);

  if (!clanId || !region) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.notFound}>
            <span className={styles.notFoundIcon}>⌕</span>
            <h2>Клан не найден</h2>
            <p>Проверьте правильность ID клана</p>
            <Link href="/clans" className={styles.backLink}>
              ← Вернуться к списку кланов
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.skeletonWrapper}>
            <div className={styles.skeletonHeader}>
              <div className={styles.skeletonLine} style={{ width: "60%" }} />
              <div className={styles.skeletonLine} style={{ width: "30%" }} />
            </div>
            <div className={styles.skeletonGrid}>
              <div className={styles.skeletonCard} />
              <div className={styles.skeletonCard} />
              <div className={styles.skeletonCard} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (errordataClanList || !clanData) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.notFound}>
            <span className={styles.notFoundIcon}>⚠</span>
            <h2>Ошибка загрузки</h2>
            <p>{errordataClanList?.message || "Клан не найден"}</p>
            <Link href="/clans" className={styles.backLink}>
              ← Вернуться к списку кланов
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className={styles.container}>
      <Link href="/clans" className={styles.back}>
        ← НАЗАД
      </Link>

      {/* HEADER */}
      <header className={styles.header}>
        <div className={styles.clanMainInfo}>
          <div className={styles.clanIcon}>
            {
              <Image
                src={`/${clanData.alliance}.webp`}
                alt={clanData.alliance ?? "icon"}
                width={44}
                height={44}
              />
            }
          </div>

          <div className={styles.clanTitle}>
            <div className={styles.clanTag}>[{clanData.tag || "N/A"}]</div>
            <h1>{clanData.name || "Без названия"}</h1>
            <div className={styles.clanMeta}>
              <span>ID {clanData.id}</span>
              <span className={styles.dot}>•</span>
              <span>Регион: {region.toUpperCase()}</span>
            </div>
          </div>
        </div>

        <div className={styles.status}>
          <span />
          {clanData.memberCount > 0 ? "ACTIVE" : "INACTIVE"}
        </div>
      </header>

      {/* STATS GRID */}
      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>УЧАСТНИКИ</span>
          <strong className={styles.statValue}>
            {clanData.memberCount || 0}
          </strong>
        </div>

        <div className={styles.statCard}>
          <span className={styles.statLabel}>УРОВЕНЬ</span>
          <strong className={styles.statValue}>{clanData.level || 1}</strong>
        </div>

        <div className={styles.statCard}>
          <span className={styles.statLabel}>ОЧКИ УРОВНЯ</span>
          <strong className={styles.statValue}>
            {clanData.levelPoint || 0}
          </strong>
        </div>

        <div className={styles.statCard}>
          <span className={styles.statLabel}>ЛИДЕР</span>
          <strong className={styles.statValue}>{clanData.leader || "—"}</strong>
        </div>
      </section>

      {/* DESCRIPTION */}
      {clanData.description && (
        <section className={styles.descriptionSection}>
          <h3>ОПИСАНИЕ</h3>
          <div
            className={styles.descriptionContent}
            dangerouslySetInnerHTML={{
              __html: parseMinecraftText(clanData.description),
            }}
          />
        </section>
      )}

      {/* REGISTRATION TIME */}
      <section className={styles.metaSection}>
        <div className={styles.metaItem}>
          <span>Дата регистрации</span>
          <strong>
            {clanData.registrationTime
              ? new Date(clanData.registrationTime).toLocaleDateString(
                  "ru-RU",
                  {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  },
                )
              : "—"}
          </strong>
        </div>
      </section>

      <footer className={styles.footer}>
        <span>STALZONE CLANS</span>
        <span>03</span>
      </footer>
    </main>
  );
}
