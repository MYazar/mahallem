-- ============================================================
-- Mahallem — ortak mahalle gündemi veritabanı
-- Bu dosyayı Supabase > SQL Editor içinde bir kez çalıştır.
-- ============================================================

-- 1. Duyurular (herkesin gördüğü ortak kayıtlar)
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  description text not null,
  lat double precision not null,
  lng double precision not null,
  photo_url text, -- tek URL veya en fazla 3 URL içeren JSON dizi
  created_at timestamptz not null default now(),
  owner_id uuid not null,
  endorsements int not null default 0,
  comments jsonb not null default '[]'::jsonb
);

alter table public.reports add column if not exists comments jsonb not null default '[]'::jsonb;
alter table public.reports enable row level security;

drop policy if exists "Herkes duyuruları okur" on public.reports;
create policy "Herkes duyuruları okur"
  on public.reports for select using (true);

drop policy if exists "Giriş yapan duyuru ekler" on public.reports;
create policy "Giriş yapan duyuru ekler"
  on public.reports for insert with check (auth.uid() = owner_id);

drop policy if exists "Sahibi duyuruyu siler" on public.reports;
create policy "Sahibi duyuruyu siler"
  on public.reports for delete using (auth.uid() = owner_id);

-- 2. Destekler: kimin hangi duyuruya destek verdiği (tek sefer)
create table if not exists public.report_endorsements (
  report_id uuid not null references public.reports(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (report_id, user_id)
);

alter table public.report_endorsements enable row level security;

drop policy if exists "Destekler herkese açık" on public.report_endorsements;
create policy "Destekler herkese açık"
  on public.report_endorsements for select using (true);

drop policy if exists "Kullanıcı kendi desteğini verir" on public.report_endorsements;
create policy "Kullanıcı kendi desteğini verir"
  on public.report_endorsements for insert with check (auth.uid() = user_id);

drop policy if exists "Kullanıcı kendi desteğini geri alır" on public.report_endorsements;
create policy "Kullanıcı kendi desteğini geri alır"
  on public.report_endorsements for delete using (auth.uid() = user_id);

-- 3. Destek sayısını otomatik güncelle (elle sayaç tutulmaz)
create or replace function public.sync_endorsement_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.reports
    set endorsements = (select count(*) from public.report_endorsements where report_id = new.report_id)
    where id = new.report_id;
    return new;
  end if;

  update public.reports
  set endorsements = (select count(*) from public.report_endorsements where report_id = old.report_id)
  where id = old.report_id;
  return old;
end;
$$;

drop trigger if exists report_endorsements_count on public.report_endorsements;
create trigger report_endorsements_count
  after insert or delete on public.report_endorsements
  for each row execute function public.sync_endorsement_count();

-- 4. Arayüzden çağrılan güvenli işlemler
-- p_user / p_author parametreleri geriye uyumluluk için duruyor; kimlik her zaman
-- oturumdaki kullanıcıdan (auth.uid()) alınır, istemci başkası adına işlem yapamaz.
create or replace function public.endorse_report(p_report_id uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Destek vermek için oturum gerekli.' using errcode = '42501';
  end if;

  insert into public.report_endorsements (report_id, user_id)
  select p_report_id, auth.uid()
  where exists (select 1 from public.reports where id = p_report_id)
  on conflict (report_id, user_id) do nothing;
end;
$$;

create or replace function public.unendorse_report(p_report_id uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Destek geri almak için oturum gerekli.' using errcode = '42501';
  end if;

  delete from public.report_endorsements
  where report_id = p_report_id and user_id = auth.uid();
end;
$$;

create or replace function public.add_comment(p_report_id uuid, p_text text, p_author uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_text text := btrim(coalesce(p_text, ''));
begin
  if auth.uid() is null then
    raise exception 'Yorum yazmak için oturum gerekli.' using errcode = '42501';
  end if;
  if v_text = '' then
    return;
  end if;

  update public.reports
  set comments = coalesce(comments, '[]'::jsonb) || jsonb_build_object(
    'id', gen_random_uuid()::text,
    'authorId', auth.uid()::text,
    'text', left(v_text, 600),
    'createdAt', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  )
  where id = p_report_id;
end;
$$;

-- 5. Fotoğraf deposu (canlı yayından önce oluşturulur; bir hata sonraki adımı engellemesin)
insert into storage.buckets (id, name, public)
values ('report-photos', 'report-photos', true)
on conflict (id) do nothing;

drop policy if exists "Fotoğraflar herkese açık" on storage.objects;
create policy "Fotoğraflar herkese açık"
  on storage.objects for select using (bucket_id = 'report-photos');

drop policy if exists "Giriş yapan fotoğraf yükler" on storage.objects;
create policy "Giriş yapan fotoğraf yükler"
  on storage.objects for insert
  with check (bucket_id = 'report-photos' and auth.uid() is not null);

-- 6. Canlı güncelleme: değişiklikler diğer tarayıcılara anında gelsin
do $$
begin
  alter publication supabase_realtime add table public.reports;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.report_endorsements;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
