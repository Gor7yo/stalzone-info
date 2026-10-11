"use client";

import { actions, REGIONS, useApp, type Region } from "@/lib/store";
import { Segmented } from "./Segmented";

export function RegionSwitch({
  size = "sm",
  value,
  onChange,
}: {
  size?: "sm" | "md";
  value?: Region;
  onChange?: (region: Region) => void;
}) {
  const global = useApp((s) => s.region);

  return (
    <Segmented
      label="Регион"
      size={size}
      value={value ?? global}
      onChange={onChange ?? actions.setRegion}
      options={REGIONS.map((r) => ({ value: r.value, label: r.label }))}
    />
  );
}
