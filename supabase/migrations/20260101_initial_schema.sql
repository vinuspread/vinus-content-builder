-- updated_at 자동 갱신 함수
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- content_types
create table content_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  target_ratio numeric(5,2) not null default 0,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger content_types_updated_at
  before update on content_types
  for each row execute function update_updated_at();

-- instagram_whitelist
create table instagram_whitelist (
  id uuid primary key default gen_random_uuid(),
  handle text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- instagram_hashtags
create table instagram_hashtags (
  id uuid primary key default gen_random_uuid(),
  hashtag text not null unique,
  language text not null check (language in ('ko', 'en')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- collection_filters
create table collection_filters (
  id uuid primary key default gen_random_uuid(),
  filter_key text not null unique,
  filter_value text not null,
  label text,
  updated_at timestamptz not null default now()
);
create trigger collection_filters_updated_at
  before update on collection_filters
  for each row execute function update_updated_at();

-- rss_sources
create table rss_sources (
  id uuid primary key default gen_random_uuid(),
  group_name text not null,
  name text not null,
  url text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger rss_sources_updated_at
  before update on rss_sources
  for each row execute function update_updated_at();

-- collected_contents
create table collected_contents (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('instagram', 'rss')),
  source_name text,
  original_url text not null unique,
  title text,
  caption text,
  thumbnail_url text,
  like_count integer default 0,
  comment_count integer default 0,
  share_count integer default 0,
  view_count integer default 0,
  published_at timestamptz,
  collected_at timestamptz not null default now(),
  keywords jsonb default '[]',
  content_type_id uuid references content_types(id),
  raw_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index collected_contents_source_type_idx on collected_contents(source_type);
create index collected_contents_content_type_id_idx on collected_contents(content_type_id);
create index collected_contents_collected_at_idx on collected_contents(collected_at desc);
create index collected_contents_like_count_idx on collected_contents(like_count desc);
create trigger collected_contents_updated_at
  before update on collected_contents
  for each row execute function update_updated_at();

-- generated_contents
create table generated_contents (
  id uuid primary key default gen_random_uuid(),
  source_content_id uuid references collected_contents(id),
  content_type_id uuid references content_types(id),
  content_title text,
  core_message text,
  carousel_content jsonb default '[]',
  instagram_caption text,
  hashtags jsonb default '[]',
  original_url text,
  is_published boolean not null default false,
  instagram_post_url text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index generated_contents_source_content_id_idx on generated_contents(source_content_id);
create index generated_contents_is_published_idx on generated_contents(is_published);
create trigger generated_contents_updated_at
  before update on generated_contents
  for each row execute function update_updated_at();

-- RLS: 개발용 Allow all (Service Role Key로 접근)
alter table content_types enable row level security;
alter table instagram_whitelist enable row level security;
alter table instagram_hashtags enable row level security;
alter table collection_filters enable row level security;
alter table rss_sources enable row level security;
alter table collected_contents enable row level security;
alter table generated_contents enable row level security;

create policy "allow all" on content_types for all using (true) with check (true);
create policy "allow all" on instagram_whitelist for all using (true) with check (true);
create policy "allow all" on instagram_hashtags for all using (true) with check (true);
create policy "allow all" on collection_filters for all using (true) with check (true);
create policy "allow all" on rss_sources for all using (true) with check (true);
create policy "allow all" on collected_contents for all using (true) with check (true);
create policy "allow all" on generated_contents for all using (true) with check (true);
