"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./page.module.css";
import { useQuery } from "@tanstack/react-query";
import { getAuctionLots } from "@/features/auction/api";
import { useStore } from "@/components/MobxProvider";
import { AuctionLots } from "@/features/auction/types";
import Link from "next/link";
import { BackUp } from "@/components/ui/BackUp/BackUp";
import { useCanScroll } from "@/hooks/useCanScroll";

interface LotsProps {
  dataAuction: AuctionLots[];
  isLoading: boolean;
  error: Error | null;
  page: number;
}

export default function AuctionPage() {
  const { globalStore } = useStore();

  const [itemName, setItemName] = useState(globalStore.auctionLastItemName);
  const [currentPage, setCurrentPage] = useState(1);
  const [isCanScroll, setIsCanScroll] = useState(false);
  const [isAdditional, setIsAdditional] = useState(false);
  const [totalPages, setTotalPages] = useState<number[] | null | undefined>(
    null,
  );
  const renderCount = useRef(0);
  const { canScroll } = useCanScroll();

  const {
    data: dataAuctionLots,
    isLoading: isLoadingAuctionLots,
    error: errorAuctionLots,
    refetch: refetchAuctionLots,
  } = useQuery({
    queryKey: ["auctionLots"],
    enabled: false,
    queryFn: async () =>
      await getAuctionLots(globalStore.region, itemName, {
        offset: String((currentPage - 1) * 20),
        additional: String(isAdditional),
        limit: "20",
      }),
    retry: false,
  });

  const handleSearchLots = async () => {
    globalStore.setAuctionItemName(itemName);
    const { data } = await refetchAuctionLots();

    if (!data?.total) {
      return;
    }

    const totalPagesArray: number[] = Array.from(
      { length: Math.floor(data?.total / 20) },
      (_, index) => index + 1,
    );

    setTotalPages(totalPagesArray);
  };

  const handleSetCurrentPage = (page: number) => {
    setCurrentPage(page);
  };

  const handleScroll = (e: Event) => {
    canScroll(e, isCanScroll, setIsCanScroll);
  };

  useEffect(() => {
    if (itemName) {
      handleSearchLots();
    }
  }, []);

  useEffect(() => {
    renderCount.current += 1;

    if (renderCount.current <= 2) {
      return;
    }

    refetchAuctionLots();
  }, [currentPage]);

  if (typeof window !== "undefined") {
    window.addEventListener("scroll", handleScroll);
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <Link href="/" className={styles.back} id="backMenu">
            ← НАЗАД
          </Link>

          <span className={styles.eyebrow}>STALZONE / MARKET</span>

          <div className={styles.headerRow}>
            <div>
              <span className={styles.number}>01</span>
              <h1>Аукцион</h1>
            </div>

            <div className={styles.live}>
              <span />
              LIVE
            </div>
          </div>

          <p className={styles.description}>
            Актуальные лоты и история торгов на рынке Зоны.
          </p>
        </header>

        <section className={styles.tabs}>
          <h3>Лоты</h3>
        </section>

        <section className={styles.filters}>
          <div className={styles.search}>
            <span>⌕</span>
            <input
              placeholder="Название предмета..."
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
            />
          </div>

          <button
            className={styles.actionButton}
            onClick={handleSearchLots}
            disabled={isLoadingAuctionLots}
          >
            Поиск
          </button>

          <button className={styles.filterButton}>
            Фильтры
            <span>+</span>
          </button>
        </section>

        <section className={styles.meta}>
          <span>"АКТИВНЫЕ ЛОТЫ"</span>
          <span>REGION: {globalStore.region.toUpperCase()}</span>
        </section>

        <Lots
          dataAuction={dataAuctionLots ? [dataAuctionLots] : []}
          isLoading={isLoadingAuctionLots}
          error={errorAuctionLots}
          page={currentPage}
        />

        {isCanScroll && <BackUp />}
        <footer className={styles.footer}>
          <span>STALZONE MARKET</span>
          {totalPages && totalPages.length > 1 && (
            <div className={styles.paginationPages}>
              {totalPages?.map((page, index) => (
                <span
                  className={`${currentPage === page && styles.isActivePage}`}
                  key={index}
                  onClick={() => handleSetCurrentPage(page)}
                >
                  {page}
                </span>
              ))}
            </div>
          )}
          <span>01</span>
        </footer>
      </div>
    </main>
  );
}

