-- Create Voice Profiles Table
create table public.voice_profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  system_prompt text not null,
  model text,
  is_default boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS (Row Level Security)
alter table public.voice_profiles enable row level security;

-- Create Policies so users can only manage their own voice profiles
create policy "Users can insert their own voice profiles" on public.voice_profiles for insert with check (auth.uid() = user_id);
create policy "Users can view their own voice profiles" on public.voice_profiles for select using (auth.uid() = user_id);
create policy "Users can update their own voice profiles" on public.voice_profiles for update using (auth.uid() = user_id);
create policy "Users can delete their own voice profiles" on public.voice_profiles for delete using (auth.uid() = user_id);
