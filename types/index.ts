export type ContentType = {
  id: string
  name: string
  description: string | null
  target_ratio: number
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export type InstagramWhitelistItem = {
  id: string
  handle: string
  description: string | null
  region: 'ko' | 'en'
  is_active: boolean
  created_at: string
}

export type InstagramHashtagItem = {
  id: string
  hashtag: string
  language: 'ko' | 'en'
  is_active: boolean
  created_at: string
}

export type CollectionFilter = {
  id: string
  filter_key: string
  filter_value: string
  label: string | null
  updated_at: string
}

export type RssSource = {
  id: string
  group_name: string
  name: string
  url: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type CollectedContent = {
  id: string
  source_type: 'instagram' | 'rss'
  source_name: string | null
  original_url: string
  title: string | null
  caption: string | null
  thumbnail_url: string | null
  like_count: number
  comment_count: number
  share_count: number
  view_count: number
  published_at: string | null
  collected_at: string
  keywords: string[]
  content_type_id: string | null
  content_type?: ContentType | null
  raw_data: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export type CarouselCard = {
  number: number
  role: string
  headline: string
  body: string
  expertView?: string
  practical?: string
  characterMent?: string
  characterVisual?: string
}

export type GeneratedContent = {
  id: string
  source_content_id: string | null
  content_type_id: string | null
  content_type?: ContentType | null
  source_content?: CollectedContent | null
  content_title: string | null
  core_message: string | null
  carousel_content: CarouselCard[]
  instagram_caption: string | null
  hashtags: string[]
  original_url: string | null
  is_published: boolean
  instagram_post_url: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

export type GenerateResult = {
  contentTitle: string
  coreMessage: string
  carousel: CarouselCard[]
  instagramCaption: string
  hashtags: string[]
}
