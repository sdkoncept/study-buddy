import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || (profile as { role: string }).role !== "admin") return null;
  return user;
}

/** Same shape as parent quiz-attempt for admin viewing/grading any student's attempt */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const user = await requireAdmin(supabase);
    if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    const attemptId = searchParams.get("attemptId");
    if (!studentId || !attemptId) {
      return NextResponse.json({ error: "studentId and attemptId required" }, { status: 400 });
    }

    const { data: attempt, error: attemptErr } = await supabase
      .from("quiz_attempts")
      .select("id, topic_id, score_percent, created_at, answers_json, topics(title, subjects(name))")
      .eq("id", attemptId)
      .eq("user_id", studentId)
      .single();

    if (attemptErr || !attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    const topicId = (attempt as { topic_id: string }).topic_id;
    const { data: questions } = await supabase
      .from("questions")
      .select("id, question_text, question_type, options, correct_index, correct_indices, correct_answer_text, explanation")
      .eq("topic_id", topicId);

    const { data: externalGrades } = await supabase
      .from("external_answer_grades")
      .select("question_id, image_url, score")
      .eq("attempt_id", attemptId);

    const gradeByQuestion = new Map(
      (externalGrades ?? []).map((g: { question_id: string; image_url: string | null; score: number }) => [g.question_id, { image_url: g.image_url, score: g.score }])
    );

    type AnswerEntry = { questionId: string; selectedIndex?: number; selectedIndices?: number[]; typedAnswer?: string; externalCompleted?: boolean };
    const answers = (attempt as { answers_json: AnswerEntry[] | null }).answers_json ?? [];
    const questionMap = new Map((questions ?? []).map((q: { id: string }) => [q.id, q]));

    const norm = (s: string) => s.trim().toLowerCase();
    const sameSet = (a: number[], b: number[]) => {
      if (a.length !== b.length) return false;
      return [...a].sort((x, y) => x - y).join(",") === [...b].sort((x, y) => x - y).join(",");
    };
    const getCorrectIndices = (q: { correct_indices?: number[] | null; correct_index: number }) =>
      q.correct_indices?.length ? q.correct_indices : [q.correct_index];
    const optionTexts = (q: { options?: string[] }, indices: number[]) =>
      (q.options ? indices.map((i) => q.options![i] ?? "").filter(Boolean).join(", ") : "");

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
      const isExternal = (q.question_type ?? "multiple_choice") === "external_answer";
      const isShort = (q.question_type ?? "multiple_choice") === "short_answer";
      const theirIndices = a.selectedIndices ?? (a.selectedIndex != null ? [a.selectedIndex] : []);
      const correctSet = getCorrectIndices(q);
      const isCorrect = isExternal
        ? true
        : isShort
        ? (q.correct_answer_text != null && a.typedAnswer != null && norm(a.typedAnswer) === norm(q.correct_answer_text))
        : sameSet(theirIndices, correctSet);
      const correctAnswer = isExternal ? "(answered outside platform)" : isShort ? (q.correct_answer_text ?? "") : optionTexts(q, correctSet);
      const theirAnswer = isExternal ? "(completed externally)" : isShort ? (a.typedAnswer ?? "") : optionTexts(q, theirIndices);
      const grade = isExternal ? gradeByQuestion.get(a.questionId) : undefined;
      return {
        question_id: a.questionId,
        question_text: q.question_text,
        options: q.options,
        correct_index: q.correct_index,
        selected_index: a.selectedIndex,
        is_correct: isCorrect,
        is_external: isExternal,
        explanation: q.explanation,
        correct_answer: correctAnswer,
        their_answer: theirAnswer,
        external_grade: grade ? { image_url: grade.image_url, score: grade.score } : undefined,
      };
    }).filter(Boolean);

    const externalQuestions = details
      .filter((d) => d != null && (d as { is_external?: boolean }).is_external)
      .map((d) => ({
        question_id: (d as { question_id: string }).question_id,
        question_text: (d as { question_text: string }).question_text,
        external_grade: (d as { external_grade?: { image_url: string | null; score: number } }).external_grade,
      }));

    const topic = (attempt as unknown as { topics: { title: string; subjects: { name: string } | null } | null }).topics;

    return NextResponse.json({
      topic_title: topic?.title ?? "Topic",
      subject_name: topic?.subjects?.name ?? "",
      score_percent: (attempt as { score_percent: number }).score_percent,
      created_at: (attempt as { created_at: string }).created_at,
      attempt_id: attemptId,
      student_id: studentId,
      questions: details,
      wrong_answers: details.filter((d) => d != null && !d.is_correct) as { question_text: string; their_answer: string; correct_answer: string; explanation: string | null }[],
      external_questions: externalQuestions,
    });
  } catch (e) {
    console.error("Admin quiz-attempt error:", e);
    return NextResponse.json({ error: "Connection error" }, { status: 503 });
  }
}
