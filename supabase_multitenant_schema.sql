-- ==============================================================================
-- TAWI MULTI-TENANT DATABASE FOUNDATION
-- Standard: PostgreSQL 14+ / Supabase
-- Security: Two-layer (Composite Foreign Keys + Row Level Security)
-- ==============================================================================

-- 0. EXTENSIONS
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ==============================================================================
-- 1. PLATFORM LEVEL (SUPER ADMIN)
-- ==============================================================================

create table if not exists public.platform_admins (
    user_id uuid primary key references auth.users(id) on delete cascade,
    role text not null default 'super_admin' check (role in ('super_admin', 'support')),
    active boolean not null default true,
    created_at timestamptz not null default now()
);

-- ==============================================================================
-- 2. SCHOOL TENANTS & STRUCTURE
-- ==============================================================================

create table if not exists public.schools (
    id uuid primary key default gen_random_uuid(),
    code text not null unique,                  -- e.g. 'ST_MARYS_001'
    name text not null,
    status text not null default 'onboarding' check (status in ('onboarding', 'live', 'suspended')),
    created_at timestamptz not null default now()
);

create table if not exists public.classes (
    id uuid primary key default gen_random_uuid(),
    school_id uuid not null references public.schools(id) on delete cascade,
    name text not null,                         -- e.g. 'Grade 2 Red'
    grade_level text not null,                  -- e.g. 'Grade 2'
    stream text default '',                     -- e.g. 'Red'
    created_at timestamptz not null default now(),
    constraint uq_classes_school_id unique (school_id, id)
);

-- ==============================================================================
-- 3. MEMBERSHIPS & TEACHER ASSIGNMENTS
-- ==============================================================================

