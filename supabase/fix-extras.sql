-- Fotoğraf deposu ve canlı güncellemeyi tamamlar.
-- Supabase > SQL Editor içinde çalıştır. Güvenle tekrar çalıştırılabilir.

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
