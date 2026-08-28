import { BurgerMenu } from "../BurgerMenu/BurgerMenu";
import styles from "./Header.module.css";

export const Header = () => {
  const isMobile: boolean = true;

  return (
    <header>
      <article className={styles.Logo}>STALZONE INFO</article>

      {isMobile && (
        <article className={styles.BurgerMenu}>
          <BurgerMenu />
        </article>
      )}
    </header>
  );
};
