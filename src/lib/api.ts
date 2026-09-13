import { supabase } from './supabase'
import type { AppUser, Category, Match, Meme, RatingValue } from '../types'

export const DECK_BATCH = 20 // размер пачки ленты
export const PREFETCH_AT = 3 // за сколько карточек до конца подгружаем следующую пачку

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from('categories').select('id, name').order('id')
  if (error) throw error
  return (data ?? []) as Category[]
}

/** Пачка ленты: случайные approved-мемы, которые пользователь ещё не оценивал. */
export async function fetchDeck(categoryId?: number, limit = DECK_BATCH): Promise<Meme[]> {
  const { data, error } = await supabase.rpc('get_deck', {
    p_limit: limit,
    p_category: categoryId ?? null,
  })
  if (error) throw error
  return (data ?? []) as Meme[]
}

export async function fetchProfile(userId: string): Promise<AppUser | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, display_name, age, city')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return (data as AppUser | null) ?? null
}

export async function createProfile(input: {
  id: string
  display_name: string
  age: number | null
  city: string | null
}): Promise<void> {
  const { error } = await supabase.from('users').insert(input)
  if (error) throw error
}

/** Оценка мема. Повторная оценка (23505) не считается ошибкой. */
export async function rateMeme(userId: string, memeId: string, value: RatingValue): Promise<void> {
  const { error } = await supabase
    .from('ratings')
    .insert({ user_id: userId, meme_id: memeId, value })
  if (error && error.code !== '23505') throw error
}

/** Мэтчи: только процент и число общих мемов, чужие оценки не раскрываются. */
export async function fetchMatches(): Promise<Match[]> {
  const { data, error } = await supabase.rpc('get_matches', {})
  if (error) throw error
  return (data ?? []) as Match[]
}
