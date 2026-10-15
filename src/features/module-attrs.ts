import type { ModuleAttrInfo } from "./modules";

/**
 * Атрибуты оружейного модуля: id из EXBO (additional.attributes) → название, место и эффекты.
 * pre — приставка (небольшой баф), suf — суффикс (дебаф), key — ключевая характеристика (уникальный баф).
 * Эффект линейно зависит от процента качества атрибута: min при 0%, max при 190% (см. modules.ts).
 * Данных нет в API EXBO — справочник из игры (собран Stalzone Hub, сверен с игрой по модулю
 * «Устойчивый Нестабильный «Снайпер»»). Знак трёх суффиксов замедления исправлен по SC Tools.
 * text — особый эффект, {bonus} подставляется числом.
 */
export const MODULE_ATTRS: Record<string, ModuleAttrInfo> = {
  aim_switch_time_pre: {
    name: "Бдительный",
    slot: "pre",
    effects: [{ label: "Скорость прицеливания", good: true, min: 3.638, max: 14.544 }],
  },
  hip_spread_pre: { name: "Устойчивый", slot: "pre", effects: [{ label: "Разброс от бедра", good: true, min: -2.727, max: -10.906 }] },
  spread_pre: { name: "Суммирующий", slot: "pre", effects: [{ label: "Разброс", good: true, min: -2.727, max: -10.906 }] },
  recoil_pre: { name: "Вертикальный", slot: "pre", effects: [{ label: "Отдача", good: true, min: -3.272, max: -13.087 }] },
  horizontal_recoil_pre: {
    name: "Горизонтальный",
    slot: "pre",
    effects: [{ label: "Гориз. отдача", good: true, min: -3.272, max: -13.087 }],
  },
  recoil_gain_pre: { name: "Плавный", slot: "pre", effects: [{ label: "Нарастание отдачи", good: true, min: -4.362, max: -17.45 }] },
  draw_time_pre: { name: "Мгновенный", slot: "pre", effects: [{ label: "Скорость доставания", good: true, min: 3.636, max: 14.548 }] },
  aiming_speed_modifier_pre: {
    name: "Фокусный",
    slot: "pre",
    effects: [{ label: "Скорость в прицеливании", good: true, min: 1.45, max: 5.817 }],
  },
  equipped_speed_modifier_pre: { name: "Подвижный", slot: "pre", effects: [{ label: "Скорость", good: true, min: 0.58, max: 2.326 }] },
  ergonomics_pre: { name: "Комфортный", slot: "pre", effects: [{ label: "Эргономика оружия", good: true, min: 4.362, max: 17.45 }] },
  shoot_factor_decrement_pre: {
    name: "Стабильный",
    slot: "pre",
    effects: [{ label: "Стабилизация", good: true, min: 5.815, max: 23.266 }],
  },
  wiggle_pre: { name: "Гармоничный", slot: "pre", effects: [{ label: "Покачивание", good: true, min: -5.453, max: -21.812 }] },
  aim_switch_time_suf: {
    name: "Дрожащий",
    slot: "suf",
    effects: [{ label: "Скорость прицеливания", good: false, min: -14.54, max: -3.63 }],
  },
  hip_spread_suf: { name: "Неустойчивый", slot: "suf", effects: [{ label: "Разброс от бедра", good: false, min: 10.906, max: 2.727 }] },
  spread_suf: { name: "Отрицающий", slot: "suf", effects: [{ label: "Разброс", good: false, min: 10.906, max: 2.727 }] },
  recoil_suf: { name: "Уходящий", slot: "suf", effects: [{ label: "Отдача", good: false, min: 13.087, max: 3.272 }] },
  horizontal_recoil_suf: { name: "Сдвигающий", slot: "suf", effects: [{ label: "Гориз. отдача", good: false, min: 13.087, max: 3.272 }] },
  recoil_gain_suf: { name: "Резкий", slot: "suf", effects: [{ label: "Нарастание отдачи", good: false, min: 17.45, max: 4.362 }] },
  draw_time_suf: { name: "Инертный", slot: "suf", effects: [{ label: "Скорость доставания", good: false, min: -14.548, max: -3.636 }] },
  aiming_speed_modifier_suf: {
    name: "Медлительный",
    slot: "suf",
    effects: [{ label: "Скорость в прицеливании", good: false, min: -5.817, max: -1.45 }],
  },
  equipped_speed_modifier_suf: {
    name: "Заторможенный",
    slot: "suf",
    effects: [{ label: "Скорость", good: false, min: -2.326, max: -0.58 }],
  },
  ergonomics_suf: { name: "Дискомфортный", slot: "suf", effects: [{ label: "Эргономика оружия", good: false, min: -17.45, max: -4.362 }] },
  shoot_factor_decrement_suf: {
    name: "Нестабильный",
    slot: "suf",
    effects: [{ label: "Стабилизация", good: false, min: -23.266, max: -5.815 }],
  },
  wiggle_suf: { name: "Люфтящий", slot: "suf", effects: [{ label: "Покачивание", good: false, min: 43.625, max: 10.906 }] },
  marksman: {
    name: "Снайпер",
    slot: "key",
    effects: [
      { label: "Модификатор урона по конечностям", good: true, min: 6.18, max: 24.721 },
      { label: "Модификатор урона в голову", good: true, min: 1.227, max: 4.908 },
      { label: "Урон по прочности пластин", good: false, min: -18.177, max: -72.708 },
    ],
  },
  sadist: {
    name: "Охотник",
    slot: "key",
    effects: [
      { label: "Отдача", good: false, min: 2.181, max: 8.725 },
      { label: "Гориз. отдача", good: false, min: 2.181, max: 8.725 },
      {
        label: "",
        good: true,
        min: 0.032,
        max: 0.127,
        text: "Урон увеличивается на {bonus}% за каждый отсутствующий процент здоровья у цели",
      },
    ],
  },
  sledgehammer: {
    name: "Перфоратор",
    slot: "key",
    effects: [{ label: "Урон по прочности пластин", good: true, min: 18.177, max: 72.708 }],
  },
  gyroscope: { name: "Регулятор", slot: "key", effects: [{ label: "Нарастание отдачи", good: true, min: -16.359, max: -65.437 }] },
  aim_switch_time_aff: { name: "Стрелок", slot: "key", effects: [{ label: "Скорость прицеливания", good: true, min: 3.638, max: 14.536 }] },
  hip_spread_aff: { name: "Проектор", slot: "key", effects: [{ label: "Разброс от бедра", good: true, min: -2.727, max: -10.906 }] },
  spread_aff: { name: "Контролер", slot: "key", effects: [{ label: "Разброс", good: true, min: -2.727, max: -10.906 }] },
  recoil_aff: { name: "Держатель", slot: "key", effects: [{ label: "Отдача", good: true, min: -3.272, max: -13.087 }] },
  horizontal_recoil_aff: { name: "Фиксатор", slot: "key", effects: [{ label: "Гориз. отдача", good: true, min: -3.272, max: -13.087 }] },
  recoil_gain_aff: { name: "Седатор", slot: "key", effects: [{ label: "Нарастание отдачи", good: true, min: -4.362, max: -17.45 }] },
  ergonomics_aff: { name: "Биостабилизатор", slot: "key", effects: [{ label: "Эргономика оружия", good: true, min: 4.362, max: 17.45 }] },
  shoot_factor_decrement_aff: { name: "Гаситель", slot: "key", effects: [{ label: "Стабилизация", good: true, min: 5.815, max: 23.266 }] },
  wiggle_aff: { name: "Вариатор", slot: "key", effects: [{ label: "Покачивание", good: true, min: -5.453, max: -21.812 }] },
  draw_time_aff: { name: "Экстрактор", slot: "key", effects: [{ label: "Скорость доставания", good: true, min: 3.636, max: 14.548 }] },
  aiming_speed_modifier_aff: {
    name: "Оператор",
    slot: "key",
    effects: [{ label: "Скорость в прицеливании", good: true, min: 1.45, max: 5.817 }],
  },
  equipped_speed_modifier_aff: { name: "Слайдер", slot: "key", effects: [{ label: "Скорость", good: true, min: 0.58, max: 2.326 }] },
};
