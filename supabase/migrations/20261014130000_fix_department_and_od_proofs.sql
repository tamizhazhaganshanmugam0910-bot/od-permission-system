ALTER TABLE public.od_requests
  ADD COLUMN IF NOT EXISTS proof_file_path text;

UPDATE public.profiles AS p
SET department = NULLIF(BTRIM(u.raw_user_meta_data->>'department'), '')
FROM auth.users AS u
WHERE p.id = u.id
  AND NULLIF(BTRIM(u.raw_user_meta_data->>'department'), '') IS NOT NULL
  AND NULLIF(BTRIM(COALESCE(p.department, '')), '') IS NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, department)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'STUDENT'),
    COALESCE(NEW.raw_user_meta_data->>'department', '')
  );
  RETURN NEW;
END;
$$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'od-proofs',
  'od-proofs',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "od_proofs_insert_own" ON storage.objects;
CREATE POLICY "od_proofs_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'od-proofs'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'STUDENT'
    )
  );

DROP POLICY IF EXISTS "od_proofs_select_attached" ON storage.objects;
CREATE POLICY "od_proofs_select_attached"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'od-proofs'
    AND EXISTS (
      SELECT 1
      FROM public.od_requests r
      WHERE r.proof_file_path = name
        AND (
          (
            r.student_id = auth.uid()
            AND (storage.foldername(name))[1] = r.student_id::text
            AND (storage.foldername(name))[2] = r.id::text
          )
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('COUNSELLOR', 'CLASS_COORDINATOR', 'HOD', 'ADMIN')
          )
        )
    )
  );

DROP POLICY IF EXISTS "od_proofs_delete_own" ON storage.objects;
CREATE POLICY "od_proofs_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'od-proofs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );