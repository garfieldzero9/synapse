# Supabase Setup Guide for Lumina

To make the AI magic happen, we need to set up the backend infrastructure on Supabase. Follow these steps:

## 1. Create a Supabase Project
1. Go to [database.new](https://database.new) and create a new project (it's free).
2. Once the project is ready, go to **Project Settings > API**.
3. Copy the **Project URL** and **anon public key**.
4. Paste them into the `.env` file in the root of the project:
   ```env
   VITE_SUPABASE_URL=your-copied-url
   VITE_SUPABASE_ANON_KEY=your-copied-anon-key
   ```

## 2. Set up the Database Schema
1. In your Supabase Dashboard, go to the **SQL Editor**.
2. Paste and run the following SQL to create the tables:

```sql
-- Create Ideas Table
create table public.ideas (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  raw_text text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Generated Content Table
create table public.generated_content (
  id uuid default gen_random_uuid() primary key,
  idea_id uuid references public.ideas on delete cascade not null,
  user_id uuid references auth.users not null,
  content_type text not null, -- e.g., 'twitter', 'linkedin'
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS (Row Level Security)
alter table public.ideas enable row level security;
alter table public.generated_content enable row level security;

-- Create Policies so users can only see their own data
create policy "Users can insert their own ideas" on public.ideas for insert with check (auth.uid() = user_id);
create policy "Users can view their own ideas" on public.ideas for select using (auth.uid() = user_id);

create policy "Users can insert their own generated content" on public.generated_content for insert with check (auth.uid() = user_id);
create policy "Users can view their own generated content" on public.generated_content for select using (auth.uid() = user_id);
```

## 3. Enable Authentication
1. Go to **Authentication > Providers** in the Supabase Dashboard.
2. Ensure **Email** is enabled. (You can turn off email confirmations for now to make testing faster by going to Auth > Email Templates and unchecking "Confirm email").

## 4. Notify Me!
Once you have done these 3 steps and updated the `.env` file, let me know! I will then connect the Frontend Auth and the Input Dashboard to your live database.
