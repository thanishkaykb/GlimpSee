
-- =========================
-- PROFILES
-- =========================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles readable by authenticated"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles insert own"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles update own"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- =========================
-- CIRCLES
-- =========================
CREATE TABLE public.circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  join_code TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.circles TO authenticated;
GRANT ALL ON public.circles TO service_role;
ALTER TABLE public.circles ENABLE ROW LEVEL SECURITY;

-- =========================
-- CIRCLE MEMBERS
-- =========================
CREATE TABLE public.circle_members (
  circle_id UUID NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (circle_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.circle_members TO authenticated;
GRANT ALL ON public.circle_members TO service_role;
ALTER TABLE public.circle_members ENABLE ROW LEVEL SECURITY;

-- Security definer helper to avoid recursive RLS
CREATE OR REPLACE FUNCTION public.is_circle_member(_circle UUID, _user UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.circle_members WHERE circle_id = _circle AND user_id = _user
  );
$$;

CREATE POLICY "circles select if member"
  ON public.circles FOR SELECT TO authenticated
  USING (public.is_circle_member(id, auth.uid()));
CREATE POLICY "circles insert by creator"
  ON public.circles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY "circles update by creator"
  ON public.circles FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);
CREATE POLICY "circles delete by creator"
  ON public.circles FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "members select own circles"
  ON public.circle_members FOR SELECT TO authenticated
  USING (public.is_circle_member(circle_id, auth.uid()));
CREATE POLICY "members insert self"
  ON public.circle_members FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "members leave self"
  ON public.circle_members FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Auto-add creator as owner of their circle
CREATE OR REPLACE FUNCTION public.add_circle_creator_as_member()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.circle_members (circle_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner');
  RETURN NEW;
END; $$;
CREATE TRIGGER circles_creator_member
AFTER INSERT ON public.circles
FOR EACH ROW EXECUTE FUNCTION public.add_circle_creator_as_member();

-- Join circle by code (bypasses circle visibility)
CREATE OR REPLACE FUNCTION public.join_circle_by_code(_code TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _circle_id UUID;
BEGIN
  SELECT id INTO _circle_id FROM public.circles WHERE join_code = upper(_code);
  IF _circle_id IS NULL THEN
    RAISE EXCEPTION 'Invalid join code';
  END IF;
  INSERT INTO public.circle_members (circle_id, user_id, role)
  VALUES (_circle_id, auth.uid(), 'member')
  ON CONFLICT DO NOTHING;
  RETURN _circle_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.join_circle_by_code(TEXT) TO authenticated;

-- =========================
-- POSTS
-- =========================
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX posts_circle_created_idx ON public.posts (circle_id, created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "posts select if member"
  ON public.posts FOR SELECT TO authenticated
  USING (public.is_circle_member(circle_id, auth.uid()));
CREATE POLICY "posts insert self in circle"
  ON public.posts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id AND public.is_circle_member(circle_id, auth.uid()));
CREATE POLICY "posts delete own"
  ON public.posts FOR DELETE TO authenticated
  USING (auth.uid() = author_id);

-- =========================
-- REACTIONS
-- =========================
CREATE TABLE public.reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX reactions_post_idx ON public.reactions (post_id);
GRANT SELECT, INSERT, DELETE ON public.reactions TO authenticated;
GRANT ALL ON public.reactions TO service_role;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reactions select if post visible"
  ON public.reactions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.posts p WHERE p.id = post_id AND public.is_circle_member(p.circle_id, auth.uid())
  ));
CREATE POLICY "reactions insert self"
  ON public.reactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.posts p WHERE p.id = post_id AND public.is_circle_member(p.circle_id, auth.uid())
  ));
CREATE POLICY "reactions delete own"
  ON public.reactions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- =========================
-- PROFILE AUTO-CREATE
-- =========================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email, NEW.phone, 'friend'), '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================
-- REALTIME
-- =========================
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reactions;