function Lots({ dataAuction, isLoading, error, page }: LotsProps) {
  if (isLoading) {
    return (
      <div className={styles.state}>
        <div className={styles.spinner} />
        <span>Загрузка лотов...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.stateError}>
        <span className={styles.errorIcon}>!</span>
        <div>
          <strong>Не удалось загрузить лоты</strong>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {dataAuction.length > 0 ? (
        dataAuction.map((item) =>
          item.lots.map((lot) => (
            <AuctionCard
              key={lot.startTime.toString()}
              name={lot.itemId}
              category={"Категория"}
              price={lot.buyoutPrice ?? "-"}
              quantity={lot.amount}
              time={lot.endTime.toString()}
              startPrice={lot.startPrice ?? "-"}
            />
          )),
        )
      ) : (
        <div className={styles.state}>
          <span>Пустовато тут...</span>
        </div>
      )}
    </div>
  );
}

function AuctionCard({
  name,
  category,
  price,
  quantity,
  startPrice,
  time,
}: {
  name: string;
  category: string;
  price: number;
  quantity: number;
  startPrice: number;
  time: string;
}) {
  const [timer, setTimer] = useState<string>("");
  const { globalStore } = useStore();

  const dateCreate = (timer: string, interval?: NodeJS.Timeout) => {
    const target = Date.parse(time);
    const now = Date.now();
    const difference = target - now;

    if (difference <= 0) {
      clearInterval(interval);
      return;
    }

    const days: number = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours: number = Math.floor(
      (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
    );
    const minutes: number = Math.floor(
      (difference % (1000 * 60 * 60)) / (1000 * 60),
    );
    const seconds: number = Math.floor((difference % (1000 * 60)) / 1000);

    timer = `Осталось: ${days}д ${hours}ч ${minutes}м ${seconds}с`;
    setTimer(timer);
  };

  const endTime = () => {
    let timer: string = "";
    const intervalItem = setInterval(() => {
      dateCreate(time, intervalItem);
    }, 1000);
  };

  useEffect(() => {
    let timer: string = "";
    dateCreate(timer);
    endTime();
  }, []);

  return (
    <article className={styles.card}>
      <div className={styles.cardIcon}>◆</div>

      <div className={styles.cardMain}>
        <span className={styles.category}>{category}</span>

        <h2>{name}</h2>

        <div className={styles.details}>
          <span>
            Кол-во <strong>{quantity}</strong>
          </span>

          <span>
            Осталось <strong>{timer}</strong>
          </span>
        </div>
      </div>

      <div className={styles.price}>
        <div className={styles.endPrice}>
          <span>ЦЕНА</span>
          <strong>{price}</strong>
          <small>₽</small>
        </div>

        <div className={styles.startPrice}>
          <span>ЦЕНА СТАВКИ</span>
          <strong>{startPrice}</strong>
          <small>₽</small>
        </div>
      </div>

      <Link
        href={`auction/${name}`}
        className={styles.openButton}
        onClick={() =>
          globalStore.setAuctionItem({
            name,
            category,
            price,
            quantity,
            startPrice,
            time,
          })
        }
      >
        ↗
      </Link>
    </article>
  );
}

function History() {
  return <div className={styles.list}></div>;
}

function HistoryCard({
  name,
  price,
  date,
}: {
  name: string;
  price: string;
  date: string;
}) {
  return (
    <article className={styles.historyCard}>
      <div>
        <span className={styles.category}>ПРОДАЖА</span>
        <h2>{name}</h2>
        <p>{date}</p>
      </div>

      <div className={styles.historyPrice}>
        <span>ЦЕНА</span>
        <strong>{price} ₽</strong>
      </div>
    </article>
  );
}
