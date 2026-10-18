import { Icon, type IconName } from "@/components/Icon";
import { Tilt } from "@/components/Tilt/Tilt";
import styles from "./DocPage.module.css";

/**
 * Страница-документ в стиле главной: шапка, плитки разделов с 3D-наклоном,
 * разделы-карточки с цветной иконкой. Гайд, политика конфиденциальности, правила.
 * Серверный компонент: весь текст сразу в HTML (важно для поисковиков).
 */

export { styles as docStyles };

export interface DocSection {
  id: string;
  icon: IconName;
  /** цвет раздела: иконка, полоса, свечение */
  accent: string;
  title: string;
  /** подпись на плитке */
  hint: string;
  body: React.ReactNode;
}

/** Нумерованные шаги — кружки с цифрами. */
export function Steps({ children }: { children: React.ReactNode[] }) {
  return (
    <ol className={styles.steps}>
      {children.map((c, i) => (
        <li key={i}>
          <span className={styles.stepNum} aria-hidden>
            {i + 1}
          </span>
          <span>{c}</span>
        </li>
      ))}
    </ol>
  );
}

/** Таблица: первая строка — заголовки. */
export function DocTable({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const num = (i: number) => String(i + 1).padStart(2, "0");

export function DocPage({
  eyebrow,
  title,
  lead,
  meta,
  sections,
  numberLabel = "Раздел",
  navLabel,
  toTopLabel = "К разделам",
  beforeSections,
  final,
}: {
  eyebrow: string;
  title: React.ReactNode;
  lead: React.ReactNode;
  /** метки в шапке: «⏱ 5 минут», дата редакции */
  meta?: React.ReactNode[];
  sections: DocSection[];
  /** подпись над номером в карточке: «Шаг», «Раздел» */
  numberLabel?: string;
  navLabel: string;
  /** ссылка «наверх к плиткам» в конце каждого раздела */
  toTopLabel?: string;
  /** между плитками и разделами (видео) */
  beforeSections?: React.ReactNode;
  /** последняя карточка: «Остались вопросы?» */
  final?: { title: string; body: React.ReactNode };
}) {
  return (
    <main className={`page ${styles.page}`}>
      <section className={`glass ${styles.hero}`}>
        <div className={styles.heroText}>
          <span className={styles.eyebrow}>
            <span className="dot" /> {eyebrow}
          </span>
          <h1 className="display">{title}</h1>
          <p>{lead}</p>
          {meta && meta.length > 0 && (
            <span className={styles.meta}>
              {meta.map((m, i) => (
                <span key={i}>{m}</span>
              ))}
            </span>
          )}
        </div>
      </section>

      <nav id="top" className={`${styles.bento} stagger`} aria-label={navLabel}>
        {sections.map((s, i) => (
          <Tilt
            key={s.id}
            as="a"
            href={`#${s.id}`}
            className={`glass ${styles.tile}`}
            data-wide={i === 0 || undefined}
            style={{ "--tile": s.accent } as React.CSSProperties}
          >
            <span className={`${styles.tileIcon} depth`}>
              <Icon name={s.icon} size={22} />
            </span>
            <span className={styles.tileBody}>
              <span className={styles.tileNum}>{num(i)}</span>
              <strong>{s.title}</strong>
              <span>{s.hint}</span>
            </span>
          </Tilt>
        ))}
      </nav>

      {beforeSections}

      <div className={styles.sections}>
        {sections.map((s, i) => (
          <section key={s.id} id={s.id} className={`glass ${styles.section}`} style={{ "--tile": s.accent } as React.CSSProperties}>
            <header className={styles.sectionHead}>
              <span className={styles.sectionIcon}>
                <Icon name={s.icon} size={22} />
              </span>
              <span>
                <span className={styles.tileNum}>
                  {numberLabel} {num(i)}
                </span>
                <h2>{s.title}</h2>
              </span>
            </header>
            <div className={styles.body}>{s.body}</div>
            <a href="#top" className={styles.toTop}>
              <Icon name="up" size={14} /> {toTopLabel}
            </a>
          </section>
        ))}

        {final && (
          <section className={`glass ${styles.section} ${styles.help}`} style={{ "--tile": "var(--acc)" } as React.CSSProperties}>
            <header className={styles.sectionHead}>
              <span className={styles.sectionIcon}>
                <Icon name="help" size={22} />
              </span>
              <h2>{final.title}</h2>
            </header>
            <div className={styles.body}>{final.body}</div>
          </section>
        )}
      </div>
    </main>
  );
}
