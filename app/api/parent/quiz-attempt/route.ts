import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profileRes = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const profile = profileRes.data as { role: string } | null;
  if (!profile || profile.role !== "parent") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId");
  const attemptId = searchParams.get("attemptId");
  if (!studentId || !attemptId) {
    return NextResponse.json({ error: "studentId and attemptId required" }, { status: 400 });
  }

  const { data: link } = await supabase
    .from("parent_students")
    .select("student_id")
    .eq("parent_id", user.id)
    .eq("student_id", studentId)
    .single();
  if (!link) {
    return NextResponse.json({ error: "Student not linked to you." }, { status: 403 });
  }

  const { data: attempt, error: attemptErr } = await supabase
    .from("quiz_attempts")
    .select("id, topic_id, score_percent, created_at, answers_json, topics(title, subjects(name))")
    .eq("id", attemptId)
    .eq("user_id", studentId)
    .single();

  if (attemptErr || !attempt) {
    return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
  }

  const topicId = (attempt as { topic_id: string }).topic_id;
  const { data: questions } = await supabase
    .from("questions")
    .select("id, question_text, question_type, options, correct_index, correct_indices, correct_answer_text, explanation")
    .eq("topic_id", topicId);

  type AnswerEntry = { questionId: string; selectedIndex?: number; selectedIndices?: number[]; typedAnswer?: string };
  const answers = (attempt as { answers_json: AnswerEntry[] | null }).answers_json ?? [];
  const questionMap = new Map((questions ?? []).map((q: { id: string }) => [q.id, q]));

  const norm = (s: string): string => s.trim().toLowerCase();
  const sameSet = (a: number[], b: number[]): boolean => {
    if (a.length !== b.length) return false;
    const sa = [...a].sort((x, y) => x - y).join(",");
    const sb = [...b].sort((x, y) => x - y).join(",");
    return sa === sb;
  };
  const getCorrectIndices = (q: { correct_indices?: number[] | null; correct_index: number }): number[] => {
    if (q.correct_indices?.length) return q.correct_indices;
    return [q.correct_index];
  };
  const optionTexts = (q: { options?: string[] }, indices: number[]): string => {
    if (!q.options) return "";
    return indices.map((i) => q.options![i] ?? "").filter(Boolean).join(", ");
  };

  const details = answers.map((a: AnswerEntry) => {
    const q = questionMap.get(a.questionId) as {
      question_text: string;
      question_type?: string;
      options: string[];
      correct_index: number;
      correct_indices?: number[] | null;
      correct_answer_text?: string | null;
      explanation: string | null;
    } | undefined;
    if (!q) return null;
    const isShort = (q.question_type ?? "multiple_choice") === "short_answer";
    const theirIndices = a.selectedIndices ?? (a.selectedIndex != null ? [a.selectedIndex] : []);
    const correctSet = getCorrectIndices(q);
    const isCorrect = isShort
      ? (q.correct_answer_text != null && a.typedAnswer != null && norm(a.typedAnswer) === norm(q.correct_answer_text))
      : sameSet(theirIndices, correctSet);
    const correctAnswer = isShort ? (q.correct_answer_text ?? "") : optionTexts(q, correctSet);
    const theirAnswer = isShort ? (a.typedAnswer ?? "") : optionTexts(q, theirIndices);
    return {
      question_text: q.question_text,
      options: q.options,
      correct_index: q.correct_index,
      selected_index: a.selectedIndex,
      is_correct: isCorrect,
      explanation: q.explanation,
      correct_answer: correctAnswer,
      their_answer: theirAnswer,
    };
  }).filter(Boolean);

  const topic = (attempt as unknown as { topics: { title: string; subjects: { name: string } | null } | null }).topics;

  return NextResponse.json({
    topic_title: topic?.title ?? "Topic",
    subject_name: topic?.subjects?.name ?? "",
    score_percent: (attempt as { score_percent: number }).score_percent,
    created_at: (attempt as { created_at: string }).created_at,
    questions: details,
    wrong_answers: details.filter((d) => d != null && !d.is_correct) as { question_text: string; their_answer: string; correct_answer: string; explanation: string | null }[],
  });
  } catch (e) {
    console.error("Parent quiz-attempt error:", e);
    return NextResponse.json({ error: "Connection error. Please try again." }, { status: 503 });
  }
}
