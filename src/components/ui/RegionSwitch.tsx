"use client";

import { useLang, useSetLang, useT } from "@/i18n/client";
import type { Lang } from "@/i18n/lang";
import { actions, REGIONS, useApp, type Region } from "@/lib/store";
import { Segmented } from "./Segmented";

const LANG_OPTIONS: { value: Lang; label: string }[] = [
  { value: "ru", label: "RU" },
  { value: "en", label: "EN" },
];

/** Переключатель языка интерфейса RU/EN. */
export function LangSwitch({ size = "sm" }: { size?: "sm" | "md" }) {
  const t = useT();
  return <Segmented label={t.common.language} size={size} value={useLang()} onChange={useSetLang()} options={LANG_OPTIONS} />;
}

export function RegionSwitch({
  size = "sm",
  value,
  onChange,
}: {
  size?: "sm" | "md";
  value?: Region;
  onChange?: (region: Region) => void;
}) {
  const t = useT();
  const global = useApp((s) => s.region);

  return (
    <Segmented
      label={t.common.region}
      size={size}
      value={value ?? global}
      onChange={onChange ?? actions.setRegion}
      options={REGIONS.map((r) => ({ value: r.value, label: r.label }))}
    />
  );
}
