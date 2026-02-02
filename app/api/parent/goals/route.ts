import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function ensureParentAndLinked(supabase: Awaited<ReturnType<typeof createClient>>, parentId: string, studentId: string) {
  const profileRes = await supabase.from("profiles").select("role").eq("id", parentId).single();
  const profile = profileRes.data as { role: string } | null;
  if (!profile || profile.role !== "parent") return false;
  const { data: link } = await supabase
    .from("parent_students")
    .select("student_id")
    .eq("parent_id", parentId)
    .eq("student_id", studentId)
    .single();
  return !!link;
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const studentId = new URL(request.url).searchParams.get("studentId");
    if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 });
    if (!(await ensureParentAndLinked(supabase, user.id, studentId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data } = await supabase
      .from("parent_goals")
      .select("topics_per_week")
      .eq("parent_id", user.id)
      .eq("student_id", studentId)
      .maybeSingle();

    return NextResponse.json({ topics_per_week: (data as { topics_per_week: number } | null)?.topics_per_week ?? null });
  } catch (e) {
    console.error("Parent goals GET error:", e);
    return NextResponse.json({ error: "Connection error. Please try again." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const studentId = body?.studentId as string;
    const topicsPerWeek = typeof body?.topics_per_week === "number" ? body.topics_per_week : 2;
    if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 });
    if (!(await ensureParentAndLinked(supabase, user.id, studentId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase
      .from("parent_goals")
      .upsert(
        { parent_id: user.id, student_id: studentId, topics_per_week: Math.max(1, Math.min(20, topicsPerWeek)), updated_at: new Date().toISOString() },
        { onConflict: "parent_id,student_id" }
      );

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Parent goals PATCH error:", e);
    return NextResponse.json({ error: "Connection error. Please try again." }, { status: 503 });
  }
}
