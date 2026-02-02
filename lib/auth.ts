import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { redirect } from "next/navigation";

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ?? null;
}

export async function getProfile(): Promise<Profile | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  let { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  // If no profile (e.g. user signed up before trigger existed), create one via RPC (bypasses RLS) or upsert
  if ((error || !data) && user) {
    const { data: rpcData } = await supabase.rpc("ensure_profile");
    if (rpcData && typeof rpcData === "object") {
      data = rpcData as Profile;
      error = null;
    } else {
      const role = (user.user_metadata?.role as string) || "student";
      const validRole = role === "parent" || role === "admin" ? role : "student";
      await supabase.from("profiles").upsert(
        {
          id: user.id,
          email: user.email ?? "",
          full_name: user.user_metadata?.full_name ?? null,
          role: validRole,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
      const next = await supabase.from("profiles").select("*").eq("id", user.id).single();
      data = next.data;
      error = next.error;
    }
  }
  if (error || !data) return null;
  return data as Profile;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireProfile(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  return profile;
}

export async function requireRole(allowed: ("student" | "parent" | "admin")[]) {
  const profile = await requireProfile();
  if (!allowed.includes(profile.role)) redirect("/dashboard");
  return profile;
}
