export type MemeStatus = 'seed' | 'pending' | 'approved' | 'rejected'
export type RatingValue = 'like' | 'dislike'

export interface Category {
  id: number
  name: string
}

export interface Meme {
  id: string
  image_url: string
  source_name: string
  original_caption: string | null
  category_id: number | null
}

export interface AppUser {
  id: string
  display_name: string
  age: number | null
  city: string | null
  created_at?: string | null
}

export interface Match {
  user_id: string
  display_name: string
  age: number | null
  city: string | null
  percent: number
  shared_memes_count: number
}

export type Tab = 'feed' | 'matches'
