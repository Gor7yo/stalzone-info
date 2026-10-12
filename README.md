# STALZONE INFO - Frontend

Сайт и Telegram Mini App для игроков STALZONE: цены аукциона, флиппер, алерты в Telegram,
профили игроков, кланы и выбросы. Живая версия - [stalzone-info.ru](https://stalzone-info.ru).

> Неофициальный фан-проект. Данные - STALZONE API от EXBO. Бэкенд - отдельный репозиторий (NestJS).

## Возможности

- 🌍 **Регионы** RU / EU / NA / SEA
- 🔨 **Рынок**: поиск предметов (рус/англ, понимает неправильную раскладку: `rjvtnf` → «Комета»),
  лоты, лучшая цена, история продаж, живые таймеры
- 💎 **Артефакты и модули**: фильтр по качеству и шкала заточки +0…+15 с лучшей ценой каждого уровня;
  лот сравнивается только с такими же по качеству и заточке
- 📈 **Флиппер** (Pro): лоты дешевле рынка с прибылью после комиссии и оценкой надёжности, фильтры, переход
  на предмет с нужными качеством и заточкой
- 🔔 **Алерты в Telegram-боте**: цена ниже порога, выгодный флип, начало выброса. В мини-приложении
  пользователь определяется автоматически, на сайте - кнопкой «Привязать Telegram» (без пароля)
- 👤 **Игроки**: статистика, витрина достижений, описание с игровыми цветами (`§#RRGGBB`)
- 🛡️ **Кланы**: список, состав, лидер, описание
- ☢️ **Выбросы**: радар по всем регионам, живой таймер
- ⭐ **Pro**: пробный период 3 дня, оплата через Tribute; в бесплатной версии - цены, лоты и продажи за месяц
- 🛠️ **Админка** `/admin`: метрики с графиками, поиск пользователей, выдача Pro и баны, журнал
  (видна только админам)
- ⭐ **Избранное**: лучшие цены на главной, синхронизация через Telegram CloudStorage, диплинки на любой экран

Временно выключены (идеи сырые, код на месте): **крафт / древо бартера** и **рюкзак** -
флаги в `src/lib/flags.ts`.

## Стек

Next.js 16 (App Router) · React 19 · TypeScript · TanStack Query · CSS Modules ·
WebGL (аномалия на своём шейдере) · Telegram Mini Apps SDK (грузится лениво, только внутри Telegram)

## Запуск

```bash
npm install
cp .env.example .env.local
npm run dev                     # http://localhost:3000
```

| Переменная | Зачем |
|---|---|
| `NEXT_PUBLIC_API_URL` | адрес бэкенда, локально `http://localhost:3001`, на проде `https://api.stalzone-info.ru` |
| `NEXT_PUBLIC_TG_APP_URL` | ссылка на мини-приложение `https://t.me/<бот>/<приложение>` - для диплинков |

`NEXT_PUBLIC_*` вшиваются в сборку - после изменения нужен Redeploy на Vercel.

Проверки: `npm run typecheck`, `npm run lint`.

`npm run items` - пересобрать справочники из официальной базы EXBO
([stalcraft-database](https://github.com/EXBO-Studio/stalcraft-database)): предметы, названия статистик
и достижений, рецепты бартера. Запускать после обновлений игры.

## Структура

```
src/
  app/          страницы (App Router): рынок, флиппер, игроки, кланы, выбросы, Pro, админка
  components/   Shell (навбар, фон, подпись), Anomaly (WebGL), PriceChart, LotFilters, Pro, Barter, ui/*
  features/     данные и хуки по доменам: auction, items, alerts, pro, admin, character, clans, emission
  lib/          api, store, telegram, format, flags
scripts/        сборка справочников
public/         справочники (items.json, barter.json), иконки приложения
```

Иконки сайта и превью ссылки (`src/app/favicon.ico`, `icon.png`, `apple-icon.png`, `opengraph-image.png`,
`public/icon-*.png`) собраны из `promo/site-icons.html`.

## Деплой

Vercel: push в основную ветку → сборка. Домен `stalzone-info.ru` (DNS на Рег.ру: `A @` и `CNAME www` на Vercel).

---

by [gor2210](https://stalzone-info.ru)
