-- dentia — マルチテナント基盤（医院 = テナント）
-- Supabase の SQL Editor で実行してください。
-- records のアクセスを「本人のみ」→「所属医院のメンバーのみ」に変更し、
-- 既存データは各ユーザーの個人医院へ移行します（後方互換）。
-- フロントは clinic_id 未取得時は従来通り動くため、実行前後でアプリは壊れません。

create extension if not exists pgcrypto;

-- 1) 医院（テナント）
create table if not exists public.clinics (
  id         uuid primary key default gen_random_uuid(),
  name       text not null default 'マイクリニック',
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

-- 2) メンバー（役割: admin=管理者 / staff=スタッフ）
create table if not exists public.clinic_members (
  clinic_id  uuid not null references public.clinics(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'staff' check (role in ('admin','staff')),
  created_at timestamptz not null default now(),
  primary key (clinic_id, user_id)
);
create index if not exists clinic_members_user_idx on public.clinic_members(user_id);

-- 3) records に clinic_id を追加
alter table public.records add column if not exists clinic_id uuid references public.clinics(id) on delete cascade;
create index if not exists records_clinic_created_idx on public.records(clinic_id, created_at desc);

-- 4) RLS再帰を避けるヘルパー（SECURITY DEFINER＝RLSをバイパスして判定）
create or replace function public.is_clinic_member(c uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.clinic_members m where m.clinic_id = c and m.user_id = auth.uid());
$$;
create or replace function public.is_clinic_admin(c uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.clinic_members m where m.clinic_id = c and m.user_id = auth.uid() and m.role = 'admin');
$$;
revoke all on function public.is_clinic_member(uuid) from public;
revoke all on function public.is_clinic_admin(uuid) from public;
grant execute on function public.is_clinic_member(uuid) to authenticated;
grant execute on function public.is_clinic_admin(uuid) to authenticated;

-- 5) ログイン時に呼ぶ：自分の医院IDを返す。無ければ作成し自分を管理者に。
create or replace function public.ensure_clinic()
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_clinic uuid;
begin
  select m.clinic_id into v_clinic
  from public.clinic_members m
  where m.user_id = auth.uid()
  order by m.created_at asc
  limit 1;

  if v_clinic is null then
    insert into public.clinics (name, created_by) values ('マイクリニック', auth.uid())
    returning id into v_clinic;
    insert into public.clinic_members (clinic_id, user_id, role) values (v_clinic, auth.uid(), 'admin');
  end if;
  return v_clinic;
end;
$$;
revoke all on function public.ensure_clinic() from public;
grant execute on function public.ensure_clinic() to authenticated;

-- 6) RLS有効化＋ポリシー
alter table public.clinics enable row level security;
alter table public.clinic_members enable row level security;

-- clinics: メンバーは参照可、管理者は更新可
drop policy if exists "clinics_select_member" on public.clinics;
create policy "clinics_select_member" on public.clinics
  for select using (public.is_clinic_member(id));
drop policy if exists "clinics_update_admin" on public.clinics;
create policy "clinics_update_admin" on public.clinics
  for update using (public.is_clinic_admin(id)) with check (public.is_clinic_admin(id));

-- clinic_members: 同じ医院のメンバーは参照可、管理者は追加/変更/削除可
drop policy if exists "members_select" on public.clinic_members;
create policy "members_select" on public.clinic_members
  for select using (public.is_clinic_member(clinic_id));
drop policy if exists "members_admin_write" on public.clinic_members;
create policy "members_admin_write" on public.clinic_members
  for all using (public.is_clinic_admin(clinic_id)) with check (public.is_clinic_admin(clinic_id));

-- 7) records のRLSを医院ベースへ張り替え（clinic_id が null の行は本人のみ＝後方互換）
drop policy if exists "records_select_own" on public.records;
drop policy if exists "records_insert_own" on public.records;
drop policy if exists "records_update_own" on public.records;
drop policy if exists "records_delete_own" on public.records;

create policy "records_select_clinic" on public.records for select using (
  (clinic_id is not null and public.is_clinic_member(clinic_id))
  or (clinic_id is null and user_id = auth.uid())
);
create policy "records_insert_clinic" on public.records for insert with check (
  user_id = auth.uid()
  and (clinic_id is null or public.is_clinic_member(clinic_id))
);
create policy "records_update_clinic" on public.records for update using (
  (clinic_id is not null and public.is_clinic_member(clinic_id))
  or (clinic_id is null and user_id = auth.uid())
);
create policy "records_delete_clinic" on public.records for delete using (
  (clinic_id is not null and public.is_clinic_member(clinic_id))
  or (clinic_id is null and user_id = auth.uid())
);

-- 8) 既存データの移行：record 所有者ごとに個人医院を作り、records に紐付け
do $$
declare r record; v_clinic uuid;
begin
  for r in select distinct user_id from public.records where clinic_id is null and user_id is not null loop
    select m.clinic_id into v_clinic from public.clinic_members m where m.user_id = r.user_id order by m.created_at asc limit 1;
    if v_clinic is null then
      insert into public.clinics (name, created_by) values ('マイクリニック', r.user_id) returning id into v_clinic;
      insert into public.clinic_members (clinic_id, user_id, role) values (v_clinic, r.user_id, 'admin');
    end if;
    update public.records set clinic_id = v_clinic where user_id = r.user_id and clinic_id is null;
  end loop;
end $$;
