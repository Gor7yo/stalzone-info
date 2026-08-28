interface Paths {
  href: string;
  title: string;
  description: string;
  icon: string;
}

export const paths: Paths[] = [
  {
    href: "/auction",
    title: "Аукцион",
    description: "Лоты и история торгов",
    icon: "◆",
  },
  {
    href: "/character",
    title: "Персонаж",
    description: "Профиль и статистика",
    icon: "◉",
  },
  {
    href: "/clans",
    title: "Кланы",
    description: "Поиск и информация о кланах",
    icon: "◇",
  },
];
