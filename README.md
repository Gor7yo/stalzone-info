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

Vercel: push в `main` → сборка. Домен `stalzone-info.ru` (DNS на Рег.ру - записи, которые показывает Vercel в Settings → Domains).

### Запасной вариант: VPS

Если понадобится уйти с Vercel (в 10.2026 жили на VPS сутки - из России без VPN не открывается ни Vercel, ни DigitalOcean).
Actions → deploy → Run workflow (`.github/workflows/deploy.yml`) собирает `next build` в режиме `standalone`,
заливает архив на сервер и вызывает `stalzone-front-release`: распаковка в `/opt/stalzone/front/releases/<дата>-<коммит>`,
переключение ссылки `current`, рестарт службы `stalzone-front` (Node на `127.0.0.1:3000`, Caddy проксирует домен).
Хранятся 3 последних релиза.

```bash
journalctl -u stalzone-front -f          # логи
sudo stalzone-front-release --rollback   # откат на предыдущий релиз
```

Настройки репозитория (Settings → Secrets and variables → Actions):

| | |
|---|---|
| секрет `DEPLOY_HOST` | IP сервера |
| секрет `DEPLOY_SSH_KEY` | приватный ключ пользователя `deploy` |
| переменная `NEXT_PUBLIC_API_URL` | `https://api.stalzone-info.ru` |
| переменная `NEXT_PUBLIC_TG_APP_URL` | ссылка на мини-приложение |

### Первая настройка сервера

Файлы для сервера лежат в `deploy/`. С компьютера:

```bash
ssh-keygen -t ed25519 -f stalzone-deploy -N ""      # ключ для GitHub Actions
scp deploy/* stalzone-deploy.pub root@<IP>:/tmp/
```

На сервере от root:

```bash
useradd -m -s /bin/bash deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
install -m 600 -o deploy -g deploy /tmp/stalzone-deploy.pub /home/deploy/.ssh/authorized_keys
echo 'deploy ALL=(root) NOPASSWD: /usr/local/bin/stalzone-front-release' > /etc/sudoers.d/stalzone-front
chmod 440 /etc/sudoers.d/stalzone-front

install -m 755 /tmp/stalzone-front-release /usr/local/bin/
install -m 644 /tmp/stalzone-front.service /etc/systemd/system/
install -d -o stalzone -g stalzone /opt/stalzone/front/releases
systemctl daemon-reload && systemctl enable stalzone-front
```

Дальше: секреты в GitHub (содержимое файла `stalzone-deploy` - в `DEPLOY_SSH_KEY`) → Actions → deploy → Run workflow →
проверить на сервере `curl -s localhost:3000 | head -c 200` → добавить в `/etc/caddy/Caddyfile` блок из
`deploy/Caddyfile.snippet`, `systemctl reload caddy` → в DNS Рег.ру `A @` и `A www` на IP сервера (CNAME на Vercel удалить).
Caddy сам выпустит сертификат, как только DNS обновится.

---

by [gor2210](https://stalzone-info.ru)
