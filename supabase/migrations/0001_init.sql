-- 0001_init.sql — MemMatch: базовая схема (мемный дейтинг)
-- Применено: см. README (Management API → /v1/projects/{ref}/database/query)

create extension if not exists pgcrypto;

-- ─── Категории ────────────────────────────────────────────────────────────────
create table if not exists public.categories (
  id   serial primary key,
  name text not null unique
);

insert into public.categories (name) values
  ('Мемы'),
  ('Классика/бояны'),
  ('Коты'),
  ('Путешествия')
on conflict (name) do nothing;

-- ─── Мемы ─────────────────────────────────────────────────────────────────────
create table if not exists public.memes (
  id               uuid primary key default gen_random_uuid(),
  image_url        text not null,
  source_name      text not null,                                  -- boyanu / pu1_tg / cats_cats
  source_post_id   text unique not null,                           -- "boyanu/12345" — дедуп
  category_id      int references public.categories(id),
  original_caption text,
  published_at     timestamptz,
  status           text not null default 'approved'
                   check (status in ('seed','pending','approved','rejected')),
  created_at       timestamptz default now()
);

create index if not exists memes_status_idx      on public.memes(status);
create index if not exists memes_category_id_idx on public.memes(category_id);
create index if not exists memes_source_name_idx on public.memes(source_name);

-- ─── Пользователи (1:1 с auth.users) ──────────────────────────────────────────
create table if not exists public.users (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  age          int check (age between 14 and 99),
  city         text,
  created_at   timestamptz default now()
);

-- ─── Оценки (лайк/скип) ───────────────────────────────────────────────────────
create table if not exists public.ratings (
  user_id    uuid not null references public.users(id)  on delete cascade,
  meme_id    uuid not null references public.memes(id)  on delete cascade,
  value      text not null check (value in ('like','dislike')),
  created_at timestamptz default now(),
  primary key (user_id, meme_id)
);

create index if not exists ratings_meme_id_idx on public.ratings(meme_id);
create index if not exists ratings_user_id_idx on public.ratings(user_id);

-- ─── Storage: публичный бакет «memes» ─────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('memes', 'memes', true, 5242880,
        array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = true;

-- ─── RLS ──────────────────────────────────────────────────────────────────────
alter table public.categories enable row level security;
alter table public.memes      enable row level security;
alter table public.users      enable row level security;
alter table public.ratings    enable row level security;

-- categories: читают все (нужно для фильтров ленты), пишет только service_role
drop policy if exists categories_select_all on public.categories;
create policy categories_select_all on public.categories
  for select to anon, authenticated using (true);

-- memes: наружу только approved; INSERT/UPDATE/DELETE политик нет →
-- anon и authenticated писать не могут, service_role (RLS bypass) пишет парсером
drop policy if exists memes_select_approved on public.memes;
create policy memes_select_approved on public.memes
  for select to anon, authenticated using (status = 'approved');

-- users: имя/город видны аутентифицированным; править можно только свою строку
drop policy if exists users_select_authenticated on public.users;
create policy users_select_authenticated on public.users
  for select to authenticated using (true);

drop policy if exists users_insert_self on public.users;
create policy users_insert_self on public.users
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- ratings: своих видно, чужих — нет; писать только от своего имени
drop policy if exists ratings_select_own on public.ratings;
create policy ratings_select_own on public.ratings
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists ratings_insert_own on public.ratings;
create policy ratings_insert_own on public.ratings
  for insert to authenticated with check (auth.uid() = user_id);
