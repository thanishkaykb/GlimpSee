
-- Path convention: {circle_id}/{user_id}/{filename}
CREATE POLICY "photos select if circle member"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'photos'
    AND public.is_circle_member((split_part(name, '/', 1))::uuid, auth.uid())
  );

CREATE POLICY "photos insert own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'photos'
    AND (split_part(name, '/', 2))::uuid = auth.uid()
    AND public.is_circle_member((split_part(name, '/', 1))::uuid, auth.uid())
  );

CREATE POLICY "photos delete own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'photos'
    AND (split_part(name, '/', 2))::uuid = auth.uid()
  );
