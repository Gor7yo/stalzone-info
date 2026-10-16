"use client";

import { useT } from "@/i18n/client";
import { Icon, type IconName } from "../Icon";
import styles from "./ui.module.css";

export function EmptyState({
  icon = "search",
  title,
  text,
  children,
  tone,
}: {
  icon?: IconName;
  title: string;
  text?: string;
  children?: React.ReactNode;
  tone?: "error";
}) {
  return (
    <div className={styles.empty} data-tone={tone}>
      <span className={styles.emptyIcon}>
        <Icon name={icon} size={26} />
      </span>
      <strong>{title}</strong>
      {text && <p>{text}</p>}
      {children}
    </div>
  );
}

export function ErrorState({ onRetry, text }: { onRetry?: () => void; text?: string }) {
  const t = useT();
  return (
    <EmptyState icon="bolt" tone="error" title={t.common.errorTitle} text={text ?? t.common.errorText}>
      {onRetry && (
        <button type="button" className="btn" onClick={onRetry}>
          {t.common.retry}
        </button>
      )}
    </EmptyState>
  );
}

export function RowSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="stack" aria-busy>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="list-row" style={{ opacity: 1 - i * 0.12 }}>
          <span className="skeleton" style={{ width: 48, height: 48, borderRadius: 14 }} />
          <span style={{ flex: 1, display: "grid", gap: 8 }}>
            <span className="skeleton" style={{ height: 14, width: "60%" }} />
            <span className="skeleton" style={{ height: 11, width: "35%" }} />
          </span>
        </div>
      ))}
    </div>
  );
}
