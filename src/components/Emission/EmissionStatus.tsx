"use client";

import { emissionState, type EmissionResponse } from "@/features/emission";
import { useFormat, useT } from "@/i18n/client";
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
  const t = useT().emissionStatus;
  const { formatDuration, formatTime } = useFormat();
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
          <span className="dot" /> {t.noSignal}
        </span>
        <strong className={`display ${styles.title}`}>{t.silence}</strong>
        <span className={styles.meta}>{t.unavailable}</span>
      </div>
    );
  }

  if (state.phase === "active") {
    return (
      <div className={styles.status} data-size={size} data-phase="active" role="alert">
        <span className={styles.label}>
          <span className="dot live" /> {t.active}
        </span>
        <strong className={`display ${styles.title}`}>{t.takeCover}</strong>
        <span className={styles.meta}>
          {t.already} <b className="mono">{formatDuration(now - state.since, true)}</b> · {t.since(formatTime(state.since))}
        </span>
      </div>
    );
  }

  return (
    <div className={styles.status} data-size={size} data-phase="calm">
      <span className={styles.label}>
        <span className="dot live" /> {t.calm}
      </span>
      <strong className={`display mono ${styles.timer}`}>{formatDuration(now - state.since, true)}</strong>
      <span className={styles.meta}>
        {t.lastAt(formatTime(state.since))}
        {state.lastDuration ? ` · ${t.lasted(formatDuration(state.lastDuration))}` : ""}
      </span>
    </div>
  );
}
