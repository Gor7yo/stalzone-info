"use client";

import Link from "next/link";
import styles from "./page.module.css";
import { useState } from "react";
import { useCanScroll } from "@/hooks/useCanScroll";
import { BackUp } from "@/components/ui/BackUp/BackUp";
import { useQuery } from "@tanstack/react-query";
import { getCharacter } from "@/features/character/api";
import { useStore } from "@/components/MobxProvider";

export default function CharacterPage() {
  const { globalStore } = useStore();

  const [isCanScroll, setIsCanScroll] = useState(false);
  const [characterName, setCharacterName] = useState(globalStore.characterName);

  const { canScroll } = useCanScroll();

  const handleScroll = (e: Event) => {
    canScroll(e, isCanScroll, setIsCanScroll);
  };

  const handleSearchCharacter = () => {
    refetchCharacter();
  };

  const {
    data: dataCharacter,
    isLoading: isLoadingCharacter,
    error: errorCharacter,
    refetch: refetchCharacter,
  } = useQuery({
    queryKey: ["character"],
    enabled: false,
    queryFn: async () => await getCharacter(globalStore.region, characterName),
    retry: false,
  });

  if (typeof window !== "undefined") {
    window.addEventListener("scroll", handleScroll);
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link href="/" className={styles.back}>
          ← НАЗАД
        </Link>

        <header className={styles.header}>
          <span className={styles.eyebrow}>STALZONE / CHARACTER</span>

          <div className={styles.titleRow}>
            <div>
              <span className={styles.number}>02</span>
              <h1>Персонаж</h1>
            </div>

            <div className={styles.status}>
              <span />
              ONLINE
            </div>
          </div>

          <p className={styles.description}>
            Информация о персонаже, его прогрессе и снаряжении.
          </p>
        </header>

        <section className={styles.searchSection}>
          <div className={styles.search}>
            <span>⌕</span>
            <input
              placeholder="Введите имя персонажа..."
              onChange={(e) => setCharacterName(e.target.value)}
            />
          </div>

          <button className={styles.searchButton} onClick={handleSearchCharacter}>НАЙТИ</button>
        </section>

        {dataCharacter ? (
          <>
            <section className={styles.profile}>
              <div className={styles.avatar}>
                <span>?</span>
              </div>

              <div className={styles.profileInfo}>
                <span className={styles.label}>ПЕРСОНАЖ</span>
                <h2>{dataCharacter?.username}</h2>

                <div className={styles.profileMeta}>
                  <span>{globalStore.region}</span>
                </div>
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <span>ПРИКРЕПЛЕННЫЕ ДОСТИЖЕНИЯ</span>
                <span>01</span>
              </div>

              <div className={styles.stats}>
                {dataCharacter.displayedAchievements?.length ? (
                  dataCharacter.displayedAchievements.map((achievement) => (
                    <Stat label={achievement} key={achievement} value="" />
                  ))
                ) : (
                  <span className={styles.statsSpan}>
                    Прикрепленных достижений нет
                  </span>
                )}
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <span>СНАРЯЖЕНИЕ</span>
                <span>02</span>
              </div>

              <div className={styles.equipment}>
                <EquipmentSlot label="ОРУЖИЕ" value="Неизвестно" />
                <EquipmentSlot label="БРОНЯ" value="Неизвестно" />
                <EquipmentSlot label="ШЛЕМ" value="Неизвестно" />
                <EquipmentSlot label="РЮКЗАК" value="Неизвестно" />
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <span>АКТИВНОСТЬ</span>
                <span>03</span>
              </div>

              <div className={styles.activity}>
                <div className={styles.activityRow}>
                  <span>ПОСЛЕДНЯЯ АКТИВНОСТЬ</span>
                  <strong>
                    <strong>
                      {dataCharacter.lastLogin?.toString() ?? "-"}
                    </strong>
                  </strong>
                </div>
              </div>
            </section>
          </>
        ) : (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>?</span>

            <div>
              <strong>Персонаж не найден</strong>
              <p>Введите имя персонажа для поиска</p>
            </div>
          </div>
        )}

        <footer className={styles.footer}>
          <span>STALZONE CHARACTER</span>
          <span>02</span>
        </footer>
        {isCanScroll && <BackUp />}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.stat}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EquipmentSlot({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.equipmentSlot}>
      <div className={styles.itemIcon}>◆</div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}
