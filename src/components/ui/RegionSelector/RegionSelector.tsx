"use client";

import { useEffect, useState } from "react";
import styles from "./RegionSelector.module.css";

type Region = "ru" | "eu" | "nea" | "sea";

const REGIONS = [
  { value: "ru", label: "RU", name: "Россия" },
  { value: "eu", label: "EU", name: "Европа" },
  { value: "nea", label: "NEA", name: "Северо-Восточная Азия" },
  { value: "sea", label: "SEA", name: "Юго-Восточная Азия" },
] as const;

const STORAGE_KEY = "stalzone_region";

export default function RegionSelector() {
  const [open, setOpen] = useState(false);
  const [region, setRegion] = useState<Region>("ru");

  // Получаем сохранённый регион после hydration
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (isRegion(saved)) {
      setRegion(saved);
    }
  }, []);

  const current =
    REGIONS.find((item) => item.value === region) ?? REGIONS[0];

  const selectRegion = (region: Region) => {
    setRegion(region);

    // сохраняем
    localStorage.setItem(STORAGE_KEY, region);

    setOpen(false);
  };

  return (
    <div className={styles.wrapper}>
      <button
        className={`${styles.trigger} ${open ? styles.active : ""}`}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.indicator} />

        <span>{current.label}</span>

        <span className={styles.arrow}>⌄</span>
      </button>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            РЕГИОН
          </div>

          {REGIONS.map((item) => (
            <button
              key={item.value}
              className={`${styles.option} ${
                item.value === region ? styles.selected : ""
              }`}
              onClick={() => selectRegion(item.value)}
            >
              <span className={styles.optionLabel}>
                {item.label}
              </span>

              <span className={styles.optionName}>
                {item.name}
              </span>

              {item.value === region && (
                <span className={styles.check}>●</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function isRegion(value: string | null): value is Region {
  return (
    value === "ru" ||
    value === "eu" ||
    value === "nea" ||
    value === "sea"
  );
}