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
  const supabase = await createClient();
  const user = await requireAdmin(supabase);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const topicId = body?.topic_id as string;
  const title = (body?.title as string)?.trim();
  const content = (body?.content as string)?.trim();
  if (!topicId || !title || !content) {
    return NextResponse.json({ error: "topic_id, title, and content required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("lessons")
    .insert({
      topic_id: topicId,
      title,
      content,
      image_url: body?.image_url ?? null,
      audio_url: body?.audio_url ?? null,
      sort_order: body?.sort_order ?? 0,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
