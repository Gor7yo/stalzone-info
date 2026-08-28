import styles from './loading.module.css';

export default function Loading() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <div className={styles.back} />

        <header className={styles.header}>
          <div className={styles.eyebrow} />

          <div className={styles.titleRow}>
            <div>
              <div className={styles.number} />
              <div className={styles.title} />
            </div>

            <div className={styles.live} />
          </div>

          <div className={styles.description} />
        </header>

        <div className={styles.tabs}>
          <div />
          <div />
        </div>

        <div className={styles.filters}>
          <div className={styles.search} />
          <div className={styles.filterButton} />
        </div>

        <div className={styles.meta}>
          <div />
          <div />
        </div>

        <div className={styles.list}>
          {Array.from({ length: 5 }).map((_, index) => (
            <div className={styles.card} key={index}>
              <div className={styles.icon} />

              <div className={styles.cardContent}>
                <div className={styles.category} />
                <div className={styles.cardTitle} />

                <div className={styles.details}>
                  <span />
                  <span />
                </div>
              </div>

              <div className={styles.price}>
                <span />
                <strong />
              </div>

              <div className={styles.arrow} />
            </div>
          ))}
        </div>

        <footer className={styles.footer}>
          <span />
          <span />
        </footer>
      </div>
    </main>
  );
}