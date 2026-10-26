import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Family, Profile } from "@/types/database";

export interface FamilyContextValue {
  me: Profile;
  partner: Profile | null;
  family: Family;
}

/** Load the current user's profile; redirects to /login if signed out. */
export async function getMyProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();
  if (!me) redirect("/login");
  return { supabase, me };
}

/** Load profile + family + partner; redirects to /setup if not paired yet. */
export async function getFamilyContext(): Promise<FamilyContextValue> {
  const { supabase, me } = await getMyProfile();
  if (!me.family_id) redirect("/setup");

  const [{ data: family }, { data: members }] = await Promise.all([
    supabase.from("families").select("*").eq("id", me.family_id).single<Family>(),
    supabase.from("profiles").select("*").eq("family_id", me.family_id).returns<Profile[]>(),
  ]);
  if (!family) redirect("/setup");

  return { me, family, partner: members?.find((m) => m.id !== me.id) ?? null };
}
