import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export type Circle = { id: string; name: string; join_code: string; created_by: string; created_at: string; member_count?: number };

export function useCircles() {
  return useQuery({
    queryKey: ["circles"],
    queryFn: async (): Promise<Circle[]> => {
      const { data: members, error } = await supabase
        .from("circle_members")
        .select("circle_id, circles(id, name, join_code, created_by, created_at)")
        .order("joined_at", { ascending: false });
      if (error) throw error;
      const circles = (members ?? [])
        .map((m: any) => m.circles)
        .filter(Boolean) as Circle[];
      // counts
      const ids = circles.map((c) => c.id);
      if (ids.length) {
        const { data: allMembers } = await supabase
          .from("circle_members")
          .select("circle_id")
          .in("circle_id", ids);
        const counts: Record<string, number> = {};
        (allMembers ?? []).forEach((m: any) => { counts[m.circle_id] = (counts[m.circle_id] ?? 0) + 1; });
        circles.forEach((c) => (c.member_count = counts[c.id] ?? 1));
      }
      return circles;
    },
  });
}

export async function signedPhotoUrl(path: string) {
  const { data, error } = await supabase.storage.from("photos").createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}
