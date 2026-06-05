-- dentia — 1日あたりの利用上限カウンタ（コスト暴走の防止）
-- Supabase の SQL Editor に貼り付けて実行してください。
-- 実行すると /api/generate の「1日あたりの生成上限」が有効になります。
-- （実行しなくてもアプリは動きます＝フェイルオープン。実行後に上限が効きます）

create table if not exists public.api_usage (
  user_id  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day      date not null default (now() at time zone 'utc')::date,
  count    integer not null default 0,
  primary key (user_id, day)
);

alter table public.api_usage enable row level security;

-- 本人は自分の利用状況を参照できる（増減はRPC経由のみ）
drop policy if exists "api_usage_select_own" on public.api_usage;
create policy "api_usage_select_own" on public.api_usage
  for select using (auth.uid() = user_id);

-- 当日カウントを原子的に +1 して新しい値を返す関数。
-- SECURITY DEFINER で、RLSに関係なく自分の行だけを安全に更新する。
create or replace function public.bump_api_usage()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.api_usage (user_id, day, count)
  values (auth.uid(), (now() at time zone 'utc')::date, 1)
  on conflict (user_id, day)
  do update set count = api_usage.count + 1
  returning count into v_count;
  return v_count;
end;
$$;

revoke all on function public.bump_api_usage() from public;
grant execute on function public.bump_api_usage() to authenticated;
