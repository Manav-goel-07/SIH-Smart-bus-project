-- Run this in the Supabase SQL editor after creating your project.
-- The bucket remains private; drivers upload into their own user-id folder.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'driver' check (role in ('driver', 'admin')),
  bus_id text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, bus_id)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    case when new.raw_user_meta_data ->> 'role' = 'admin' then 'admin' else 'driver' end,
    new.raw_user_meta_data ->> 'bus_id'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into storage.buckets (id, name, public)
values ('bus-videos', 'bus-videos', false)
on conflict (id) do nothing;

create policy "Drivers can upload their own videos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'bus-videos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Users can view their own videos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'bus-videos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- Promote an authority account after it has signed up:
-- update public.profiles set role = 'admin' where id = '<AUTH_USER_UUID>';
