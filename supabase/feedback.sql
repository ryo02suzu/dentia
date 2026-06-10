-- dentia — フィードバック（ご意見・ご要望）収集
-- Supabase の SQL Editor で実行してください。
-- ベータ版で利用者からの改良点を集めるためのテーブルです。

create extension if not exists pgcrypto;

create table if not exists public.feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  message    text not null,
  page       text
);

alter table public.feedback enable row level security;

-- 本人のみ投稿・参照可（管理者はSupabaseダッシュボードで全件確認）
drop policy if exists "feedback_insert_own" on public.feedback;
create policy "feedback_insert_own" on public.feedback
  for insert with check (auth.uid() = user_id);

drop policy if exists "feedback_select_own" on public.feedback;
create policy "feedback_select_own" on public.feedback
  for select using (auth.uid() = user_id);
