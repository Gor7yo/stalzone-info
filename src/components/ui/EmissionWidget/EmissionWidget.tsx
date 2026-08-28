"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { getEmission } from "@/features/emission/api";
import styles from "./EmissionWidget.module.css";

type Region = "ru" | "eu" | "nea" | "sea";

const DEFAULT_REGION: Region = "ru";
const REGION_STORAGE_KEY = "stalzone_region";

export default function EmissionWidget() {
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedRegion = localStorage.getItem(REGION_STORAGE_KEY);

    if (
      savedRegion === "ru" ||
      savedRegion === "eu" ||
      savedRegion === "nea" ||
      savedRegion === "sea"
    ) {
      setRegion(savedRegion);
    }

    setMounted(true);
  }, []);

  const {
    data: dataEmission,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["emission", region],
    queryFn: () => getEmission(region),
    enabled: mounted,
  });

  if (!mounted || isLoading) {
    return (
      <section className={styles.emission}>
        <div className={styles.header}>
          <div>
            <span className={styles.label}>ВЫБРОС</span>
            <strong>ПОСЛЕДНИЙ</strong>
          </div>

          <span className={styles.number}>01</span>
        </div>

        <div className={styles.state}>
          <span className={styles.loader} />
          <span>ПОЛУЧЕНИЕ ДАННЫХ...</span>
        </div>
      </section>
    );
  }

  if (error || !dataEmission) {
    return (
      <section className={styles.emission}>
        <div className={styles.header}>
          <div>
            <span className={styles.label}>ВЫБРОС</span>
            <strong>ОШИБКА</strong>
          </div>

          <span className={styles.number}>01</span>
        </div>

        <div className={styles.state}>
          <span className={styles.errorIcon}>!</span>
          <span>НЕ УДАЛОСЬ ПОЛУЧИТЬ ДАННЫЕ</span>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.emission}>
      <div className={styles.header}>
        <div>
          <span className={styles.label}>ВЫБРОС</span>
          <strong>ПОСЛЕДНИЙ</strong>
        </div>

        <span className={styles.number}>01</span>
      </div>

      <div className={styles.content}>
        <div className={styles.icon}>!</div>

        <div className={styles.info}>
          <span>НАЧАЛО</span>
          <strong>{formatTime(dataEmission.previousStart)}</strong>
        </div>

        <div className={styles.divider} />

        <div className={styles.info}>
          <span>ОКОНЧАНИЕ</span>
          <strong>{formatTime(dataEmission.previousEnd)}</strong>
        </div>
      </div>
    </section>
  );
}

function formatTime(date: string | Date) {
  return new Date(date).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}