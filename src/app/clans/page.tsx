"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";
import { useQuery } from "@tanstack/react-query";
import { getClansList } from "@/features/clans/api";
import { IClanInfo, IQueryParamsClan } from "@/features/clans/types";
import Link from "next/link";
import Image from "next/image";

const regions = ["RU", "EU", "SEA", "NA"];
const ITEMS_PER_PAGE = 20;

export default function ClanPage() {
  const [activeFilter, setActiveFilter] = useState<string>("RU");
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [totalClans, setTotalClans] = useState<number>(0);
  const [clans, setClans] = useState<any>([]);

  const {
    data: dataClanList,
    isLoading,
    error: errordataClanList,
    refetch: refetchdataClanList,
  } = useQuery({
    // ВАЖНО: добавляем currentPage и searchQuery в queryKey
    queryKey: ["dataClanList", activeFilter, currentPage, searchQuery],
    enabled: false,
    queryFn: async () => {
      const offset = (currentPage - 1) * ITEMS_PER_PAGE;

      const queryParams: IQueryParamsClan = {
        region: activeFilter.toLowerCase(),
        offset: offset.toString(),
        limit: ITEMS_PER_PAGE.toString(),
      };

      return await getClansList(activeFilter.toLowerCase(), queryParams);
    },
    retry: false,
  });

  const getTotalPagesFromData = (data: any): number => {
    if (!data) return 0;

    // Если выбран "ВСЕ", суммируем totalClans из всех регионов
    if (activeFilter === "RU,EU,SEA,NA") {
      let total = 0;
      Object.values(data).forEach((regionData: any) => {
        if (regionData?.totalClans) {
          total += regionData.totalClans;
        }
      });
      return Math.ceil(total / ITEMS_PER_PAGE);
    }

    // Для конкретного региона
    const regionKey = activeFilter.toLowerCase();
    const regionData = data[regionKey];
    if (regionData?.totalClans) {
      return Math.ceil(regionData.totalClans / ITEMS_PER_PAGE);
    }

    return 0;
  };

  const getClansFromData = (data: any): any[] => {
    if (!data) return [];

    // Если выбран "ВСЕ", собираем кланы из всех регионов
    if (activeFilter === "RU,EU,SEA,NA") {
      const allClans: any[] = [];
      Object.values(data).forEach((regionData: any) => {
        if (regionData?.data) {
          allClans.push(...regionData.data);
        }
      });
      return allClans;
    }

    // Для конкретного региона
    const regionKey = activeFilter.toLowerCase();
    return data[regionKey]?.data || [];
  };

  useEffect(() => {
    if (dataClanList) {
      // Получаем общее количество кланов
      let total = 0;
      if (activeFilter === "RU,EU,SEA,NA") {
        Object.values(dataClanList).forEach((regionData: any) => {
          if (regionData?.totalClans) {
            total += regionData.totalClans;
          }
        });
      } else {
        const regionKey = activeFilter.toLowerCase();
        total = dataClanList[regionKey]?.totalClans || 0;
      }

      setTotalClans(total);
      setTotalPages(Math.ceil(total / ITEMS_PER_PAGE));
      setClans(getClansFromData(dataClanList));
    }
  }, [dataClanList, activeFilter]);

  const handleGetClansList = async () => {
    // Сбрасываем на первую страницу при новом поиске
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
    await refetchdataClanList();
  };

  const handlePageChange = (page: number) => {
    if (page === currentPage || page < 1 || page > totalPages) return;
    setCurrentPage(page);
    // Запрос выполнится автоматически из-за изменения queryKey
  };

  // Обработчик изменения поиска
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  // Обработчик нажатия Enter в поиске
  const handleSearchKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Enter") {
      handleGetClansList();
    }
  };

  useEffect(() => {
    refetchdataClanList();
  }, [currentPage]);

  // Обработчик изменения фильтра региона
  const handleRegionChange = (region: string) => {
    setActiveFilter(region);
    setCurrentPage(1);
    setSearchQuery("");
    refetchdataClanList();
  };

  // Вычисляем отображаемое количество
  const startCount =
    totalClans > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
  const endCount = Math.min(currentPage * ITEMS_PER_PAGE, totalClans);

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <a href="/" className={styles.back}>
          ← НАЗАД
        </a>

        <header className={styles.header}>
          <div className={styles.titleRow}>
            <div>
              <span className={styles.number}>03</span>
              <h1>Кланы</h1>
            </div>

            <div className={styles.status}>
              <span />
              DATABASE
            </div>
          </div>

          <p className={styles.description}>
            Поиск кланов и информация об их составе.
          </p>
        </header>

        {/* SEARCH */}

        <section className={styles.searchSection}>
          <div className={styles.search}>
            <span>⌕</span>
            <input
              placeholder="Введите название или ID клана..."
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
            />
          </div>

          <button
            className={styles.searchButton}
            onClick={handleGetClansList}
            disabled={isLoading}
          >
            {isLoading ? "ЗАГРУЗКА..." : "НАЙТИ"}
          </button>
        </section>

        {/* FILTER */}

        <div className={styles.filters}>
          {regions.map((region) => (
            <button
              key={region}
              onClick={() => handleRegionChange(region)}
              className={`${styles.filter} ${activeFilter === region ? styles.active : ""}`}
            >
              {region === "RU,EU,SEA,NA" ? "ВСЕ" : region}
            </button>
          ))}
        </div>

        {/* LIST */}

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span>
              НАЙДЕННЫЕ КЛАНЫ
              {totalClans > 0 &&
                ` (${startCount}-${endCount} из ${totalClans})`}
            </span>
            <span>{totalClans}</span>
          </div>

          <div className={styles.list}>
            {/* Состояние загрузки */}
            {isLoading && (
              <>
                {Array.from({ length: ITEMS_PER_PAGE }, (_, i) => (
                  <SkeletonClanCard key={`skeleton-${i}`} />
                ))}
              </>
            )}

            {/* Состояние ошибки */}
            {errordataClanList && (
              <div className={styles.error}>
                Ошибка: {errordataClanList.message}
              </div>
            )}

            {/* Рендеринг списка кланов */}
            {!isLoading &&
              !errordataClanList &&
              clans.length > 0 &&
              clans.map((clan: IClanInfo) => (
                <ClanCard
                  key={clan.id || clan.name}
                  name={clan.name}
                  tag={clan.tag}
                  id={clan.id}
                  members={clan.memberCount?.toString() || "0"}
                  alliance={clan.alliance}
                  region={
                    activeFilter === "RU,EU,SEA,NA"
                      ? clan.region || "ALL"
                      : activeFilter
                  }
                />
              ))}

            {/* Состояние когда нет данных */}
            {!isLoading && !errordataClanList && clans.length === 0 && (
              <div className={styles.empty}>Кланы не найдены</div>
            )}
          </div>

          {/* Пагинация - переместил внутрь section, но под список */}
          {!errordataClanList && totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.pageButton}
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || isLoading}
              >
                ←
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => {
                  // Показываем только ближайшие страницы
                  if (
                    page === 1 ||
                    page === totalPages ||
                    Math.abs(page - currentPage) <= 2
                  ) {
                    return (
                      <button
                        key={page}
                        className={`${styles.pageButton} ${currentPage === page ? styles.active : ""}`}
                        onClick={() => handlePageChange(page)}
                        disabled={isLoading}
                      >
                        {page}
                      </button>
                    );
                  }

                  // Показываем ... для пропущенных страниц
                  if (
                    (page === 2 && currentPage > 4) ||
                    (page === totalPages - 1 && currentPage < totalPages - 3)
                  ) {
                    return (
                      <span key={page} className={styles.pageDots}>
                        ...
                      </span>
                    );
                  }

                  return null;
                },
              )}

              <button
                className={styles.pageButton}
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || isLoading}
              >
                →
              </button>
            </div>
          )}
        </section>

        <footer className={styles.footer}>
          <span>STALZONE CLANS</span>
          <span>03</span>
        </footer>
      </div>
    </main>
  );
}

