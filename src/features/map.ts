/**
 * Карта ПДА: локации, вырезанные из карты игры (scripts/map: .ol → PNG → плитки).
 * Плитки 256×256 WebP в public/map/tiles/<id>/{z}/{y}/{x}.webp, раскладка google
 * (картинка в левом верхнем углу), на последнем зуме 1 px = 1 блок.
 * origin — мировые координаты (блоки) левого верхнего угла картинки: по ним показываем X/Z курсора.
 */
export interface MapLocation {
  id: string;
  name: string;
  nameEn: string;
  /** что внутри (подрайоны) */
  hint?: string;
  hintEn?: string;
  width: number;
  height: number;
  maxZoom: number;
  origin: { x: number; z: number };
}

/** Где лежат плитки: свой сервер или CDN — через NEXT_PUBLIC_MAP_TILES, по умолчанию public/. */
export const MAP_TILES = process.env.NEXT_PUBLIC_MAP_TILES || "/map/tiles";

export const MAP_LOCATIONS: MapLocation[] = [
  {
    id: "zone",
    name: "Зона",
    nameEn: "Zone",
    hint: "Свалка, Агропром, Бар, Тёмная долина, Янтарь, Армейские склады",
    hintEn: "Garbage, Agroprom, Bar, Dark Valley, Yantar, Army Warehouses",
    width: 3610,
    height: 4664,
    maxZoom: 5,
    origin: { x: -6144, z: -61 },
  },
  {
    id: "north",
    name: "Север",
    nameEn: "North",
    hint: "Шахты, Кузница, Приток",
    hintEn: "Mines, Forge, Inflow",
    width: 5140,
    height: 4137,
    maxZoom: 5,
    origin: { x: -11284, z: -10 },
  },
  {
    id: "zaton",
    name: "Затон",
    nameEn: "Zaton",
    hint: "Затон, станция Янов",
    hintEn: "Zaton, Yanov station",
    width: 3610,
    height: 1500,
    maxZoom: 4,
    origin: { x: -6144, z: -1562 },
  },
  { id: "loc-09", name: "Локация 9", nameEn: "Location 9", width: 2821, height: 3476, maxZoom: 4, origin: { x: 6369, z: -1705 } },
  { id: "loc-10", name: "Локация 10", nameEn: "Location 10", width: 2217, height: 2294, maxZoom: 4, origin: { x: 3999, z: 2150 } },
  { id: "loc-06", name: "Локация 6", nameEn: "Location 6", width: 1756, height: 2324, maxZoom: 4, origin: { x: -1633, z: 1992 } },
  {
    id: "maze",
    name: "Лабиринт",
    nameEn: "Maze",
    width: 1172,
    height: 1085,
    maxZoom: 3,
    origin: { x: -5, z: 717 },
  },
  {
    id: "berdovka",
    name: "Бердовка",
    nameEn: "Berdovka",
    hint: "Турнирная карта",
    hintEn: "Tournament map",
    width: 1152,
    height: 1009,
    maxZoom: 3,
    origin: { x: -1300, z: -660 },
  },
  {
    id: "hvoiny",
    name: "Хвойный",
    nameEn: "Hvoiny",
    hint: "Турнирная карта",
    hintEn: "Tournament map",
    width: 1152,
    height: 1091,
    maxZoom: 3,
    origin: { x: 3287, z: -2478 },
  },
  { id: "loc-08", name: "Локация 8", nameEn: "Location 8", width: 932, height: 932, maxZoom: 2, origin: { x: 4695, z: -2335 } },
];

export const mapLocation = (id: string | null | undefined) => MAP_LOCATIONS.find((l) => l.id === id);
