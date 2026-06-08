
-- Auto-create profile on new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NULL))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for any existing users
INSERT INTO public.profiles (id)
SELECT u.id FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- Add FK from posts.author_id -> profiles.id so PostgREST can join
ALTER TABLE public.posts
  DROP CONSTRAINT IF EXISTS posts_author_id_fkey;
ALTER TABLE public.posts
  ADD CONSTRAINT posts_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add media_type column for photos vs videos
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'image';
