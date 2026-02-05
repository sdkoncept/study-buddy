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
    const topicId = body?.topic_id as string;
    const questionText = (body?.question_text as string)?.trim();
    const rawType = body?.question_type as string;
    const questionType = rawType === "external_answer" ? "external_answer"
      : rawType === "short_answer" ? "short_answer" : "multiple_choice";
    const options = body?.options as string[] | undefined;
    const correctIndex = body?.correct_index as number | undefined;
    const correctIndices = body?.correct_indices as number[] | undefined;
    const correctAnswerText = (body?.correct_answer_text as string)?.trim() || null;
    const imageUrl = (body?.image_url as string)?.trim() || null;

    if (!topicId || !questionText) {
      return NextResponse.json({ error: "topic_id and question_text required" }, { status: 400 });
    }
    if (questionType === "multiple_choice") {
      if (!Array.isArray(options) || options.length < 2) {
        return NextResponse.json({ error: "Multiple choice requires options (array of 2+)" }, { status: 400 });
      }
      const indices = Array.isArray(correctIndices) && correctIndices.length > 0
        ? correctIndices.filter((i) => i >= 0 && i < options.length)
        : correctIndex != null && correctIndex >= 0 && correctIndex < options.length
          ? [correctIndex]
          : [];
      if (indices.length === 0) {
        return NextResponse.json({ error: "Select at least one correct option (correct_indices or correct_index)" }, { status: 400 });
      }
    } else if (questionType === "short_answer") {
      if (!correctAnswerText) {
        return NextResponse.json({ error: "Short answer requires correct_answer_text" }, { status: 400 });
      }
    }

    const mcIndices = questionType === "multiple_choice" && Array.isArray(correctIndices) && correctIndices.length > 0
      ? correctIndices.filter((i) => i >= 0 && i < (options?.length ?? 0))
      : questionType === "multiple_choice" && correctIndex != null
        ? [correctIndex]
        : [];
    const { data, error } = await supabase
      .from("questions")
      .insert({
        topic_id: topicId,
        question_text: questionText,
        question_type: questionType,
        options: questionType === "multiple_choice" ? options! : [] as string[],
        correct_index: questionType === "multiple_choice" ? (mcIndices[0] ?? 0) : 0,
        correct_indices: questionType === "multiple_choice" ? mcIndices : [],
        correct_answer_text: correctAnswerText,
        explanation: body?.explanation ?? null,
        difficulty_level: body?.difficulty_level ?? null,
        image_url: imageUrl,
      })
      .select("id")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e) {
    console.error("Admin questions POST error:", e);
    return NextResponse.json({ error: "Connection error. Please try again." }, { status: 503 });
  }
}
