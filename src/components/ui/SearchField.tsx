"use client";

import { Icon } from "../Icon";
import styles from "./ui.module.css";

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "onSubmit" | "value"> {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  action?: React.ReactNode;
  ref?: React.Ref<HTMLInputElement>;
}

export function SearchField({ value, onChange, onSubmit, action, className, ref, ...rest }: Props) {
  return (
    <form
      role="search"
      className={`${styles.search} ${className ?? ""}`}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}
    >
      <Icon name="search" size={19} className={styles.searchIcon} />
      <input
        ref={ref}
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
      />
      {value && (
        <button type="button" className={styles.searchClear} aria-label="Очистить" onClick={() => onChange("")}>
          <Icon name="close" size={16} />
        </button>
      )}
      {action}
    </form>
  );
}
