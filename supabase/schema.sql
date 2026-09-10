-- Supabase project setup for Smart Bus Intelligence.
-- Run this in the Supabase SQL editor after creating the project.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  role text not null default 'driver' check (role in ('driver', 'admin', 'user')),
  bus_id text,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('driver', 'admin', 'user'));
alter table public.profiles enable row level security;
grant usage on schema public to authenticated;
grant select, update on table public.profiles to authenticated;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select to authenticated using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, bus_id)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    case
      when new.raw_user_meta_data ->> 'role' in ('admin', 'user') then new.raw_user_meta_data ->> 'role'
      else 'driver'
    end,
    new.raw_user_meta_data ->> 'bus_id'
  ) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into storage.buckets (id, name, public)
values ('bus-videos', 'bus-videos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('bus-images', 'bus-images', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('profile-avatars', 'profile-avatars', false)
on conflict (id) do nothing;

drop policy if exists "Drivers can upload their own videos" on storage.objects;
create policy "Drivers can upload their own videos" on storage.objects for insert
  to authenticated with check (bucket_id = 'bus-videos' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "Users can view their own videos" on storage.objects;
create policy "Users can view their own videos" on storage.objects for select
  to authenticated using (bucket_id = 'bus-videos' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "Drivers can upload their own images" on storage.objects;
create policy "Drivers can upload their own images" on storage.objects for insert
  to authenticated with check (bucket_id = 'bus-images' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "Users can view their own images" on storage.objects;
create policy "Users can view their own images" on storage.objects for select
  to authenticated using (bucket_id = 'bus-images' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar" on storage.objects for insert
  to authenticated with check (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "Users can view their own avatar" on storage.objects;
create policy "Users can view their own avatar" on storage.objects for select
  to authenticated using (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));

-- Promote an authority account after signup:
-- update public.profiles set role = 'admin' where id = '<AUTH_USER_UUID>';
