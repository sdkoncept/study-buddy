import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || (profile as { role: string }).role !== "admin") return null;
  return user;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const user = await requireAdmin(supabase);
    if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const subjectId = body?.subject_id as string;
    const title = (body?.title as string)?.trim();
    if (!subjectId || !title) return NextResponse.json({ error: "subject_id and title required" }, { status: 400 });

    const { data, error } = await supabase
      .from("topics")
      .insert({
        subject_id: subjectId,
        title,
        week_range: (body?.week_range as string)?.trim() || null,
        learning_objectives: body?.learning_objectives ?? null,
        estimated_study_time_minutes: body?.estimated_study_time_minutes ?? 15,
        difficulty_level: body?.difficulty_level ?? "Easy",
        sort_order: body?.sort_order ?? 0,
      })
      .select("id")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e) {
    console.error("Admin topics POST error:", e);
    return NextResponse.json({ error: "Connection error. Please try again." }, { status: 503 });
  }
}
