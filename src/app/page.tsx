"use client";

import Link from "next/link";
import styles from "./page.module.css";
import { paths } from "@/config/config";
import EmissionWidget from "@/components/ui/EmissionWidget/EmissionWidget";
import { getEmission } from "@/features/emission/api";
import { useQuery } from "@tanstack/react-query";
import RegionSelector from "@/components/ui/RegionSelector/RegionSelector";

export default function HomePage() {
  return (
    <main className={styles.page}>
      <div className={styles.backgroundGlow} />

      <section className={styles.container}>
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>STALZONE</span>

            <h1 className={styles.title}>
              STALZONE
              <br />
              <span>INFO</span>
            </h1>
          </div>

          <div className={styles.headerActions}>
            <RegionSelector />

            
          </div>
        </header>

        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <span className={styles.heroLabel}>STALZONE MINI APP</span>

            <h2>
              Всё необходимое
              <br />
              <strong>в одном месте.</strong>
            </h2>

            <p>Информация о персонажах, кланах, аукционе и состоянии Зоны.</p>
          </div>

          <div className={styles.heroDecoration}>
            <span />
            <span />
            <span />
          </div>
        </section>

        <EmissionWidget />

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.sectionNumber}>01</span>
              <h2>Разделы</h2>
            </div>

            <span className={styles.sectionHint}>Выберите раздел</span>
          </div>

          <div className={styles.grid}>
            {paths.map((section, index) => (
              <Link
                key={section.href}
                href={section.href}
                className={styles.card}
              >
                <div className={styles.cardTop}>
                  <span className={styles.cardNumber}>0{index + 1}</span>

                  <span className={styles.cardIcon}>{section.icon}</span>
                </div>

                <div className={styles.cardContent}>
                  <h3>{section.title}</h3>

                  <p>{section.description}</p>
                </div>

                <div className={styles.cardArrow}>↗</div>
              </Link>
            ))}
          </div>
        </section>

        <footer className={styles.footer}>
          <span>STALZONE</span>
          <span>v0.1.0</span>
        </footer>
      </section>
    </main>
  );
}
