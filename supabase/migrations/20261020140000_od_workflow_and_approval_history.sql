-- ============================================================
-- Supabase Migration: 20261020140000_od_workflow_and_approval_history.sql
-- Database: PostgreSQL (Supabase)
-- Purpose: Add approval_history table, 48h escalation tracking,
--          and RETURNED_FOR_CORRECTION status support.
-- ============================================================

-- 1. Update status check constraint on od_requests
ALTER TABLE public.od_requests DROP CONSTRAINT IF EXISTS od_requests_status_check;
ALTER TABLE public.od_requests
  ADD CONSTRAINT od_requests_status_check
  CHECK (status IN ('PENDING', 'DECLINED', 'COMPLETED', 'RETURNED_FOR_CORRECTION'));

-- 2. Add columns for escalation tracking
ALTER TABLE public.od_requests
  ADD COLUMN IF NOT EXISTS is_escalated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_stage_updated_at timestamptz NOT NULL DEFAULT now();

-- 3. Create approval_history table
CREATE TABLE IF NOT EXISTS public.approval_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  od_request_id uuid NOT NULL REFERENCES public.od_requests(id) ON DELETE CASCADE,
  stage text NOT NULL,
  action text NOT NULL CHECK (action IN (
    'SUBMITTED',
    'APPROVED',
    'REJECTED_TO_PREVIOUS',
    'REJECTED_FINAL',
    'RETURNED_FOR_CORRECTION',
    'RESUBMITTED',
    'ESCALATED'
  )),
  actor_id uuid REFERENCES public.profiles(id),
  actor_name text NOT NULL,
  actor_role text NOT NULL,
  comments text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Enable RLS on approval_history
ALTER TABLE public.approval_history ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
DROP POLICY IF EXISTS "approval_history_select" ON public.approval_history;
CREATE POLICY "approval_history_select"
  ON public.approval_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.od_requests r
      WHERE r.id = approval_history.od_request_id
        AND (
          r.student_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('COUNSELLOR', 'CLASS_COORDINATOR', 'HOD', 'ADMIN')
          )
        )
    )
  );

DROP POLICY IF EXISTS "approval_history_insert" ON public.approval_history;
CREATE POLICY "approval_history_insert"
  ON public.approval_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_approval_history_od_request_id ON public.approval_history(od_request_id);
CREATE INDEX IF NOT EXISTS idx_od_requests_escalation ON public.od_requests(status, is_escalated, last_stage_updated_at);
