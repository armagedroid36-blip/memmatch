# Memder (репозиторий memmatch)

Прод: **https://armagedroid36-blip.github.io/memmatch/** — GitHub Pages, авто-деплой из `main`
(`.github/workflows/deploy-pages.yml`). PWA ставится на телефон: Chrome — «Установить приложение»,
iPhone — «Поделиться» → «На экран „Домой“».

Мемный дейтинг как PWA: лента мемов, лайк/скип, мэтч = совпадение вкусов. Без чата.

- Локально: `npm run dev`, предпросмотр сборки — `npm run preview`
- Имя продукта в интерфейсе и манифесте — **Memder**; репозиторий и проект Supabase остались `memmatch`
- Supabase-проект: `MemMatch`, ref `ixhubsunntcwahigtzsb`, регион ap-southeast-1 (Singapore)
- Проект «События на карте» (`xsbtejugutlpkgykiouw`) не используется — ключи и база отдельные

> GitHub Pages на бесплатном тарифе работает только для **публичных** репозиториев (поэтому репозиторий открыт;
> секретов в коде нет — `.env` в `.gitignore`, anon-ключ Supabase публичный по определению).
> При переезде на корневой хостинг (Vercel/Netlify) `VITE_BASE` не задавать.

## Стек

Vite + React + TypeScript, `vite-plugin-pwa` (manifest + workbox: precache shell, отдельный кэш картинок из Storage),
`@supabase/supabase-js`. Стили — свой CSS (`src/index.css`), тёмная тема, акцент `#E66343`, вторичный `#72D2CF`.
Все тексты — в `src/i18n/ru.ts` (задел под i18n). Mobile-first, лента/мэтчи в нижней навигации.

## Что уже есть

- `supabase/migrations/0001_init.sql` — схема: `categories`, `memes`, `users`, `ratings`, индексы, RLS, публичный bucket `memes`.
- Регистрация/вход по email (Supabase Auth) → онбординг (имя, возраст, город) → лента мемов → лайк/скип пишется в `ratings`.

## Модель данных

- `categories` — ру-названия категорий (сид: Мемы, Классика/бояны, Коты, Путешествия).
- `memes` — `source_post_id` формата `boyanu/12345` уникален (дедуп парсера); `status`: seed / pending / approved / rejected.
- `users` — 1:1 с `auth.users` (`on delete cascade`), `display_name`, `age` (14–99), `city`.
- `ratings` — PK `(user_id, meme_id)`, `value` = like | dislike.

## RLS (проверено через REST)

- `memes`: SELECT только `status='approved'` для anon/authenticated; INSERT/UPDATE/DELETE политик нет → писать может только `service_role` (парсер).
- `categories`: SELECT всем.
- `ratings`: SELECT/INSERT только своих строк (`auth.uid() = user_id`); чужое не видно, за другого не записать.
- `users`: SELECT аутентифицированным (имя/город), INSERT только себя, UPDATE только своей строки.
- Storage `memes` — публичный bucket (картинки отдаются по `/storage/v1/object/public/memes/<path>`).

## Миграции

Применяются через Management API (SQL-редактор тоже подойдёт):

```bash
python "$HOME/AppData/Local/hermes/skills/software-development/supabase-integration/scripts/supabase_sql.py" \
  ixhubsunntcwahigtzsb "$SUPABASE_ACCESS_TOKEN" supabase/migrations/0001_init.sql
```

## Сбор мемов (`scripts/collect-memes.mjs`)

Источник — публичный HTML `t.me/s/<канал>` (без аккаунта, без Bot API и токенов). Скрипт достаёт посты с картинкой,
скачивает файл и **кладёт копию в наш Storage** (bucket `memes`), а в таблицу пишет нашу публичную ссылку:
хотлинки на `cdn*.telesco.pe` протухают.

| канал | категория | что за канал |
|---|---|---|
| `boyanu` | Классика/бояны | Бояны и классика |
| `cats_cats` | Коты | коты |
| `pu1_tg` | Мемы | пик4á |
| `lup_tg` | Путешествия | Лига нишевых путешествий |

```bash
npm run collect                                       # все каналы, дефолт: 20 страниц × 500 мемов на канал
node --env-file=.env scripts/collect-memes.mjs --channels=boyanu --pages=1 --limit=5
node --env-file=.env scripts/collect-memes.mjs --dry  # отчёт без записи
```

- Дедуп — по `source_post_id` (`<канал>/<post_id>`), повторный запуск добирает только новое (`upsert ... ignoreDuplicates`).
- **Видео-посты пропускаются намеренно** (решение владельца: видео в проекте не нужно) — берём только картинки.
  Из-за этого `cats_cats` даёт мало материала: там ~90% постов видео.
- Витрина `t.me/s/` отдаёт не всю историю канала: у `pu1_tg` доступно ~100 последних постов, дальше страницы пустые.
  Это ограничение Telegram, не скрипта.
- Автозапуск: `.github/workflows/collect-memes.yml` — ежедневно 06:00 UTC (13:00 Бали) + ручной запуск,
  секреты `MEMMATCH_SUPABASE_URL` / `MEMMATCH_SUPABASE_SERVICE_KEY` в репозитории.

## Запуск

```bash
cp .env.example .env   # заполнить ключами проекта
npm install
npm run dev
```

## Дальше (не в этой итерации)

- RPC `security definer` для расчёта % совместимости (чужие `ratings` через RLS не читаются — считать на сервере).
- Матчи/чат/гео/премиум/фото-верификация — по явному запросу. Видео — не планируется.
