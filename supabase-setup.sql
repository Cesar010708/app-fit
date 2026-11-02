-- Ejecuta este SQL en el SQL Editor de tu proyecto Supabase
-- Dashboard → SQL Editor → New query → pegar y ejecutar

-- Tabla de perfiles de usuario
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text default '',
  age integer,
  weight numeric,
  height numeric,
  sex text check (sex in ('male', 'female')),
  activity_level text check (activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  goal text check (goal in ('lose', 'maintain', 'gain')),
  goal_calories integer default 2000,
  goal_protein integer default 150,
  goal_carbs integer default 250,
  goal_fat integer default 65,
  created_at timestamp with time zone default timezone('utc', now())
);

-- Tabla de registros de comida
create table if not exists public.food_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  date date default current_date not null,
  meal_type text check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')) not null,
  food_name text not null,
  calories numeric default 0,
  protein numeric default 0,
  carbs numeric default 0,
  fat numeric default 0,
  photo_url text,
  ai_analyzed boolean default false,
  created_at timestamp with time zone default timezone('utc', now())
);

-- Índice para consultas por usuario y fecha
create index if not exists food_entries_user_date on public.food_entries (user_id, date);

-- Habilitar Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.food_entries enable row level security;

-- Políticas de seguridad para profiles
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Políticas de seguridad para food_entries
create policy "Users can view own entries"
  on public.food_entries for select
  using (auth.uid() = user_id);

create policy "Users can insert own entries"
  on public.food_entries for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own entries"
  on public.food_entries for delete
  using (auth.uid() = user_id);

create policy "Users can update own entries"
  on public.food_entries for update
  using (auth.uid() = user_id);
