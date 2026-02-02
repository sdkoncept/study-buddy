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
  const supabase = await createClient();
  const user = await requireAdmin(supabase);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();

  const updates: Record<string, unknown> = {};
  if (body?.question_text !== undefined) updates.question_text = (body.question_text as string).trim();
  if (body?.options !== undefined) updates.options = body.options;
  if (body?.correct_index !== undefined) updates.correct_index = body.correct_index;
  if (body?.explanation !== undefined) updates.explanation = body.explanation || null;
  if (body?.difficulty_level !== undefined) updates.difficulty_level = body.difficulty_level;
  updates.updated_at = new Date().toISOString();

  const { error } = await supabase.from("questions").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
