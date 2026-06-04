-- dentia — Supabase スキーマ（records テーブル + RLS）
-- Supabase ダッシュボードの SQL Editor に貼り付けて実行してください。
-- これにより「自分の行だけ read/write できる」データ分離が有効になります。

-- UUID生成に必要（通常は有効済み）
create extension if not exists pgcrypto;

-- カルテ（SOAP）保存テーブル
create table if not exists public.records (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  template    text,            -- テンプレ種別 (first/recall/spt/pros/endo)
  transcript  text,            -- 文字起こし/入力テキスト
  memo        text,            -- 補足メモ（既往歴・アレルギー等）
  s           text,            -- Subjective 主訴・問診
  o           text,            -- Objective 口腔内所見
  a           text,            -- Assessment 評価・診断（下書き）
  p           text             -- Plan 治療計画
);

-- 一覧取得を速くするインデックス
create index if not exists records_user_created_idx
  on public.records (user_id, created_at desc);

-- ★ Row Level Security（必須）：本人の行だけアクセス可能にする
alter table public.records enable row level security;

-- 既存ポリシーがあれば作り直す（再実行できるように）
drop policy if exists "records_select_own" on public.records;
drop policy if exists "records_insert_own" on public.records;
drop policy if exists "records_update_own" on public.records;
drop policy if exists "records_delete_own" on public.records;

create policy "records_select_own" on public.records
  for select using (auth.uid() = user_id);

create policy "records_insert_own" on public.records
  for insert with check (auth.uid() = user_id);

create policy "records_update_own" on public.records
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "records_delete_own" on public.records
  for delete using (auth.uid() = user_id);
