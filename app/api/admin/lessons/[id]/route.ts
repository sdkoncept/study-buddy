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
  if (body?.title !== undefined) updates.title = (body.title as string).trim();
  if (body?.content !== undefined) updates.content = (body.content as string).trim();
  if (body?.image_url !== undefined) updates.image_url = body.image_url || null;
  if (body?.audio_url !== undefined) updates.audio_url = body.audio_url || null;
  if (body?.sort_order !== undefined) updates.sort_order = body.sort_order;
  updates.updated_at = new Date().toISOString();

  const { error } = await supabase.from("lessons").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
