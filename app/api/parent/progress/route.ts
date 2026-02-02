import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profileRes = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const profile = profileRes.data as { role: string } | null;
  if (!profile || profile.role !== "parent") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId");
  if (!studentId) {
    return NextResponse.json({ error: "studentId required" }, { status: 400 });
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

  const [
    countRes,
    attemptsRes,
    lessonProgressRes,
    goalRes,
    messageRes,
  ] = await Promise.allSettled([
    supabase.from("lesson_progress").select("id", { count: "exact", head: true }).eq("user_id", studentId),
    supabase
      .from("quiz_attempts")
      .select("id, topic_id, score_percent, created_at, answers_json, topics(title, subjects(name))")
      .eq("user_id", studentId)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("lesson_progress")
      .select("completed_at, time_spent_seconds, lessons(title, topics(title, subjects(name)))")
      .eq("user_id", studentId)
      .order("completed_at", { ascending: false })
      .limit(50),
    supabase.from("parent_goals").select("topics_per_week").eq("parent_id", user.id).eq("student_id", studentId).maybeSingle(),
    supabase.from("parent_messages").select("id, body, created_at").eq("parent_id", user.id).eq("student_id", studentId).order("created_at", { ascending: false }).limit(5),
  ]);

  const lessonsCompleted = countRes.status === "fulfilled" ? ((countRes.value as { count: number }).count ?? 0) : 0;
  const attemptsRaw = attemptsRes.status === "fulfilled" ? (attemptsRes.value as { data: unknown }).data : null;
  const attempts = Array.isArray(attemptsRaw) ? attemptsRaw : [];
  const lessonProgressRowsRaw = lessonProgressRes.status === "fulfilled" ? (lessonProgressRes.value as { data: unknown }).data : null;
  const lessonProgressRows = Array.isArray(lessonProgressRowsRaw) ? lessonProgressRowsRaw : [];
  const goalRow = goalRes.status === "fulfilled" ? (goalRes.value as { data: { topics_per_week: number } | null }).data : null;
  const messageRows = messageRes.status === "fulfilled" ? ((messageRes.value as { data: unknown }).data ?? []) as { id: string; body: string; created_at: string }[] : [];

  type LessonRow = {
    completed_at: string;
    time_spent_seconds: number;
    lessons: { title: string; topics: { title: string; subjects: { name: string } | null } | null } | null;
  };
  type AttemptRow = {
    id: string;
    topic_id: string;
    score_percent: number;
    created_at: string;
    answers_json: { questionId: string; selectedIndex: number }[] | null;
    topics: { title: string; subjects: { name: string } | null } | null;
  };

  const quizAttempts = attempts.map((a: AttemptRow) => ({
    id: a.id,
    topic_title: a.topics?.title ?? "Topic",
    subject_name: a.topics?.subjects?.name ?? "",
    score_percent: a.score_percent,
    created_at: a.created_at,
  }));

  const activityFeed: { type: "lesson" | "quiz"; date: string; title: string; detail: string; attemptId?: string }[] = [];
  lessonProgressRows.forEach((r: LessonRow) => {
    const lesson = r.lessons;
    const topic = lesson?.topics;
    const subject = topic?.subjects;
    activityFeed.push({
      type: "lesson",
      date: r.completed_at,
      title: lesson?.title ?? "Lesson",
      detail: `${topic?.title ?? ""} · ${subject?.name ?? ""}${r.time_spent_seconds ? ` · ${Math.round(r.time_spent_seconds / 60)} min` : ""}`,
    });
  });
  attempts.forEach((a: AttemptRow) => {
    const topic = a.topics;
    activityFeed.push({
      type: "quiz",
      date: a.created_at,
      title: topic?.title ?? "Quiz",
      detail: `${topic?.subjects?.name ?? ""} · ${a.score_percent}%`,
      attemptId: a.id,
    });
  });
  activityFeed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thisWeek = activityFeed.filter((e) => new Date(e.date) >= oneWeekAgo);
  const lessonsThisWeek = thisWeek.filter((e) => e.type === "lesson").length;
  const quizzesThisWeek = thisWeek.filter((e) => e.type === "quiz").length;
  const totalTimeThisWeek = lessonProgressRows
    .filter((r: LessonRow) => new Date(r.completed_at) >= oneWeekAgo)
    .reduce((sum: number, r: LessonRow) => sum + (r.time_spent_seconds ?? 0), 0);
  const lastActivityAt =
    activityFeed.length > 0 ? activityFeed[0].date : null;

  const activityDates = new Set(
    activityFeed.map((e) => new Date(e.date).toDateString())
  );
  let streakDays = 0;
  const today = new Date().toDateString();
  for (let d = new Date(); streakDays < 365; d.setDate(d.getDate() - 1)) {
    if (activityDates.has(d.toDateString())) streakDays++;
    else break;
  }

  const weakTopics = Array.from(new Set(
    quizAttempts.filter((a) => a.score_percent < 60).map((a) => a.topic_title)
  ));

  const daysSinceActivity = lastActivityAt
    ? Math.floor((now.getTime() - new Date(lastActivityAt).getTime()) / (24 * 60 * 60 * 1000))
    : null;

  return NextResponse.json({
    lessonsCompleted: lessonsCompleted ?? 0,
    quizAttempts,
    weakTopics,
    activityFeed: activityFeed.slice(0, 30),
    weeklySummary: {
      lessonsThisWeek,
      quizzesThisWeek,
      totalTimeMinutes: Math.round(totalTimeThisWeek / 60),
      lastActivityAt,
      streakDays,
    },
    daysSinceActivity,
    goal: goalRow?.topics_per_week ?? null,
    messages: messageRows.map((m) => ({ id: m.id, body: m.body, created_at: m.created_at })),
  });
}
