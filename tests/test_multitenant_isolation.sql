-- ==============================================================================
-- TAWI MULTI-TENANT ISOLATION & COMPOSITE FK TEST SUITE
-- Run this in Supabase SQL Editor after running supabase_multitenant_schema.sql
-- ==============================================================================

do $$
declare
    v_sch_a uuid := '11111111-1111-1111-1111-111111111111';
    v_sch_b uuid := '22222222-2222-2222-2222-222222222222';
    v_cls_a uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    v_cls_b uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    v_lrn_a uuid := '33333333-3333-3333-3333-333333333333';
    v_lrn_b uuid := '44444444-4444-4444-4444-444444444444';
begin
    raise notice '--- STARTING TAWI MULTI-TENANT ISOLATION TESTS ---';

    -- 1. Setup Test Tenants
    insert into public.schools (id, code, name, status)
    values 
        (v_sch_a, 'SCH_TEST_A', 'School Alpha', 'live'),
        (v_sch_b, 'SCH_TEST_B', 'School Beta', 'live')
    on conflict (id) do nothing;

    -- 2. Setup Test Classes
    insert into public.classes (id, school_id, name, grade_level, stream)
    values
        (v_cls_a, v_sch_a, 'Grade 2 Red', 'Grade 2', 'Red'),
        (v_cls_b, v_sch_b, 'Grade 2 Blue', 'Grade 2', 'Blue')
    on conflict (id) do nothing;

    -- 3. TEST: Composite Foreign Key Mismatch Rejection
    -- Attempting to link a School A learner to School B's class must fail at the database level!
    begin
        insert into public.learners (id, school_id, class_id, admission_number, full_name)
        values (gen_random_uuid(), v_sch_a, v_cls_b, 'ADM_FAIL_001', 'Cross School Infiltrator');
        
        raise exception 'TEST FAILED: Composite foreign key allowed cross-school class assignment!';
    exception when foreign_key_violation then
        raise notice 'TEST PASSED: Composite Foreign Key correctly blocked cross-school class assignment.';
    end;

    -- 4. Valid Learner Inserts
    insert into public.learners (id, school_id, class_id, admission_number, full_name, date_of_birth)
    values 
        (v_lrn_a, v_sch_a, v_cls_a, 'ADM_A_001', 'Amina Wanjiku', '2019-03-12'),
        (v_lrn_b, v_sch_b, v_cls_b, 'ADM_B_001', 'Brian Mwangi', '2019-05-20')
    on conflict (id) do nothing;

    -- 5. TEST: Attendance Record Cross-School Rejection
    -- Attempting to record attendance for a School A learner in a School B session must fail!
    begin
        declare
            v_session_b uuid := gen_random_uuid();
            v_dummy_user uuid := gen_random_uuid();
        begin
            -- Session in School B
            insert into public.attendance_sessions (id, school_id, class_id, date, recorded_by)
            values (v_session_b, v_sch_b, v_cls_b, current_date, v_dummy_user);

            -- Attempt to log School A learner in School B session
            insert into public.attendance_records (school_id, session_id, learner_id, status)
            values (v_sch_b, v_session_b, v_lrn_a, 'present');

            raise exception 'TEST FAILED: Composite foreign key allowed School A learner in School B attendance!';
        exception when foreign_key_violation then
            raise notice 'TEST PASSED: Composite Foreign Key correctly blocked cross-school attendance record.';
        end;
    end;

    raise notice '--- ALL MULTI-TENANT INTEGRITY TESTS PASSED SUCCESSFULLY! ---';
end;
$$;