function ClanCard({
  name,
  tag,
  id,
  members,
  region,
  alliance,
}: {
  name: string;
  tag: string;
  id: string;
  members: string;
  region: string;
  alliance: string;
}) {
  return (
    <Link href={`clans/${region}/${id}`}>
      <article className={styles.clan}>
        <div className={styles.clanIcon}>
          {
            <Image
              src={`/${alliance}.webp`}
              alt={alliance ?? "icon"}
              width={28}
              height={28}
            />
          }
        </div>

        <div className={styles.clanInfo}>
          <span className={styles.clanTag}>[{tag}]</span>

          <h2>{name}</h2>

          <span className={styles.clanId}>ID {id}</span>
        </div>

        <div className={styles.clanStats}>
          <div>
            <span>УЧАСТНИКИ</span>
            <strong>{members}</strong>
          </div>

          <div>
            <span>РЕГИОН</span>
            <strong>{region}</strong>
          </div>
        </div>

        <span className={styles.arrow}>→</span>
      </article>
    </Link>
  );
}

function SkeletonClanCard() {
  return (
    <article className={`${styles.clan} ${styles.skeleton}`}>
      <div className={`${styles.clanIcon} ${styles.skeletonIcon}`} />

      <div className={styles.clanInfo}>
        <span className={`${styles.clanTag} ${styles.skeletonText}`}>[——]</span>
        <h2 className={`${styles.skeletonText}`}>—— —— —— ——</h2>
        <span className={`${styles.clanId} ${styles.skeletonText}`}>ID ——</span>
      </div>

      <div className={styles.clanStats}>
        <div>
          <span className={styles.skeletonText}>УЧАСТНИКИ</span>
          <strong className={styles.skeletonText}>——</strong>
        </div>
        <div>
          <span className={styles.skeletonText}>РЕГИОН</span>
          <strong className={styles.skeletonText}>——</strong>
        </div>
      </div>

      <span className={styles.arrow}>→</span>
    </article>
  );
}
