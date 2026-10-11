"use client";

import { Anomaly } from "@/components/Anomaly/Anomaly";
import { EmissionStatus } from "@/components/Emission/EmissionStatus";
import { PageHeader } from "@/components/ui/PageHeader";
import { emissionState, useEmission } from "@/features/emission";
import { actions, REGIONS, useApp, type Region } from "@/lib/store";
import { haptic } from "@/lib/telegram";
import styles from "./emission.module.css";

export default function EmissionPage() {
  const region = useApp((s) => s.region);
  const current = useEmission(region);
  const phase = emissionState(current.data).phase;

  return (
    <main className="page">
      <PageHeader eyebrow="Радар" title="Выбросы">
        Состояние Зоны во всех регионах. Обновляется автоматически, во время выброса — каждые 10 секунд.
      </PageHeader>

      <section className={`glass ${styles.radar}`} data-phase={phase}>
        <div className={styles.scope}>
          <span className={styles.rings} aria-hidden />
          <span className={styles.sweep} aria-hidden />
          <Anomaly className={styles.orb} mode={phase === "active" ? "active" : current.isError ? "idle" : "calm"} onTap={() => haptic.tap("heavy")} />
        </div>
        <div className={styles.radarText}>
          <span className="pill">{REGIONS.find((r) => r.value === region)?.name}</span>
          <EmissionStatus data={current.data} isLoading={current.isLoading} isError={current.isError} />
        </div>
      </section>

      <section className={`${styles.grid} stagger`}>
        {REGIONS.map((r) => (
          <RegionCard key={r.value} region={r.value} label={r.label} active={r.value === region} />
        ))}
      </section>
    </main>
  );
}

function RegionCard({ region, label, active }: { region: Region; label: string; active: boolean }) {
  const { data, isLoading, isError } = useEmission(region);
  const phase = emissionState(data).phase;

  return (
    <button
      type="button"
      className={styles.card}
      data-phase={phase}
      aria-pressed={active}
      onClick={() => {
        haptic.select();
        actions.setRegion(region);
      }}
    >
      <span className={`display ${styles.cardRegion}`}>{label}</span>
      <EmissionStatus data={data} isLoading={isLoading} isError={isError} size="sm" />
    </button>
  );
}
