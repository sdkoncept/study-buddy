import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || (profile as { role: string }).role !== "admin") return null;
  return user;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const user = await requireAdmin(supabase);
    if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const body = await request.json();

    const updates: Record<string, unknown> = {};
    if (body?.question_text !== undefined) updates.question_text = (body.question_text as string).trim();
    if (body?.question_type !== undefined) {
      const t = body.question_type as string;
      updates.question_type = t === "external_answer" ? "external_answer" : t === "short_answer" ? "short_answer" : "multiple_choice";
    }
    if (body?.options !== undefined) updates.options = body.options;
    if (body?.correct_index !== undefined) updates.correct_index = body.correct_index;
    if (body?.correct_indices !== undefined) updates.correct_indices = Array.isArray(body.correct_indices) ? body.correct_indices : [];
    if (body?.correct_answer_text !== undefined) updates.correct_answer_text = (body.correct_answer_text as string)?.trim() || null;
    if (body?.explanation !== undefined) updates.explanation = body.explanation || null;
    if (body?.difficulty_level !== undefined) updates.difficulty_level = body.difficulty_level;
    if (body?.image_url !== undefined) updates.image_url = (body.image_url as string)?.trim() || null;
    updates.updated_at = new Date().toISOString();

    const { error } = await supabase.from("questions").update(updates).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Admin questions PATCH error:", e);
    return NextResponse.json({ error: "Connection error. Please try again." }, { status: 503 });
  }
}