create table if not exists public.school_members (
    id uuid primary key default gen_random_uuid(),
    school_id uuid not null references public.schools(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null check (role in ('headteacher', 'teacher')),
    status text not null default 'active' check (status in ('active', 'inactive')),
    created_at timestamptz not null default now(),
    constraint uq_school_members_school_user unique (school_id, user_id)
);

create table if not exists public.class_memberships (
    id uuid primary key default gen_random_uuid(),
    school_id uuid not null,
    class_id uuid not null,
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null default 'class_teacher' check (role in ('class_teacher', 'subject_teacher', 'assistant')),
    created_at timestamptz not null default now(),
    constraint fk_class_memberships_class foreign key (school_id, class_id)
        references public.classes (school_id, id) on delete cascade,
    constraint uq_class_memberships unique (school_id, class_id, user_id)
);

-- ==============================================================================
-- 4. LEARNERS
-- ==============================================================================

create table if not exists public.learners (
    id uuid primary key default gen_random_uuid(),
    school_id uuid not null,
    class_id uuid not null,
    admission_number text not null,
    full_name text not null,
    gender text default '',
    date_of_birth date,
    guardian_name text default '',
    guardian_phone text default '',
    active boolean not null default true,
    created_at timestamptz not null default now(),
    constraint fk_learners_class foreign key (school_id, class_id)
        references public.classes (school_id, id) on delete restrict,
    constraint uq_learners_school_id unique (school_id, id),
    constraint uq_learners_school_adm unique (school_id, admission_number)
);

-- ==============================================================================
-- 5. ATTENDANCE: SESSIONS & RECORDS
-- ==============================================================================

create table if not exists public.attendance_sessions (
    id uuid primary key default gen_random_uuid(),
    school_id uuid not null,
    class_id uuid not null,
    date date not null,
    recorded_by uuid not null references auth.users(id),
    submitted_at timestamptz not null default now(),
    constraint fk_attendance_sessions_class foreign key (school_id, class_id)
        references public.classes (school_id, id) on delete cascade,
    constraint uq_attendance_sessions_school_id unique (school_id, id),
    constraint uq_attendance_sessions_daily unique (school_id, class_id, date)
);

create table if not exists public.attendance_records (
    id uuid primary key default gen_random_uuid(),
    school_id uuid not null,
    session_id uuid not null,
    learner_id uuid not null,
    status text not null check (status in ('present', 'absent', 'late', 'excused')),
    constraint fk_attendance_records_session foreign key (school_id, session_id)
        references public.attendance_sessions (school_id, id) on delete cascade,
    constraint fk_attendance_records_learner foreign key (school_id, learner_id)
        references public.learners (school_id, id) on delete cascade,
    constraint uq_attendance_records_session_learner unique (session_id, learner_id)
);

-- ==============================================================================
-- 6. ASSESSMENTS & RESULTS
-- ==============================================================================

create table if not exists public.assessments (
    id uuid primary key default gen_random_uuid(),
    school_id uuid not null,
    class_id uuid not null,
    subject text not null,
    title text not null,
    out_of numeric not null default 100 check (out_of > 0),
    date date not null,
    created_by uuid not null references auth.users(id),
    created_at timestamptz not null default now(),
    constraint fk_assessments_class foreign key (school_id, class_id)
        references public.classes (school_id, id) on delete cascade,
    constraint uq_assessments_school_id unique (school_id, id)
);

create table if not exists public.assessment_results (
    id uuid primary key default gen_random_uuid(),
    school_id uuid not null,
    assessment_id uuid not null,
    learner_id uuid not null,
    score numeric not null check (score >= 0),
    mistake_tag text,
    constraint fk_assessment_results_assessment foreign key (school_id, assessment_id)
        references public.assessments (school_id, id) on delete cascade,
    constraint fk_assessment_results_learner foreign key (school_id, learner_id)
        references public.learners (school_id, id) on delete cascade,
    constraint uq_assessment_results_learner unique (assessment_id, learner_id)
);

-- ==============================================================================
-- 7. OBSERVATIONS, BEHAVIOUR & INTERVENTIONS
-- ==============================================================================

create table if not exists public.observations (
    id uuid primary key default gen_random_uuid(),
    school_id uuid not null,
    learner_id uuid not null,
    teacher_id uuid not null references auth.users(id),
    subject text,
    topic text,
    notes text not null,
    date date not null,
    created_at timestamptz not null default now(),
    constraint fk_observations_learner foreign key (school_id, learner_id)
        references public.learners (school_id, id) on delete cascade
);

create table if not exists public.behaviour_records (
    id uuid primary key default gen_random_uuid(),
    school_id uuid not null,
    learner_id uuid not null,
    reported_by uuid not null references auth.users(id),
    action_type text not null check (action_type in ('discipline', 'commendation', 'office_referral')),
    details text not null,
    date date not null,
    created_at timestamptz not null default now(),
    constraint fk_behaviour_learner foreign key (school_id, learner_id)
        references public.learners (school_id, id) on delete cascade
);

create table if not exists public.interventions (
    id uuid primary key default gen_random_uuid(),
    school_id uuid not null,
    learner_id uuid not null,
    initiated_by uuid not null references auth.users(id),
    target_skill text not null,
    plan_description text not null,
    status text not null default 'active' check (status in ('active', 'completed', 'reviewed')),
    start_date date not null,
    review_date date,
    constraint fk_interventions_learner foreign key (school_id, learner_id)
        references public.learners (school_id, id) on delete cascade
);

-- ==============================================================================
-- 8. UNIFIED SCHOOL MEMORY & AUDIT LOGS
-- ==============================================================================

create table if not exists public.events (
    id uuid primary key default gen_random_uuid(),
    school_id uuid not null references public.schools(id) on delete cascade,
    class_id uuid references public.classes(id) on delete set null,
    learner_id uuid references public.learners(id) on delete cascade,
    type text not null,                         -- 'attendance', 'assessment', 'observation', 'incident'
    action text not null,                       -- 'absent', 'score', 'note', 'discipline'
    date date not null,
    value jsonb not null default '{}'::jsonb,
    source text default '',
    created_by_user_id uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id),
    school_id uuid references public.schools(id),
    action text not null,                       -- 'bulk_import_learners', 'create_school', etc.
    details jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

-- ==============================================================================
-- 9. PERFORMANCE INDEXES
-- ==============================================================================

create index if not exists idx_classes_school on public.classes(school_id);
create index if not exists idx_school_members_lookup on public.school_members(user_id, school_id);
create index if not exists idx_class_memberships_lookup on public.class_memberships(user_id, class_id);
create index if not exists idx_learners_school_class on public.learners(school_id, class_id);
create index if not exists idx_learners_adm on public.learners(school_id, admission_number);
create index if not exists idx_attendance_sessions_query on public.attendance_sessions(school_id, class_id, date);
create index if not exists idx_attendance_records_lookup on public.attendance_records(school_id, learner_id);
create index if not exists idx_assessments_class on public.assessments(school_id, class_id);
create index if not exists idx_assessment_results_learner on public.assessment_results(school_id, learner_id);
create index if not exists idx_events_learner on public.events(school_id, learner_id);
create index if not exists idx_events_date on public.events(school_id, date);

-- ==============================================================================
-- 10. ROW LEVEL SECURITY (RLS) HELPER FUNCTIONS
-- ==============================================================================

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer as $$
    select exists (
        select 1 from public.platform_admins
        where user_id = auth.uid() and active = true
    );
$$;

create or replace function public.is_school_member(p_school_id uuid)
returns boolean language sql stable security definer as $$
    select exists (
        select 1 from public.school_members
        where user_id = auth.uid()
          and school_id = p_school_id
          and status = 'active'
    );
$$;

create or replace function public.is_headteacher(p_school_id uuid)
returns boolean language sql stable security definer as $$
    select exists (
        select 1 from public.school_members
        where user_id = auth.uid()
          and school_id = p_school_id
          and role = 'headteacher'
          and status = 'active'
    );
$$;

create or replace function public.is_class_teacher(p_school_id uuid, p_class_id uuid)
returns boolean language sql stable security definer as $$
    select exists (
        select 1 from public.class_memberships
        where user_id = auth.uid()
          and school_id = p_school_id
          and class_id = p_class_id
    );
$$;

-- ==============================================================================
-- 11. ROW LEVEL SECURITY POLICIES
-- ==============================================================================

alter table public.platform_admins enable row level security;
alter table public.schools enable row level security;
alter table public.classes enable row level security;
alter table public.school_members enable row level security;
alter table public.class_memberships enable row level security;
alter table public.learners enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.attendance_records enable row level security;
alter table public.assessments enable row level security;
alter table public.assessment_results enable row level security;
alter table public.observations enable row level security;
alter table public.behaviour_records enable row level security;
alter table public.interventions enable row level security;
alter table public.events enable row level security;
alter table public.audit_logs enable row level security;

-- 11.1 PLATFORM ADMINS
create policy "Platform admins read self or all if admin"
    on public.platform_admins for select
    using (user_id = auth.uid() or public.is_platform_admin());

-- 11.2 SCHOOLS
create policy "Schools are readable by platform admin or school members"
    on public.schools for select
    using (public.is_platform_admin() or public.is_school_member(id));

create policy "Schools can only be created/updated by platform admin"
    on public.schools for all
    using (public.is_platform_admin())
    with check (public.is_platform_admin());

-- 11.3 CLASSES
create policy "Classes read by school members or platform admin"
    on public.classes for select
    using (public.is_platform_admin() or public.is_school_member(school_id));

create policy "Classes modified by platform admin or headteacher"
    on public.classes for all
    using (public.is_platform_admin() or public.is_headteacher(school_id))
    with check (public.is_platform_admin() or public.is_headteacher(school_id));

-- 11.4 SCHOOL MEMBERS & CLASS MEMBERSHIPS
create policy "School members viewable by school members or platform admin"
    on public.school_members for select
    using (public.is_platform_admin() or public.is_school_member(school_id));

create policy "School members modified by platform admin or headteacher"
    on public.school_members for all
    using (public.is_platform_admin() or public.is_headteacher(school_id))
    with check (public.is_platform_admin() or public.is_headteacher(school_id));

create policy "Class memberships viewable by school members or platform admin"
    on public.class_memberships for select
    using (public.is_platform_admin() or public.is_school_member(school_id));

create policy "Class memberships modified by platform admin or headteacher"
    on public.class_memberships for all
    using (public.is_platform_admin() or public.is_headteacher(school_id))
    with check (public.is_platform_admin() or public.is_headteacher(school_id));

-- 11.5 LEARNERS
create policy "Learners read policy"
    on public.learners for select
    using (
        public.is_platform_admin()
        or public.is_headteacher(school_id)
        or public.is_class_teacher(school_id, class_id)
    );

create policy "Learners insert/update policy"
    on public.learners for all
    using (
        public.is_platform_admin()
        or public.is_headteacher(school_id)
        or public.is_class_teacher(school_id, class_id)
    )
    with check (
        public.is_platform_admin()
        or public.is_headteacher(school_id)
        or public.is_class_teacher(school_id, class_id)
    );

-- 11.6 ATTENDANCE
create policy "Attendance sessions read policy"
    on public.attendance_sessions for select
    using (
        public.is_platform_admin()
        or public.is_headteacher(school_id)
        or public.is_class_teacher(school_id, class_id)
    );

create policy "Attendance sessions insert policy"
    on public.attendance_sessions for insert
    with check (
        public.is_platform_admin()
        or public.is_headteacher(school_id)
        or public.is_class_teacher(school_id, class_id)
    );

create policy "Attendance records read policy"
    on public.attendance_records for select
    using (
        public.is_platform_admin()
        or public.is_headteacher(school_id)
        or public.is_school_member(school_id)
    );

create policy "Attendance records insert/update policy"
    on public.attendance_records for all
    using (
        public.is_platform_admin()
        or public.is_headteacher(school_id)
        or public.is_school_member(school_id)
    )
    with check (
        public.is_platform_admin()
        or public.is_headteacher(school_id)
        or public.is_school_member(school_id)
    );

-- 11.7 ASSESSMENTS & RESULTS
create policy "Assessments read policy"
    on public.assessments for select
    using (
        public.is_platform_admin()
        or public.is_headteacher(school_id)
        or public.is_class_teacher(school_id, class_id)
    );

create policy "Assessments write policy"
    on public.assessments for all
    using (
        public.is_platform_admin()
        or public.is_headteacher(school_id)
        or public.is_class_teacher(school_id, class_id)
    )
    with check (
        public.is_platform_admin()
        or public.is_headteacher(school_id)
        or public.is_class_teacher(school_id, class_id)
    );

create policy "Assessment results read policy"
    on public.assessment_results for select
    using (
        public.is_platform_admin()
        or public.is_headteacher(school_id)
        or public.is_school_member(school_id)
    );

create policy "Assessment results write policy"
    on public.assessment_results for all
    using (
        public.is_platform_admin()
        or public.is_headteacher(school_id)
        or public.is_school_member(school_id)
    )
    with check (
        public.is_platform_admin()
        or public.is_headteacher(school_id)
        or public.is_school_member(school_id)
    );

-- 11.8 OBSERVATIONS, BEHAVIOUR & EVENTS
create policy "Observations read policy"
    on public.observations for select
    using (public.is_platform_admin() or public.is_school_member(school_id));

create policy "Observations write policy"
    on public.observations for insert
    with check (public.is_platform_admin() or public.is_school_member(school_id));

create policy "Behaviour read policy"
    on public.behaviour_records for select
    using (public.is_platform_admin() or public.is_school_member(school_id));

create policy "Behaviour write policy"
    on public.behaviour_records for insert
    with check (public.is_platform_admin() or public.is_school_member(school_id));

create policy "Events read policy"
    on public.events for select
    using (
        public.is_platform_admin()
        or public.is_headteacher(school_id)
        or (class_id is not null and public.is_class_teacher(school_id, class_id))
        or public.is_school_member(school_id)
    );

create policy "Events write policy"
    on public.events for insert
    with check (public.is_platform_admin() or public.is_school_member(school_id));

-- ==============================================================================
-- 12. TRANSACTIONAL BULK IMPORT RPC (SMART SHEET)
-- ==============================================================================

create or replace function public.import_learners_batch(
    p_school_id uuid,
    p_class_id uuid,
    p_learners jsonb
)
returns jsonb
language plpgsql
security definer
as $$
declare
    v_item jsonb;
    v_inserted_count int := 0;
begin
    -- 1. Authorization check: must be platform admin or headteacher of this school
    if not (public.is_platform_admin() or public.is_headteacher(p_school_id)) then
        raise exception 'Unauthorized: Only Super Admin or Headteacher can perform bulk imports.';
    end if;

    -- 2. Verify class belongs to the specified school
    if not exists (select 1 from public.classes where school_id = p_school_id and id = p_class_id) then
        raise exception 'Invalid Class: Specified class does not belong to this school.';
    end if;

    -- 3. Transactional iteration: all-or-nothing
    for v_item in select * from jsonb_array_elements(p_learners) loop
        insert into public.learners (
            school_id,
            class_id,
            admission_number,
            full_name,
            gender,
            date_of_birth,
            guardian_name,
            guardian_phone
        ) values (
            p_school_id,
            p_class_id,
            v_item->>'admission_number',
            v_item->>'full_name',
            coalesce(v_item->>'gender', ''),
            case when (v_item->>'date_of_birth') is not null and (v_item->>'date_of_birth') != ''
                 then (v_item->>'date_of_birth')::date else null end,
            coalesce(v_item->>'guardian_name', ''),
            coalesce(v_item->>'guardian_phone', '')
        );
        v_inserted_count := v_inserted_count + 1;
    end loop;

    -- 4. Audit Log
    insert into public.audit_logs (user_id, school_id, action, details)
    values (
        auth.uid(),
        p_school_id,
        'bulk_import_learners',
        jsonb_build_object('class_id', p_class_id, 'count', v_inserted_count)
    );

    return jsonb_build_object(
        'success', true,
        'imported_count', v_inserted_count,
        'school_id', p_school_id,
        'class_id', p_class_id
    );
end;
$$;
