import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const STORAGE_BUCKET = "lesson-images";
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

async function canGrade(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studentId: string
): Promise<{ user: { id: string }; role: "admin" | "parent" } | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = (profile as { role: string } | null)?.role;
  if (role === "admin") return { user, role: "admin" };
  if (role === "parent") {
    const { data: link } = await supabase
      .from("parent_students")
      .select("student_id")
      .eq("parent_id", user.id)
      .eq("student_id", studentId)
      .single();
    if (link) return { user, role: "parent" };
  }
  return null;
}

/** Recompute quiz score including external grades and update quiz_attempts */
async function updateAttemptScore(
  supabase: Awaited<ReturnType<typeof createClient>>,
  attemptId: string,
  topicId: string,
  studentId: string
) {
  const { data: attempt } = await supabase
    .from("quiz_attempts")
    .select("answers_json")
    .eq("id", attemptId)
    .eq("user_id", studentId)
    .single();
  if (!attempt) return;

  const { data: questions } = await supabase
    .from("questions")
    .select("id, question_type")
    .eq("topic_id", topicId);

  const { data: grades } = await supabase
    .from("external_answer_grades")
    .select("question_id, score")
    .eq("attempt_id", attemptId);

  const answers = (attempt as { answers_json?: { questionId: string; selectedIndices?: number[]; selectedIndex?: number; typedAnswer?: string }[] }).answers_json ?? [];
  const questionMap = new Map((questions ?? []).map((q: { id: string; question_type: string }) => [q.id, q]));
  const gradeMap = new Map((grades ?? []).map((g: { question_id: string; score: number }) => [g.question_id, g.score]));

  const norm = (s: string) => s.trim().toLowerCase();
  const sameSet = (a: number[], b: number[]) => {
    if (a.length !== b.length) return false;
    return [...a].sort((x, y) => x - y).join(",") === [...b].sort((x, y) => x - y).join(",");
  };
  const getCorrectIndices = (q: { correct_indices?: number[]; correct_index: number }) =>
    q.correct_indices?.length ? q.correct_indices : [q.correct_index];

  let correct = 0;
  let total = 0;

  for (const a of answers) {
    const q = questionMap.get(a.questionId) as { question_type: string; correct_indices?: number[]; correct_index: number; correct_answer_text?: string } | undefined;
    if (!q) continue;

    if ((q.question_type ?? "multiple_choice") === "external_answer") {
      const extScore = gradeMap.get(a.questionId);
      if (extScore != null) {
        total += 1;
        correct += extScore / 100;
      }
    } else {
      total += 1;
      if ((q.question_type ?? "multiple_choice") === "short_answer") {
        const expected = q.correct_answer_text?.trim();
        if (expected && norm(a.typedAnswer ?? "") === norm(expected)) correct += 1;
      } else {
        const their = a.selectedIndices ?? (a.selectedIndex != null ? [a.selectedIndex] : []);
        if (sameSet(their, getCorrectIndices(q))) correct += 1;
      }
    }
  }

  const scorePercent = total > 0 ? Math.round((correct / total) * 100) : 0;
  await supabase.from("quiz_attempts").update({ score_percent: scorePercent }).eq("id", attemptId);
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const formData = await request.formData();
    const attemptId = (formData.get("attemptId") as string)?.trim();
    const studentId = (formData.get("studentId") as string)?.trim();
    const questionId = (formData.get("questionId") as string)?.trim();
    const scoreStr = (formData.get("score") as string)?.trim();
    const file = formData.get("file") as File | null;

    if (!attemptId || !studentId || !questionId || !scoreStr) {
      return NextResponse.json(
        { error: "attemptId, studentId, questionId, and score required" },
        { status: 400 }
      );
    }
    const score = parseInt(scoreStr, 10);
    if (isNaN(score) || score < 0 || score > 100) {
      return NextResponse.json({ error: "score must be 0–100" }, { status: 400 });
    }

    const auth = await canGrade(supabase, studentId);
    if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: attempt } = await supabase
      .from("quiz_attempts")
      .select("id, topic_id, user_id")
      .eq("id", attemptId)
      .eq("user_id", studentId)
      .single();
    if (!attempt) return NextResponse.json({ error: "Attempt not found" }, { status: 404 });

    const topicId = (attempt as { topic_id: string }).topic_id;

    const { data: q } = await supabase
      .from("questions")
      .select("id, question_type")
      .eq("id", questionId)
      .eq("topic_id", topicId)
      .single();
    if (!q || (q as { question_type: string }).question_type !== "external_answer") {
      return NextResponse.json({ error: "Question not found or not external_answer type" }, { status: 400 });
    }

    let imageUrl: string | null = null;

    if (file && file.size > 0) {
      if (file.size > MAX_SIZE_BYTES) {
        return NextResponse.json({ error: "Image must be under 5 MB" }, { status: 400 });
      }
      const contentType = file.type || "";
      if (!ALLOWED_TYPES.includes(contentType) && !file.name?.match(/\.(png|jpe?g|webp|gif)$/i)) {
        return NextResponse.json({ error: "File must be PNG, JPEG, WebP, or GIF" }, { status: 400 });
      }
      const ext = file.name?.match(/\.(png|jpe?g|webp|gif)$/i)?.[1] ?? "png";
      const path = `external-answers/${attemptId}/${questionId}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, buffer, { contentType: file.type || `image/${ext}`, upsert: false });
      if (uploadErr) {
        console.error("External grade image upload error:", uploadErr);
        return NextResponse.json({ error: uploadErr.message }, { status: 500 });
      }
      const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(uploadData.path);
      imageUrl = urlData.publicUrl;
    }

    const { data: existing } = await supabase
      .from("external_answer_grades")
      .select("id")
      .eq("attempt_id", attemptId)
      .eq("question_id", questionId)
      .maybeSingle();

    if (existing) {
      const updates: { score: number; image_url?: string | null; graded_by: string; graded_at: string } = {
        score,
        graded_by: auth.user.id,
        graded_at: new Date().toISOString(),
      };
      if (imageUrl !== null) updates.image_url = imageUrl;
      const { error: updErr } = await supabase
        .from("external_answer_grades")
        .update(updates)
        .eq("attempt_id", attemptId)
        .eq("question_id", questionId);
      if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
    } else {
      const { error: insErr } = await supabase.from("external_answer_grades").insert({
        attempt_id: attemptId,
        question_id: questionId,
        image_url: imageUrl,
        score,
        graded_by: auth.user.id,
      });
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    await updateAttemptScore(supabase, attemptId, topicId, studentId);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("External grade error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}
