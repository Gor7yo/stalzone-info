"use client";

import { emissionState, type EmissionResponse } from "@/features/emission";
import { formatDuration, formatTime } from "@/lib/format";
import { useNow } from "@/lib/useNow";
import styles from "./EmissionStatus.module.css";

/** Текстовый статус выброса с живым таймером. */
export function EmissionStatus({
  data,
  isLoading,
  isError,
  size = "lg",
}: {
  data?: EmissionResponse;
  isLoading?: boolean;
  isError?: boolean;
  size?: "lg" | "sm";
}) {
  const now = useNow(1000);
  const state = emissionState(data);

  if (isLoading || !now) {
    return (
      <div className={styles.status} data-size={size}>
        <span className="skeleton" style={{ height: 12, width: 90 }} />
        <span className="skeleton" style={{ height: size === "lg" ? 34 : 22, width: "70%", marginTop: 10 }} />
        <span className="skeleton" style={{ height: 12, width: "50%", marginTop: 10 }} />
      </div>
    );
  }

  if (isError || state.phase === "unknown") {
    return (
      <div className={styles.status} data-size={size} data-phase="unknown">
        <span className={styles.label}>
          <span className="dot" /> нет сигнала
        </span>
        <strong className={`display ${styles.title}`}>Тишина</strong>
        <span className={styles.meta}>Данные о выбросах недоступны</span>
      </div>
    );
  }

  if (state.phase === "active") {
    return (
      <div className={styles.status} data-size={size} data-phase="active" role="alert">
        <span className={styles.label}>
          <span className="dot live" /> выброс идёт
        </span>
        <strong className={`display ${styles.title}`}>В укрытие!</strong>
        <span className={styles.meta}>
          уже <b className="mono">{formatDuration(now - state.since, true)}</b> · с {formatTime(state.since)}
        </span>
      </div>
    );
  }

  return (
    <div className={styles.status} data-size={size} data-phase="calm">
      <span className={styles.label}>
        <span className="dot live" /> зона спокойна
      </span>
      <strong className={`display mono ${styles.timer}`}>{formatDuration(now - state.since, true)}</strong>
      <span className={styles.meta}>
        без выброса · последний в {formatTime(state.since)}
        {state.lastDuration ? ` · длился ${formatDuration(state.lastDuration)}` : ""}
      </span>
    </div>
  );
}
