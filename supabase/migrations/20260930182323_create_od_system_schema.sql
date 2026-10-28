/*
# OD Permission & Approval System Schema

1. Overview
This migration creates the complete database schema for an OD (On-Duty) permission
and approval system for colleges. It includes:
- A `profiles` table storing each user's role (STUDENT, COUNSELLOR, CLASS_COORDINATOR, HOD)
  and full name, linked to Supabase auth.users.
- An `od_requests` table storing each OD request with its sequential approval state.
- A trigger that automatically creates a profile row when a new auth user signs up.

2. Tables
- `profiles`:
  - id (uuid, PK, FK to auth.users) — one row per user
  - email (text) — copied from auth for convenience
  - full_name (text) — student/approver display name
  - role (text) — one of STUDENT, COUNSELLOR, CLASS_COORDINATOR, HOD
  - department (text) — department of the student/approver (nullable for approvers)
  - created_at (timestamptz)

- `od_requests`:
  - id (uuid, PK)
  - student_id (uuid, FK to profiles) — who submitted
  - student_name (text) — denormalized for easy display
  - department (text)
  - od_date (date) — the OD date
  - category (text) — SPORTS, TECHNICAL, NON_TECHNICAL, OTHERS
  - reason (text)
  - current_stage (text) — COUNSELLOR, CLASS_COORDINATOR, HOD, DONE
  - status (text) — PENDING, DECLINED, COMPLETED
  - declined_by (text, nullable) — which role declined
  - decline_reason (text, nullable)
  - counsellor_id (uuid, nullable) — the approver who accepted
  - counsellor_name (text, nullable)
  - counsellor_remark (text, nullable)
  - coordinator_id (uuid, nullable)
  - coordinator_name (text, nullable)
  - coordinator_remark (text, nullable)
  - hod_id (uuid, nullable)
  - hod_name (text, nullable)
  - hod_remark (text, nullable)
  - pdf_generated (boolean, default false)
  - created_at (timestamptz)
  - updated_at (timestamptz)

3. Security
- RLS enabled on both tables.
- profiles: each user can read/update their own row; all authenticated users can read
  profiles (needed to show approver names / student names).
- od_requests: students can see/insert only their own; approvers can read all requests
  (they need to see the queue for their stage); approvers can update requests (to accept/decline).
  Students can also update their own requests (e.g. for status reads, though primary updates
  are by approvers).

4. Triggers
- `handle_new_user`: on INSERT into auth.users, insert a corresponding profiles row
  with email copied from the new user. Role defaults to 'STUDENT'.
*/

-- ============================================================
-- profiles table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'STUDENT'
    CHECK (role IN ('STUDENT','COUNSELLOR','CLASS_COORDINATOR','HOD','ADMIN')),
  department text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read profiles (to display names)
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all"
  ON public.profiles FOR SELECT
  TO authenticated USING (true);

-- Users can update their own profile
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Users can insert their own profile row
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

-- ============================================================
-- od_requests table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.od_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_name text NOT NULL,
  department text NOT NULL,
  od_date date NOT NULL,
  category text NOT NULL CHECK (category IN ('SPORTS','TECHNICAL','NON_TECHNICAL','OTHERS')),
  reason text NOT NULL,
  current_stage text NOT NULL DEFAULT 'COUNSELLOR'
    CHECK (current_stage IN ('COUNSELLOR','CLASS_COORDINATOR','HOD','DONE')),
  status text NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','DECLINED','COMPLETED')),
  declined_by text CHECK (declined_by IN ('COUNSELLOR','CLASS_COORDINATOR','HOD') OR declined_by IS NULL),
  decline_reason text,
  counsellor_id uuid REFERENCES public.profiles(id),
  counsellor_name text,
  counsellor_remark text,
  coordinator_id uuid REFERENCES public.profiles(id),
  coordinator_name text,
  coordinator_remark text,
  hod_id uuid REFERENCES public.profiles(id),
  hod_name text,
  hod_remark text,
  pdf_generated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.od_requests ENABLE ROW LEVEL SECURITY;

-- Students can read their own requests; approvers can read all
DROP POLICY IF EXISTS "od_select_own_or_approver" ON public.od_requests;
CREATE POLICY "od_select_own_or_approver"
  ON public.od_requests FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('COUNSELLOR','CLASS_COORDINATOR','HOD','ADMIN')
    )
  );

-- Students can insert their own requests
DROP POLICY IF EXISTS "od_insert_own" ON public.od_requests;
CREATE POLICY "od_insert_own"
  ON public.od_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'STUDENT'
    )
  );

-- Approvers and the student who owns the request can update
DROP POLICY IF EXISTS "od_update_approver_or_own" ON public.od_requests;
CREATE POLICY "od_update_approver_or_own"
  ON public.od_requests FOR UPDATE
  TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('COUNSELLOR','CLASS_COORDINATOR','HOD','ADMIN')
    )
  )
  WITH CHECK (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('COUNSELLOR','CLASS_COORDINATOR','HOD','ADMIN')
    )
  );

-- Students can delete their own pending requests
DROP POLICY IF EXISTS "od_delete_own" ON public.od_requests;
CREATE POLICY "od_delete_own"
  ON public.od_requests FOR DELETE
  TO authenticated
  USING (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'STUDENT'
    )
  );

-- ============================================================
-- Auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'STUDENT')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_od_requests_student_id ON public.od_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_od_requests_current_stage ON public.od_requests(current_stage);
CREATE INDEX IF NOT EXISTS idx_od_requests_status ON public.od_requests(status);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
