import styles from "./ui.module.css";

export function PageHeader({
  eyebrow,
  title,
  children,
  aside,
}: {
  eyebrow: string;
  title: React.ReactNode;
  children?: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <header className={styles.header}>
      <div className={styles.headerTop}>
        <span className={styles.eyebrow}>
          <span className="dot" />
          {eyebrow}
        </span>
        {aside}
      </div>
      <h1 className={`display ${styles.title}`}>{title}</h1>
      {children && <p className={styles.lead}>{children}</p>}
    </header>
  );
}

export function StatTile({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "up" | "down" | "acc";
}) {
  return (
    <div className={styles.stat} data-tone={tone}>
      <span className={styles.statLabel}>{label}</span>
      <strong className={`mono ${styles.statValue}`}>{value}</strong>
      {hint && <span className={styles.statHint}>{hint}</span>}
    </div>
  );
}
