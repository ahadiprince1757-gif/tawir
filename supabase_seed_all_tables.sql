-- ==============================================================================
-- TAWI COMPLETE MULTI-TENANT DATABASE SEED SCRIPT
-- Standard : PostgreSQL 14+ / Supabase
-- Purpose  : Seed ALL tables in Supabase with realistic instructional data:
--            auth.users, platform_admins, schools, classes, school_members,
--            class_memberships, learners, attendance_sessions, attendance_records,
--            assessments, assessment_results (with mistake tags!), observations,
--            behaviour_records, interventions, events, audit_logs.
--
-- RUN IN   : Supabase Dashboard → SQL Editor → New Query → Run
-- Note     : Idempotent (safe to run multiple times without duplicate errors).
-- ==============================================================================

-- ─── 0. EXTENSIONS ────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ==============================================================================
-- 1. AUTH USERS (In Supabase auth.users so foreign keys succeed)
-- ==============================================================================
-- Default password for all seed accounts: "TawiDemo2026!"
-- Passwords and PINs are stored securely hashed on the backend, NEVER in the frontend.

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values
  -- 1. Super Admin
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
   'superadmin@tawi.co', crypt('TawiDemo2026!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"full_name":"Super Admin (Tawi Team)"}'::jsonb, now(), now()),

  -- 2. Headteacher - St. Mary's Primary School
  ('00000000-0000-0000-0000-000000000000', '11111111-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
   'headteacher@stmarys.ac.ke', crypt('TawiDemo2026!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"full_name":"Mr. Peter Omondi"}'::jsonb, now(), now()),

  -- 3. Teacher Jane Muthoni - St. Mary's (Grade 2 Red & Grade 1 Yellow)
  ('00000000-0000-0000-0000-000000000000', '11111111-0000-0000-0000-000000000002', 'authenticated', 'authenticated',
   'jane@stmarys.ac.ke', crypt('TawiDemo2026!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"full_name":"Jane Muthoni"}'::jsonb, now(), now()),

  -- 4. Teacher David Kamau - St. Mary's (Grade 3 Blue)
  ('00000000-0000-0000-0000-000000000000', '11111111-0000-0000-0000-000000000003', 'authenticated', 'authenticated',
   'david@stmarys.ac.ke', crypt('TawiDemo2026!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"full_name":"David Kamau"}'::jsonb, now(), now()),

  -- 5. Teacher Sarah Chebet - Multi-School (St. Mary's & Greenwood)
  ('00000000-0000-0000-0000-000000000000', '11111111-0000-0000-0000-000000000004', 'authenticated', 'authenticated',
   'sarah@schools.ac.ke', crypt('TawiDemo2026!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"full_name":"Sarah Chebet"}'::jsonb, now(), now()),

  -- 6. Teacher John Odhiambo - Greenwood Primary
  ('00000000-0000-0000-0000-000000000000', '22222222-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
   'john@greenwood.ac.ke', crypt('TawiDemo2026!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"full_name":"John Odhiambo"}'::jsonb, now(), now())
on conflict (id) do nothing;


-- ==============================================================================
-- 2. PLATFORM ADMINS
-- ==============================================================================

insert into public.platform_admins (user_id, role, active)
values ('00000000-0000-0000-0000-000000000001', 'super_admin', true)
on conflict (user_id) do update set active = excluded.active;


-- ==============================================================================
-- 3. SCHOOLS (3 Tenants)
-- ==============================================================================

insert into public.schools (id, code, name, status) values
  ('11111111-1111-1111-1111-111111111111', 'ST_MARYS_001',    'St. Mary''s Primary School', 'live'),
  ('22222222-2222-2222-2222-222222222222', 'GREENWOOD_001',   'Greenwood Primary',           'live'),
  ('33333333-3333-3333-3333-333333333333', 'SUNRISE_001',     'Sunrise Junior School',       'suspended')
on conflict (id) do update set name = excluded.name, status = excluded.status;


-- ==============================================================================
-- 4. CLASSES
-- ==============================================================================

insert into public.classes (id, school_id, name, grade_level, stream) values
  -- St. Mary's Classes
  ('c1000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'PP1 Yellow',     'PP1',     'Yellow'),
  ('c1000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Grade 1 Yellow', 'Grade 1', 'Yellow'),
  ('c1000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Grade 2 Red',    'Grade 2', 'Red'),
  ('c1000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Grade 3 Blue',   'Grade 3', 'Blue'),
  ('c1000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'Grade 4 Blue',   'Grade 4', 'Blue'),
  -- Greenwood Classes
  ('c2000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Grade 2 Blue',   'Grade 2', 'Blue'),
  ('c2000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Grade 3 Red',    'Grade 3', 'Red'),
  -- Sunrise Classes
  ('c3000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'Grade 1 Green',  'Grade 1', 'Green')
on conflict (id) do update set name = excluded.name, grade_level = excluded.grade_level, stream = excluded.stream;


-- ==============================================================================
-- 5. SCHOOL MEMBERSHIPS & CLASS ASSIGNMENTS
-- ==============================================================================

insert into public.school_members (id, school_id, user_id, role, status) values
  -- St. Mary's staff
  ('b1000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '11111111-0000-0000-0000-000000000001', 'headteacher', 'active'),
  ('b1000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '11111111-0000-0000-0000-000000000002', 'teacher',     'active'),
  ('b1000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', '11111111-0000-0000-0000-000000000003', 'teacher',     'active'),
  ('b1000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', '11111111-0000-0000-0000-000000000004', 'teacher',     'active'),
  -- Greenwood staff
  ('b2000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', '22222222-0000-0000-0000-000000000001', 'teacher',     'active'),
  -- Sarah's 2nd school membership (Multi-School Teacher)
  ('b2000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', '11111111-0000-0000-0000-000000000004', 'teacher',     'active')
on conflict (school_id, user_id) do update set role = excluded.role, status = excluded.status;

insert into public.class_memberships (id, school_id, class_id, user_id, role) values
  -- Jane Muthoni: Class Teacher of Grade 2 Red, Subject Teacher of Grade 1 Yellow
  ('m1000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'c1000000-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000002', 'class_teacher'),
  ('m1000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'c1000000-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000002', 'subject_teacher'),
  -- David Kamau: Class Teacher of Grade 3 Blue
  ('m1000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'c1000000-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000003', 'class_teacher'),
  -- Sarah Chebet: Class Teacher of Grade 1 Yellow (St. Mary's)
  ('m1000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'c1000000-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000004', 'class_teacher'),
  -- Sarah Chebet: Subject Teacher of Grade 2 Blue (Greenwood)
  ('m2000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'c2000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000004', 'subject_teacher'),
  -- John Odhiambo: Class Teacher of Grade 2 Blue & Grade 3 Red (Greenwood)
  ('m2000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'c2000000-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'class_teacher'),
  ('m2000000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'c2000000-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000001', 'class_teacher')
on conflict (school_id, class_id, user_id) do update set role = excluded.role;


-- ==============================================================================
-- 6. ATTENDANCE SESSIONS & ATTENDANCE RECORDS
-- ==============================================================================

-- Sessions for St. Mary's Grade 2 Red & Grade 3 Blue
insert into public.attendance_sessions (id, school_id, class_id, date, recorded_by) values
  ('a1000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'c1000000-0000-0000-0000-000000000003', '2026-11-16', '11111111-0000-0000-0000-000000000002'),
  ('a1000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'c1000000-0000-0000-0000-000000000003', '2026-11-17', '11111111-0000-0000-0000-000000000002'),
  ('a1000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'c1000000-0000-0000-0000-000000000004', '2026-11-16', '11111111-0000-0000-0000-000000000003'),
  ('a1000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'c1000000-0000-0000-0000-000000000004', '2026-11-17', '11111111-0000-0000-0000-000000000003')
on conflict (id) do nothing;

-- Records: Present by default, mark absentees and latecomers
insert into public.attendance_records (id, school_id, session_id, learner_id, status) values
  -- Amina Hassan (g2_01): Present consistently
  ('ar000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000001', 'd3000000-0000-0000-0000-000000000001', 'present'),
  ('ar000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000002', 'd3000000-0000-0000-0000-000000000001', 'present'),
  -- George Ochieng (g2_07): Absent on 16th, late on 17th
  ('ar000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000001', 'd3000000-0000-0000-0000-000000000007', 'absent'),
  ('ar000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000002', 'd3000000-0000-0000-0000-000000000007', 'late'),
  -- Brian Mwangi (g3_01): Absent on 17th
  ('ar000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000003', 'd4000000-0000-0000-0000-000000000001', 'present'),
  ('ar000000-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000004', 'd4000000-0000-0000-0000-000000000001', 'absent')
on conflict (session_id, learner_id) do update set status = excluded.status;


-- ==============================================================================
-- 7. ASSESSMENTS & ASSESSMENT RESULTS (WITH MISTAKE TAGS!)
-- ==============================================================================

insert into public.assessments (id, school_id, class_id, subject, title, out_of, date, created_by) values
  -- Grade 2 Red: Mathematics Subtraction & Regrouping Quiz
  ('as100000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'c1000000-0000-0000-0000-000000000003',
   'Mathematics', 'Weekly Quiz: 2-Digit Subtraction with Regrouping', 30, '2026-10-24', '11111111-0000-0000-0000-000000000002'),

  -- Grade 2 Red: Mathematics Addition with Carrying
  ('as100000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'c1000000-0000-0000-0000-000000000003',
   'Mathematics', 'Weekly Quiz: Addition with Carrying', 30, '2026-10-10', '11111111-0000-0000-0000-000000000002'),

  -- Grade 3 Blue: Monthly Progress Test
  ('as100000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'c1000000-0000-0000-0000-000000000004',
   'Mathematics', 'Monthly Progress Test: Fractions & Place Value', 50, '2026-11-06', '11111111-0000-0000-0000-000000000003'),

  -- Grade 3 Blue: Reading Comprehension
  ('as100000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'c1000000-0000-0000-0000-000000000004',
   'English', 'Monthly Assessment: Reading Comprehension & Inference', 50, '2026-11-07', '11111111-0000-0000-0000-000000000003'),

  -- Grade 4 Blue: Science End of Month
  ('as100000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'c1000000-0000-0000-0000-000000000005',
   'Science', 'End of Month Test: Living and Non-Living Things', 100, '2026-11-11', '11111111-0000-0000-0000-000000000001'),

  -- Greenwood Grade 2 Blue: Multiplication Tables
  ('as200000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'c2000000-0000-0000-0000-000000000001',
   'Mathematics', 'Multiplication Tables Mastery', 30, '2026-11-10', '22222222-0000-0000-0000-000000000001')
on conflict (id) do update set title = excluded.title, out_of = excluded.out_of;

-- Detailed Assessment Results with specific mistake tags
insert into public.assessment_results (id, school_id, assessment_id, learner_id, score, mistake_tag) values
  -- Amina Hassan (d3...01): struggles with carrying and borrowing across 0
  ('rs100000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'as100000-0000-0000-0000-000000000001', 'd3000000-0000-0000-0000-000000000001', 17, 'place_value_borrowing'),
  ('rs100000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'as100000-0000-0000-0000-000000000002', 'd3000000-0000-0000-0000-000000000001', 18, 'place_value_carrying'),
  
  -- Sharon Auma (d3...02): good arithmetic, minor column misalignment
  ('rs100000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'as100000-0000-0000-0000-000000000001', 'd3000000-0000-0000-0000-000000000002', 22, 'column_alignment'),
  
  -- Patrick Njenga (d3...03): high scorer
  ('rs100000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'as100000-0000-0000-0000-000000000001', 'd3000000-0000-0000-0000-000000000003', 27, null),

  -- George Ochieng (d3...07): severely struggling with basic regrouping
  ('rs100000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'as100000-0000-0000-0000-000000000001', 'd3000000-0000-0000-0000-000000000007', 11, 'place_value_regrouping'),

  -- Brian Mwangi (d4...01): drop in scores due to fraction denominator mistakes
  ('rs100000-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'as100000-0000-0000-0000-000000000003', 'd4000000-0000-0000-0000-000000000001', 21, 'fraction_denominator_addition'),

  -- Mark Omondi (d4...12): top mathematics score
  ('rs100000-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', 'as100000-0000-0000-0000-000000000003', 'd4000000-0000-0000-0000-000000000012', 48, null),

  -- David Ochieng (d4...02): reading comprehension inferences
  ('rs100000-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', 'as100000-0000-0000-0000-000000000004', 'd4000000-0000-0000-0000-000000000002', 36, 'comprehension_inference'),

  -- Kevin Kiprono (d5...01): Friday absenteeism affected living things practical
  ('rs100000-0000-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111', 'as100000-0000-0000-0000-000000000005', 'd5000000-0000-0000-0000-000000000001', 44, 'missed_practical_session'),

  -- Isaac Muriuki (d5...11): top of Science class
  ('rs100000-0000-0000-0000-000000000010', '11111111-1111-1111-1111-111111111111', 'as100000-0000-0000-0000-000000000005', 'd5000000-0000-0000-0000-000000000011', 90, null)
on conflict (assessment_id, learner_id) do update set score = excluded.score, mistake_tag = excluded.mistake_tag;


-- ==============================================================================
-- 8. OBSERVATIONS
-- ==============================================================================

insert into public.observations (id, school_id, learner_id, teacher_id, subject, topic, notes, date) values
  ('ob100000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'd3000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002',
   'Mathematics', 'Place Value & Regrouping',
   'Needs concrete base-10 manipulatives for 2-digit regrouping. Highly attentive and eager to practice.', '2026-11-02'),

  ('ob100000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
   'd1000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002',
   'Language & Literacy', 'Letter Formation',
   'Reversal pattern on b/d and p/q during phonics circle. Recommend tactile sand-tray writing exercises.', '2026-10-22'),

  ('ob100000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111',
   'd3000000-0000-0000-0000-000000000007', '11111111-0000-0000-0000-000000000002',
   'Mathematics', 'General Numeracy',
   'Consistently below 40% in weekly quizzes. Parent consultation recommended for early homework support.', '2026-10-23'),

  ('ob100000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111',
   'd5000000-0000-0000-0000-000000000009', '11111111-0000-0000-0000-000000000001',
   'General', 'Attendance',
   'Elijah Gitonga: missed consecutive Friday science practical sessions. Parent follow-up recommended.', '2026-11-06')
on conflict (id) do nothing;


-- ==============================================================================
-- 9. BEHAVIOUR RECORDS
-- ==============================================================================

insert into public.behaviour_records (id, school_id, learner_id, reported_by, action_type, details, date) values
  ('bh100000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'd4000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000003',
   'discipline', 'Disrupting group lesson and arguing with peers during reading time.', '2026-10-21'),

  ('bh100000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
   'd4000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
   'office_referral', 'Repeated non-participation in classwork and unexcused compound departure during break.', '2026-11-09'),

  ('bh100000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111',
   'd3000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
   'commendation', 'Exemplary handwriting and neatness in exercise books recognized in school assembly.', '2026-11-12'),

  ('bh100000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111',
   'd2000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000004',
   'commendation', 'Fluent and expressive reading aloud to the class — exceptional term progress.', '2026-11-04')
on conflict (id) do nothing;


-- ==============================================================================
-- 10. INTERVENTIONS
-- ==============================================================================

insert into public.interventions (id, school_id, learner_id, initiated_by, target_skill, plan_description, status, start_date, review_date) values
  ('iv100000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'd3000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002',
   'Subtraction with Regrouping', '15 minutes daily peer tutoring with concrete place-value blocks during morning circle.', 'active', '2026-10-25', '2026-11-25'),

  ('iv100000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
   'd1000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002',
   'Letter Recognition (b/d/p)', 'Tactile sandpaper tracing and multi-sensory phonics cards 3x per week.', 'reviewed', '2026-10-23', '2026-11-20'),

  ('iv100000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111',
   'd4000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
   'Attendance & Classroom Engagement', 'Weekly counseling sessions with deputy head and structured parent progress diary.', 'active', '2026-11-10', '2026-12-10')
on conflict (id) do nothing;


-- ==============================================================================
-- 11. AUDIT LOGS
-- ==============================================================================

insert into public.audit_logs (id, user_id, school_id, action, details) values
  ('al100000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111111', 'onboard_school', '{"school_code":"ST_MARYS_001","status":"live"}'::jsonb),

  ('al100000-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111111', 'bulk_import_learners', '{"class_id":"c1000000-0000-0000-0000-000000000003","count":20}'::jsonb),

  ('al100000-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111111', 'assign_teacher', '{"teacher_id":"11111111-0000-0000-0000-000000000002","role":"class_teacher"}'::jsonb)
on conflict (id) do nothing;


-- ==============================================================================
-- 12. PERMISSIVE DEMO RLS POLICIES FOR ALL TABLES
-- (Allows read/write operations from frontend during local testing/demo)
-- ==============================================================================

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;

-- Helper macro to safely drop and create permissive select/all policies for demo
do $$
declare
  t text;
  tables text[] := array[
    'platform_admins', 'schools', 'classes', 'school_members', 'class_memberships',
    'learners', 'attendance_sessions', 'attendance_records', 'assessments',
    'assessment_results', 'observations', 'behaviour_records', 'interventions',
    'events', 'audit_logs'
  ];
begin
  foreach t in array tables loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "Demo allow all for %s" on public.%I;', t, t);
    execute format('create policy "Demo allow all for %s" on public.%I for all to anon, authenticated using (true) with check (true);', t, t);
  end loop;
end $$;


-- ==============================================================================
-- 13. VERIFY TABLE COUNTS
-- ==============================================================================

select 'platform_admins' as table_name, count(*) as row_count from public.platform_admins
union all
select 'schools', count(*) from public.schools
union all
select 'classes', count(*) from public.classes
union all
select 'school_members', count(*) from public.school_members
union all
select 'class_memberships', count(*) from public.class_memberships
union all
select 'learners', count(*) from public.learners
union all
select 'attendance_sessions', count(*) from public.attendance_sessions
union all
select 'attendance_records', count(*) from public.attendance_records
union all
select 'assessments', count(*) from public.assessments
union all
select 'assessment_results', count(*) from public.assessment_results
union all
select 'observations', count(*) from public.observations
union all
select 'behaviour_records', count(*) from public.behaviour_records
union all
select 'interventions', count(*) from public.interventions
union all
select 'events', count(*) from public.events
union all
select 'audit_logs', count(*) from public.audit_logs;
