-- ==============================================================================
-- TAWI (SCHOOL OPERATING MEMORY) - SUPABASE DATABASE SCHEMA
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Enable UUID extension (if needed)
create extension if not exists "uuid-ossp";

-- 2. LEARNERS TABLE
create table if not exists public.learners (
    id text primary key,
    admission_number text,
    first_name text,
    last_name text,
    full_name text not null,
    class_name text default 'General',
    class_id text default 'general',
    section text default '',
    gender text default '',
    date_of_birth text default '',
    guardian_name text default '',
    guardian_phone text default '',
    email text default '',
    attendance_rate numeric,
    active boolean default true,
    created_at timestamp with time zone default now()
);

-- 3. EVENTS TABLE (School Operating Memory Event Stream)
create table if not exists public.events (
    id text primary key,
    type text not null,                 -- 'attendance', 'assessment', 'classwork', 'incident', 'note'
    action text not null,               -- 'score', 'absent', 'late', 'discipline', 'observation'
    learner_id text references public.learners(id) on delete cascade,
    class_name text,
    class_id text,
    date text not null,                 -- YYYY-MM-DD
    value jsonb default '{}'::jsonb,    -- { score: 18, outOf: 20, subject: 'Math', tag: 'Place Value' }
    metadata jsonb default '{}'::jsonb,
    source text default '',
    created_by_user_id text,
    created_by_name text,
    created_by_role text,
    created_at timestamp with time zone default now()
);

-- 4. Enable Row Level Security (RLS)
alter table public.learners enable row level security;
alter table public.events enable row level security;

-- 5. Policies: Allow authenticated and anon read/write (customized as needed)
create policy "Allow public read on learners" on public.learners
    for select using (true);

create policy "Allow public insert/update on learners" on public.learners
    for all using (true) with check (true);

create policy "Allow public read on events" on public.events
    for select using (true);

create policy "Allow public insert/update on events" on public.events
    for all using (true) with check (true);

-- 6. Indexes for fast searches by class and learner
create index if not exists idx_learners_class on public.learners(class_name);
create index if not exists idx_learners_adm on public.learners(admission_number);
create index if not exists idx_events_learner on public.events(learner_id);
create index if not exists idx_events_date on public.events(date);
create index if not exists idx_events_type on public.events(type);
