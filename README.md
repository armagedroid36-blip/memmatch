# MemMatch

Мемный дейтинг как PWA: лента мемов, лайк/скип, мэтч = совпадение вкусов. Без чата.

- Прод-домен: пока нет (локально `npm run dev`, предпросмотр — `npm run preview`)
- Supabase-проект: `MemMatch`, ref `ixhubsunntcwahigtzsb`, регион ap-southeast-1 (Singapore)
- Проект «События на карте» (`xsbtejugutlpkgykiouw`) не используется — ключи и база отдельные

## Стек

Vite + React + TypeScript, `vite-plugin-pwa` (manifest + workbox service worker, кэш картинок мемов), `@supabase/supabase-js`.
Mobile-first, тёмная тема, свайп вправо/влево + кнопки.

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

## Запуск

```bash
cp .env.example .env   # заполнить ключами проекта
npm install
npm run dev
```

## Дальше (не в этой итерации)

- Парсер мемов (boyanu / pu1_tg / cats_cats) → Storage `memes` + `insert ... on conflict (source_post_id) do nothing`.
- RPC `security definer` для расчёта % совместимости (чужие `ratings` через RLS не читаются — считать на сервере).
- Матчи/чат/гео/премиум/фото-верификация — по явному запросу.
