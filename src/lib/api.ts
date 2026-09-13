import { supabase } from './supabase'
import type { AppUser, Category, Meme, RatingValue } from '../types'

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from('categories').select('id, name').order('id')
  if (error) throw error
  return (data ?? []) as Category[]
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

export async function fetchMyRatings(userId: string): Promise<Record<string, RatingValue>> {
  const { data, error } = await supabase
    .from('ratings')
    .select('meme_id, value')
    .eq('user_id', userId)
  if (error) throw error
  const map: Record<string, RatingValue> = {}
  for (const row of (data ?? []) as { meme_id: string; value: RatingValue }[]) {
    map[row.meme_id] = row.value
  }
  return map
}

/** Колода: approved-мемы, которые пользователь ещё не оценивал. */
export async function fetchDeck(userId: string, categoryId?: number): Promise<Meme[]> {
  const rated = await fetchMyRatings(userId)
  const ratedIds = Object.keys(rated)

  let query = supabase
    .from('memes')
    .select('id, image_url, source_name, source_post_id, category_id, original_caption, published_at, status, created_at')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(100)

  if (categoryId) query = query.eq('category_id', categoryId)
  if (ratedIds.length > 0) query = query.not('id', 'in', `(${ratedIds.join(',')})`)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as Meme[]
}

export async function rateMeme(userId: string, memeId: string, value: RatingValue): Promise<void> {
  const { error } = await supabase.from('ratings').insert({ user_id: userId, meme_id: memeId, value })
  // 23505 = повторная оценка того же мема — не ошибка для свайпа
  if (error && error.code !== '23505') throw error
}

export async function countMyRatings(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('ratings')
    .select('meme_id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('value', 'like')
  if (error) throw error
  return count ?? 0
}
