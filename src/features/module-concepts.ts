import type { ModuleConcept } from "./modules";

/**
 * Ключевые характеристики оружейного модуля: id из EXBO (additional.attributes, type 2) → название,
 * описание и эффекты. Значение эффекта растёт линейно с очками качества модуля: min при 0, max при 190
 * (см. effectRange в modules.ts). Данных нет в API EXBO - справочник из игры (собран Stalzone Hub).
 * text - особый эффект, {bonus} подставляется числом.
 */
export const MODULE_CONCEPTS: Record<string, ModuleConcept> = {
  marksman: {
    name: "Снайпер",
    description: "Увеличивает урон в голову и конечности взамен на снижение урона по пластинам",
    effects: [
      { label: "Модификатор урона по конечностям", good: true, min: 6.18, max: 24.721 },
      { label: "Модификатор урона в голову", good: true, min: 1.227, max: 4.908 },
      { label: "Урон по прочности пластин", good: false, min: -18.177, max: -72.708 },
    ],
  },
  sadist: {
    name: "Охотник",
    description: "Наносит дополнительный урон за каждый отсутствующий % здоровья цели",
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
    description: "Увеличивает урон по пластинам",
    effects: [{ label: "Урон по прочности пластин", good: true, min: 18.177, max: 72.708 }],
  },
  gyroscope: {
    name: "Регулятор",
    description: "Значительно уменьшает нарастание отдачи вплоть до смены вектора отдачи",
    effects: [{ label: "Нарастание отдачи", good: true, min: -16.359, max: -65.437 }],
  },
  aim_switch_time_aff: {
    name: "Стрелок",
    description: "Уменьшает время прицеливания",
    effects: [{ label: "Скорость прицеливания", good: true, min: 3.638, max: 14.536 }],
  },
  hip_spread_aff: {
    name: "Проектор",
    description: "Уменьшает разброс от бедра",
    effects: [{ label: "Разброс от бедра", good: true, min: -2.727, max: -10.906 }],
  },
  spread_aff: {
    name: "Контролер",
    description: "Уменьшает разброс",
    effects: [{ label: "Разброс", good: true, min: -2.727, max: -10.906 }],
  },
  recoil_aff: { name: "Держатель", description: "Уменьшает отдачу", effects: [{ label: "Отдача", good: true, min: -3.272, max: -13.087 }] },
  horizontal_recoil_aff: {
    name: "Фиксатор",
    description: "Уменьшает горизонтальную отдачу",
    effects: [{ label: "Гориз. отдача", good: true, min: -3.272, max: -13.087 }],
  },
  recoil_gain_aff: {
    name: "Седатор",
    description: "Уменьшает нарастание отдачи",
    effects: [{ label: "Нарастание отдачи", good: true, min: -4.362, max: -17.45 }],
  },
  thermos: {
    name: "Термос",
    description: "Увеличивает урон первых выстрелов",
    effects: [{ label: "", good: true, min: 1.472, max: 5.889, text: "Первые 5 патронов в магазине получают бонус {bonus}% к урону" }],
  },
  finisher: {
    name: "Завершитель",
    description: "Увеличивает урон последних выстрелов",
    effects: [{ label: "", good: true, min: 1.472, max: 5.889, text: "Последние 5 патронов в магазине получают бонус {bonus}% к урону" }],
  },
  ergonomics_aff: {
    name: "Биостабилизатор",
    description: "Увеличивает эргономику",
    effects: [{ label: "Эргономика оружия", good: true, min: 4.362, max: 17.45 }],
  },
  shoot_factor_decrement_aff: {
    name: "Гаситель",
    description: "Увеличивает стабилизацию",
    effects: [{ label: "Стабилизация", good: true, min: 5.815, max: 23.266 }],
  },
  wiggle_aff: {
    name: "Вариатор",
    description: "Уменьшает покачивание",
    effects: [{ label: "Покачивание", good: true, min: -5.453, max: -21.812 }],
  },
  draw_time_aff: {
    name: "Экстрактор",
    description: "Уменьшает время доставания",
    effects: [{ label: "Скорость доставания", good: true, min: 3.636, max: 14.548 }],
  },
  aiming_speed_modifier_aff: {
    name: "Оператор",
    description: "Увеличивает скорость в прицеливании",
    effects: [{ label: "Скорость в прицеливании", good: true, min: 1.45, max: 5.817 }],
  },
  equipped_speed_modifier_aff: {
    name: "Слайдер",
    description: "Увеличивает скорость с оружием",
    effects: [{ label: "Скорость", good: true, min: 0.58, max: 2.326 }],
  },
  supressor: {
    name: "Компрессор",
    description: "Увеличивает максимальный урон взамен на минимальный",
    effects: [
      { label: "Урон", good: true, min: 1.227, max: 4.908 },
      { label: "Урон вдали", good: false, min: -1.227, max: -4.908 },
    ],
  },
  decompressor: {
    name: "Декомпрессор",
    description: "Увеличивает минимальный урон взамен на максимальный",
    effects: [
      { label: "Урон вдали", good: true, min: 1.227, max: 4.908 },
      { label: "Урон", good: false, min: -1.227, max: -4.908 },
    ],
  },
  executioner: {
    name: "Палач",
    description: "Увеличивает урон по конечностям",
    effects: [{ label: "Модификатор урона по конечностям", good: true, min: 6.18, max: 24.721 }],
  },
  punch: {
    name: "Пробойник",
    description: "Увеличивает скорость передвижения после убийства врага",
    effects: [
      { label: "Скорость", good: true, min: 3.49, max: 13.96, text: "Скорость увеличивается на {bonus}% на 15 с после убийства игрока" },
    ],
  },
  aggressor: {
    name: "Агрессор",
    description: "Усиливает лечение после убийства врага",
    effects: [
      {
        label: "Периодическое лечение",
        good: true,
        min: 3.635,
        max: 14.542,
        text: "Периодическое лечение увеличивается на {bonus}% на 15 с после убийства игрока",
      },
    ],
  },
  destroyer: {
    name: "Губитель",
    description: "Уменьшает отдачу после убийства врага",
    effects: [
      {
        label: "Время перезарядки",
        good: true,
        min: -3.635,
        max: -14.542,
        text: "Время перезарядки уменьшается на {bonus}% на 15 с после убийства игрока",
      },
      { label: "Отдача", good: true, min: -10.906, max: -43.625, text: "Отдача уменьшается на {bonus}% на 15 с после убийства игрока" },
    ],
  },
};
