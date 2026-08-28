# STALZONE INFO — Frontend

Telegram Mini App для просмотра информации о STALZONE через API.

## Возможности

- 🌍 Переключение регионов
- 🔨 Аукцион
  - Лоты
  - История продаж
- 👤 Поиск персонажей
- 🛡️ Информация о кланах
- ☢️ Информация о выбросах
- 🗺️ Планировщик клановых войн
- 🔐 Авторизация через STALZONE
- 📱 Адаптация под Telegram Mini App

## Стек

- Next.js
- React
- TypeScript
- MobX
- TanStack Query
- CSS Modules
- Telegram Mini Apps

## Архитектура

```text
src/
├── app/
│   ├── page.tsx
│   ├── auction/
│   ├── character/
│   ├── clans/
│   └── planner/
│
├── components/
│   ├── ui/
│   ├── MobxProvider.tsx
│   └── ...
│
├── features/
│   ├── auction/
│   │   ├── api.ts
│   │   └── components/
│   │
│   ├── character/
│   ├── clans/
│   └── emission/
│
├── store/
│   └── GlobalSettings.ts
│
├── lib/
│   ├── api/
│   └── telegram/
│
└── providers/
    └── index.tsx
