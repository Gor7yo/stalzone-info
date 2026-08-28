import { paths } from "@/config/config";
import Link from "next/link";
import styles from "./BurgerMenu.module.css";

export const BurgerMenu = () => {
  return (
    <div className={styles.BurgerMenu}>
      {paths.map((path) => (
        <Link className={styles.MenuLink} href={path.path} key={path.path}>
          {path.name}
        </Link>
      ))}
    </div>
  );
};
