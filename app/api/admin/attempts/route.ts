import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || (profile as { role: string }).role !== "admin") return null;
  return user;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const user = await requireAdmin(supabase);
    if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data, error } = await supabase
      .from("quiz_attempts")
      .select("id, user_id, topic_id, score_percent, created_at, topics(title, subjects(name)), profiles(full_name, email)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Admin attempts error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ attempts: data ?? [] });
  } catch (e) {
    console.error("Admin attempts error:", e);
    return NextResponse.json({ error: "Connection error" }, { status: 503 });
  }
}
