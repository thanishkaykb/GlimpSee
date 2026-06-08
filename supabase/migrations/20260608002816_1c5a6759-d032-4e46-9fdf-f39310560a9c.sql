
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
-- is_circle_member must remain callable by authenticated (RLS uses it) but not by anon
REVOKE EXECUTE ON FUNCTION public.is_circle_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_circle_member(uuid, uuid) TO authenticated;
-- join_circle_by_code only for authenticated
REVOKE EXECUTE ON FUNCTION public.join_circle_by_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_circle_by_code(text) TO authenticated;
