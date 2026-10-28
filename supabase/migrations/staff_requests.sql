-- ============================================================
-- Migration: Add staff_requests table
-- Run this in your Supabase SQL editor
-- ============================================================

-- 1. Create the staff_requests table
CREATE TABLE IF NOT EXISTS public.staff_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name    TEXT NOT NULL,
  email        TEXT NOT NULL,
  requested_role TEXT NOT NULL CHECK (requested_role IN ('COUNSELLOR', 'CLASS_COORDINATOR', 'HOD')),
  department   TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  admin_note   TEXT,
  reviewed_by  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Enable Row-Level Security
ALTER TABLE public.staff_requests ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies

-- Anyone authenticated can insert their own request
CREATE POLICY "Users can insert own staff request"
  ON public.staff_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- User can read their own request
CREATE POLICY "Users can read own staff request"
  ON public.staff_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can read ALL requests
CREATE POLICY "Admins can read all staff requests"
  ON public.staff_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Admins can update (approve/reject) requests
CREATE POLICY "Admins can update staff requests"
  ON public.staff_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- 4. Allow admins to update any profile's role
-- (If you already have an update policy, adjust as needed)
CREATE POLICY "Admins can update any profile role"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles AS p
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  )
  WITH CHECK (true);

-- 5. Index for faster lookups
-- 5. Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_staff_requests_status ON public.staff_requests(status);
CREATE INDEX IF NOT EXISTS idx_staff_requests_user_id ON public.staff_requests(user_id);

-- 6. Atomic RPC function for staff request review
CREATE OR REPLACE FUNCTION public.review_staff_request(
  req_id UUID,
  new_status TEXT,
  note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req RECORD;
  v_caller_role TEXT;
  v_reviewer_name TEXT;
BEGIN
  SELECT role, full_name INTO v_caller_role, v_reviewer_name
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_caller_role IS DISTINCT FROM 'ADMIN' THEN
    RAISE EXCEPTION 'Only administrators can review staff requests.';
  END IF;

  SELECT * INTO v_req FROM public.staff_requests WHERE id = req_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Staff request not found.';
  END IF;

  IF new_status NOT IN ('APPROVED', 'REJECTED') THEN
    RAISE EXCEPTION 'Invalid status. Must be APPROVED or REJECTED.';
  END IF;

  UPDATE public.staff_requests
  SET status = new_status,
      admin_note = note,
      reviewed_by = COALESCE(v_reviewer_name, 'Admin'),
      updated_at = NOW()
  WHERE id = req_id;

  IF new_status = 'APPROVED' THEN
    UPDATE public.profiles
    SET role = v_req.requested_role,
        department = COALESCE(NULLIF(v_req.department, ''), department)
    WHERE id = v_req.user_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'status', new_status);
END;
$$;

-- Grant execute to authenticated users (admin check is inside function)
GRANT EXECUTE ON FUNCTION public.review_staff_request(UUID, TEXT, TEXT) TO authenticated;

