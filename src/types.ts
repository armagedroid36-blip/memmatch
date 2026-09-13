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
  source_post_id: string
  category_id: number | null
  original_caption: string | null
  published_at: string | null
  status: MemeStatus
  created_at: string | null
}

export interface AppUser {
  id: string
  display_name: string
  age: number | null
  city: string | null
  created_at?: string | null
}

export interface Rating {
  user_id: string
  meme_id: string
  value: RatingValue
}
