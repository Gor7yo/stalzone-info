export type Region = "ru" | "eu" | "na" | "sea";

export const REGIONS: { value: Region; label: string; name: string }[] = [
  { value: "ru", label: "RU", name: "Россия" },
  { value: "eu", label: "EU", name: "Европа" },
  { value: "na", label: "NA", name: "Северная Америка" },
  { value: "sea", label: "SEA", name: "Юго-Восточная Азия" },
];

export const isRegion = (value: unknown): value is Region => REGIONS.some((r) => r.value === value);
