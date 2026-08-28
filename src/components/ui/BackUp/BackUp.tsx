import styles from "./BackUp.module.css";

export const BackUp = () => {
  const handleGoToUp = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  return (
    <button className={styles.backUp} onClick={handleGoToUp}>
      ↑
    </button>
  );
};
