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
  const questionText = (body?.question_text as string)?.trim();
  const options = body?.options as string[] | undefined;
  const correctIndex = body?.correct_index as number | undefined;

  if (!topicId || !questionText || !Array.isArray(options) || options.length < 2 || correctIndex == null) {
    return NextResponse.json({ error: "topic_id, question_text, options (array), and correct_index required" }, { status: 400 });
  }
  if (correctIndex < 0 || correctIndex >= options.length) {
    return NextResponse.json({ error: "correct_index out of range" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("questions")
    .insert({
      topic_id: topicId,
      question_text: questionText,
      options,
      correct_index: correctIndex,
      explanation: body?.explanation ?? null,
      difficulty_level: body?.difficulty_level ?? null,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
