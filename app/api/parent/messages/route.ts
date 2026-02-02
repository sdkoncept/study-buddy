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

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const studentId = body?.studentId as string;
    const messageBody = (body?.body as string)?.trim();
    if (!studentId || !messageBody) {
      return NextResponse.json({ error: "studentId and body required" }, { status: 400 });
    }
    if (!(await ensureParentAndLinked(supabase, user.id, studentId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase.from("parent_messages").insert({
      parent_id: user.id,
      student_id: studentId,
      body: messageBody.slice(0, 2000),
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Parent messages error:", e);
    return NextResponse.json({ error: "Connection error. Please try again." }, { status: 503 });
  }
}
