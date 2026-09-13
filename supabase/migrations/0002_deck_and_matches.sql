-- 0002_deck_and_matches.sql — RPC для ленты и мэтчей (Memder)
-- Лента: случайные approved-мемы, которые текущий пользователь ещё не оценивал.
-- Мэтчи: Jaccard по лайкам среди пар с >= p_min_shared общими оценёнными мемами.
-- Наружу отдаётся только процент и число общих мемов: какие именно мемы совпали
-- и чужие оценки не раскрываются (считает security definer, RLS обойдён осознанно).

-- ─── Лента ────────────────────────────────────────────────────────────────────
-- random() внутри функции: порядок разный на каждом запросе (перемешивание).
-- Гостю (anon) auth.uid() = null — просто вернутся случайные approved-мемы,
-- это те же данные, что и так открыты политикой memes_select_approved.
create or replace function public.get_deck(p_limit int default 30, p_category int default null)
returns table (
  id uuid,
  image_url text,
  source_name text,
  original_caption text,
  category_id int
)
language sql
security definer
set search_path = public
as $$
  select m.id, m.image_url, m.source_name, m.original_caption, m.category_id
  from public.memes m
  where m.status = 'approved'
    and (p_category is null or m.category_id = p_category)
    and not exists (
      select 1 from public.ratings r
      where r.meme_id = m.id
        and auth.uid() is not null
        and r.user_id = auth.uid()
    )
  order by random()
  limit greatest(1, least(coalesce(p_limit, 30), 100));
$$;

revoke all on function public.get_deck(int, int) from public;
grant execute on function public.get_deck(int, int) to anon, authenticated;

-- ─── Мэтчи ────────────────────────────────────────────────────────────────────
create or replace function public.get_matches(
  p_min_shared int default 10,
  p_min_percent int default 50
)
returns table (
  user_id uuid,
  display_name text,
  age int,
  city text,
  percent int,
  shared_memes_count int
)
language sql
security definer
set search_path = public
as $$
  with me as (
    select r.meme_id, r.value
    from public.ratings r
    where r.user_id = auth.uid()
      and auth.uid() is not null
  ),
  others as (
    select r.user_id, r.meme_id, r.value
    from public.ratings r
    where auth.uid() is not null and r.user_id <> auth.uid()
  ),
  pairs as (
    select o.user_id,
           count(*) as shared,
           count(*) filter (where o.value = 'like' and me.value = 'like') as both_liked,
           count(*) filter (where o.value = 'like' or me.value = 'like') as either_liked
    from others o
    join me on me.meme_id = o.meme_id
    group by o.user_id
  )
  select p.user_id,
         u.display_name,
         u.age,
         u.city,
         round(100.0 * p.both_liked / p.either_liked)::int as percent,
         p.shared::int as shared_memes_count
  from pairs p
  join public.users u on u.id = p.user_id
  where p.shared >= coalesce(p_min_shared, 10)
    and p.either_liked > 0
    and round(100.0 * p.both_liked / p.either_liked) >= coalesce(p_min_percent, 50)
  order by percent desc, p.shared desc
  limit 100;
$$;

-- только для вошедших: гость не должен видеть чужие профили.
-- Supabase выдаёт EXECUTE ролям anon/authenticated через ALTER DEFAULT PRIVILEGES,
-- поэтому revoke нужен ЯВНО и для anon (одного from public недостаточно).
revoke all on function public.get_matches(int, int) from public, anon;
grant execute on function public.get_matches(int, int) to authenticated;
