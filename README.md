# STALZONE INFO — Frontend

Telegram Mini App для просмотра информации о STALZONE через API.

## Возможности

- 🌍 Переключение регионов
- 🔨 Аукцион
- 👤 Поиск персонажей
- 🛡️ Информация о кланах
- ☢️ Информация о выбросах

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
