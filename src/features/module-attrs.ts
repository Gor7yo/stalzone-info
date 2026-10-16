import type { ModuleAttrInfo } from "./modules";

/**
 * Атрибуты оружейного модуля: id из EXBO (additional.attributes) → название, место и эффекты.
 * pre — приставка (небольшой баф), suf — суффикс (дебаф), key — ключевая характеристика (уникальный баф).
 * Эффект линейно зависит от процента качества атрибута: min при 0%, max при 190% (см. modules.ts).
 * Данных нет в API EXBO — справочник из игры (собран Stalzone Hub, сверен с игрой по модулю
 * «Устойчивый Нестабильный «Снайпер»»). Знак трёх суффиксов замедления исправлен по SC Tools.
 * text / textEn — особый эффект, {bonus} подставляется числом. nameEn / labelEn — для интерфейса на en.
 */
export const MODULE_ATTRS: Record<string, ModuleAttrInfo> = {
  aim_switch_time_pre: {
    name: "Бдительный",
    nameEn: "Vigilant",
    slot: "pre",
    effects: [{ label: "Скорость прицеливания", labelEn: "Aim speed", good: true, min: 3.638, max: 14.544 }],
  },
  hip_spread_pre: {
    name: "Устойчивый",
    nameEn: "Steady",
    slot: "pre",
    effects: [{ label: "Разброс от бедра", labelEn: "Hip-fire spread", good: true, min: -2.727, max: -10.906 }],
  },
  spread_pre: {
    name: "Суммирующий",
    nameEn: "Summing",
    slot: "pre",
    effects: [{ label: "Разброс", labelEn: "Spread", good: true, min: -2.727, max: -10.906 }],
  },
  recoil_pre: {
    name: "Вертикальный",
    nameEn: "Vertical",
    slot: "pre",
    effects: [{ label: "Отдача", labelEn: "Recoil", good: true, min: -3.272, max: -13.087 }],
  },
  horizontal_recoil_pre: {
    name: "Горизонтальный",
    nameEn: "Horizontal",
    slot: "pre",
    effects: [{ label: "Гориз. отдача", labelEn: "Horizontal recoil", good: true, min: -3.272, max: -13.087 }],
  },
  recoil_gain_pre: {
    name: "Плавный",
    nameEn: "Smooth",
    slot: "pre",
    effects: [{ label: "Нарастание отдачи", labelEn: "Recoil buildup", good: true, min: -4.362, max: -17.45 }],
  },
  draw_time_pre: {
    name: "Мгновенный",
    nameEn: "Instant",
    slot: "pre",
    effects: [{ label: "Скорость доставания", labelEn: "Draw speed", good: true, min: 3.636, max: 14.548 }],
  },
  aiming_speed_modifier_pre: {
    name: "Фокусный",
    nameEn: "Focal",
    slot: "pre",
    effects: [{ label: "Скорость в прицеливании", labelEn: "Speed during aiming", good: true, min: 1.45, max: 5.817 }],
  },
  equipped_speed_modifier_pre: {
    name: "Подвижный",
    nameEn: "Mobile",
    slot: "pre",
    effects: [{ label: "Скорость", labelEn: "Speed", good: true, min: 0.58, max: 2.326 }],
  },
  ergonomics_pre: {
    name: "Комфортный",
    nameEn: "Comfortable",
    slot: "pre",
    effects: [{ label: "Эргономика оружия", labelEn: "Weapon Ergonomics", good: true, min: 4.362, max: 17.45 }],
  },
  shoot_factor_decrement_pre: {
    name: "Стабильный",
    nameEn: "Stable",
    slot: "pre",
    effects: [{ label: "Стабилизация", labelEn: "Stabilization", good: true, min: 5.815, max: 23.266 }],
  },
  wiggle_pre: {
    name: "Гармоничный",
    nameEn: "Harmonious",
    slot: "pre",
    effects: [{ label: "Покачивание", labelEn: "Sway", good: true, min: -5.453, max: -21.812 }],
  },
  aim_switch_time_suf: {
    name: "Дрожащий",
    nameEn: "Shivering",
    slot: "suf",
    effects: [{ label: "Скорость прицеливания", labelEn: "Aim speed", good: false, min: -14.54, max: -3.63 }],
  },
  hip_spread_suf: {
    name: "Неустойчивый",
    nameEn: "Unsteady",
    slot: "suf",
    effects: [{ label: "Разброс от бедра", labelEn: "Hip-fire spread", good: false, min: 10.906, max: 2.727 }],
  },
  spread_suf: {
    name: "Отрицающий",
    nameEn: "Denying",
    slot: "suf",
    effects: [{ label: "Разброс", labelEn: "Spread", good: false, min: 10.906, max: 2.727 }],
  },
  recoil_suf: {
    name: "Уходящий",
    nameEn: "Receding",
    slot: "suf",
    effects: [{ label: "Отдача", labelEn: "Recoil", good: false, min: 13.087, max: 3.272 }],
  },
  horizontal_recoil_suf: {
    name: "Сдвигающий",
    nameEn: "Shifting",
    slot: "suf",
    effects: [{ label: "Гориз. отдача", labelEn: "Horizontal recoil", good: false, min: 13.087, max: 3.272 }],
  },
  recoil_gain_suf: {
    name: "Резкий",
    nameEn: "Sharp",
    slot: "suf",
    effects: [{ label: "Нарастание отдачи", labelEn: "Recoil buildup", good: false, min: 17.45, max: 4.362 }],
  },
  draw_time_suf: {
    name: "Инертный",
    nameEn: "Inert",
    slot: "suf",
    effects: [{ label: "Скорость доставания", labelEn: "Draw speed", good: false, min: -14.548, max: -3.636 }],
  },
  aiming_speed_modifier_suf: {
    name: "Медлительный",
    nameEn: "Slow",
    slot: "suf",
    effects: [{ label: "Скорость в прицеливании", labelEn: "Speed during aiming", good: false, min: -5.817, max: -1.45 }],
  },
  equipped_speed_modifier_suf: {
    name: "Заторможенный",
    nameEn: "Sluggish",
    slot: "suf",
    effects: [{ label: "Скорость", labelEn: "Speed", good: false, min: -2.326, max: -0.58 }],
  },
  ergonomics_suf: {
    name: "Дискомфортный",
    nameEn: "Discomfortable",
    slot: "suf",
    effects: [{ label: "Эргономика оружия", labelEn: "Weapon Ergonomics", good: false, min: -17.45, max: -4.362 }],
  },
  shoot_factor_decrement_suf: {
    name: "Нестабильный",
    nameEn: "Unstable",
    slot: "suf",
    effects: [{ label: "Стабилизация", labelEn: "Stabilization", good: false, min: -23.266, max: -5.815 }],
  },
  wiggle_suf: {
    name: "Люфтящий",
    nameEn: "Shaky",
    slot: "suf",
    effects: [{ label: "Покачивание", labelEn: "Sway", good: false, min: 43.625, max: 10.906 }],
  },
  marksman: {
    name: "Снайпер",
    nameEn: "Sniper",
    slot: "key",
    effects: [
      { label: "Модификатор урона по конечностям", labelEn: "Limb damage modifier", good: true, min: 6.18, max: 24.721 },
      { label: "Модификатор урона в голову", labelEn: "Headshot damage modifier", good: true, min: 1.227, max: 4.908 },
      { label: "Урон по прочности пластин", labelEn: "Plate durability damage", good: false, min: -18.177, max: -72.708 },
    ],
  },
  sadist: {
    name: "Охотник",
    nameEn: "Hunter",
    slot: "key",
    effects: [
      { label: "Отдача", labelEn: "Recoil", good: false, min: 2.181, max: 8.725 },
      { label: "Гориз. отдача", labelEn: "Horizontal recoil", good: false, min: 2.181, max: 8.725 },
      {
        label: "",
        labelEn: "",
        good: true,
        min: 0.032,
        max: 0.127,
        text: "Урон увеличивается на {bonus}% за каждый отсутствующий процент здоровья у цели",
        textEn: "Damage increases by {bonus}% for each missing percent of target health",
      },
    ],
  },
  sledgehammer: {
    name: "Перфоратор",
    nameEn: "Perforator",
    slot: "key",
    effects: [{ label: "Урон по прочности пластин", labelEn: "Damage to plate durability", good: true, min: 18.177, max: 72.708 }],
  },
  gyroscope: {
    name: "Регулятор",
    nameEn: "Regulator",
    slot: "key",
    effects: [{ label: "Нарастание отдачи", labelEn: "Recoil buildup", good: true, min: -16.359, max: -65.437 }],
  },
  aim_switch_time_aff: {
    name: "Стрелок",
    nameEn: "Shooter",
    slot: "key",
    effects: [{ label: "Скорость прицеливания", labelEn: "Aim speed", good: true, min: 3.638, max: 14.536 }],
  },
  hip_spread_aff: {
    name: "Проектор",
    nameEn: "Projector",
    slot: "key",
    effects: [{ label: "Разброс от бедра", labelEn: "Hip-fire spread", good: true, min: -2.727, max: -10.906 }],
  },
  spread_aff: {
    name: "Контролер",
    nameEn: "Controller",
    slot: "key",
    effects: [{ label: "Разброс", labelEn: "Spread", good: true, min: -2.727, max: -10.906 }],
  },
  recoil_aff: {
    name: "Держатель",
    nameEn: "Holder",
    slot: "key",
    effects: [{ label: "Отдача", labelEn: "Recoil", good: true, min: -3.272, max: -13.087 }],
  },
  horizontal_recoil_aff: {
    name: "Фиксатор",
    nameEn: "Fixator",
    slot: "key",
    effects: [{ label: "Гориз. отдача", labelEn: "Horizontal recoil", good: true, min: -3.272, max: -13.087 }],
  },
  recoil_gain_aff: {
    name: "Седатор",
    nameEn: "Sedator",
    slot: "key",
    effects: [{ label: "Нарастание отдачи", labelEn: "Recoil buildup", good: true, min: -4.362, max: -17.45 }],
  },
  ergonomics_aff: {
    name: "Биостабилизатор",
    nameEn: "Biostabilizer",
    slot: "key",
    effects: [{ label: "Эргономика оружия", labelEn: "Weapon Ergonomics", good: true, min: 4.362, max: 17.45 }],
  },
  shoot_factor_decrement_aff: {
    name: "Гаситель",
    nameEn: "Suppressor",
    slot: "key",
    effects: [{ label: "Стабилизация", labelEn: "Stabilization", good: true, min: 5.815, max: 23.266 }],
  },
  wiggle_aff: {
    name: "Вариатор",
    nameEn: "Variator",
    slot: "key",
    effects: [{ label: "Покачивание", labelEn: "Sway", good: true, min: -5.453, max: -21.812 }],
  },
  draw_time_aff: {
    name: "Экстрактор",
    nameEn: "Extractor",
    slot: "key",
    effects: [{ label: "Скорость доставания", labelEn: "Draw speed", good: true, min: 3.636, max: 14.548 }],
  },
  aiming_speed_modifier_aff: {
    name: "Оператор",
    nameEn: "Operator",
    slot: "key",
    effects: [{ label: "Скорость в прицеливании", labelEn: "Speed during aiming", good: true, min: 1.45, max: 5.817 }],
  },
  equipped_speed_modifier_aff: {
    name: "Слайдер",
    nameEn: "Slider",
    slot: "key",
    effects: [{ label: "Скорость", labelEn: "Speed", good: true, min: 0.58, max: 2.326 }],
  },
};
