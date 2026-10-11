"use client";

import { useRef, type ComponentPropsWithoutRef, type ElementType } from "react";

/**
 * 3D-наклон за пальцем/курсором с бликом.
 * Пишет только CSS-переменные через rAF — никаких ре-рендеров React.
 */
type Props<T extends ElementType> = {
  as?: T;
  max?: number;
} & ComponentPropsWithoutRef<T>;

export function Tilt<T extends ElementType = "div">({ as, max = 10, className, children, ...rest }: Props<T>) {
  const Tag = (as ?? "div") as ElementType;
  const ref = useRef<HTMLElement>(null);
  const frame = useRef(0);

  const set = (vars: Record<string, string>, active: boolean) => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);
      if (active) el.setAttribute("data-active", "");
      else el.removeAttribute("data-active");
    });
  };

  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    set(
      {
        "--rx": `${(0.5 - py) * max}deg`,
        "--ry": `${(px - 0.5) * max}deg`,
        "--gx": `${px * 100}%`,
        "--gy": `${py * 100}%`,
        "--glare": "1",
      },
      true,
    );
  };

  const onLeave = () => set({ "--rx": "0deg", "--ry": "0deg", "--glare": "0" }, false);

  return (
    <Tag
      ref={ref}
      className={`tilt ${className ?? ""}`}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onPointerCancel={onLeave}
      onPointerUp={onLeave}
      {...rest}
    >
      {children}
    </Tag>
  );
}
