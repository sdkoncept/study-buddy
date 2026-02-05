import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Topic, Lesson } from "@/lib/types";
import { TopicContent } from "./TopicContent";

export default async function TopicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["student"]);
  const { id: topicId } = await params;
  const supabase = await createClient();

  const { data: topic, error: topicErr } = await supabase
    .from("topics")
    .select("*, subjects(id, name)")
    .eq("id", topicId)
    .single();

  if (topicErr || !topic) notFound();

  const { data: lessons } = await supabase
    .from("lessons")
    .select("*")
    .eq("topic_id", topicId)
    .order("sort_order", { ascending: true });

  const { data: questions } = await supabase
    .from("questions")
    .select("id")
    .eq("topic_id", topicId);

  const t = topic as Topic & { subjects: { id: string; name: string } };
  const lessonList = (lessons ?? []) as Lesson[];
  const questionCount = questions?.length ?? 0;

  return (
    <>
      <nav style={{ marginBottom: "1rem" }}>
        <Link
          href={`/dashboard/subjects/${t.subject_id}`}
          style={{ color: "var(--muted)", fontSize: "0.9rem" }}
        >
          ← {t.subjects?.name ?? "Subject"}
        </Link>
      </nav>
      <h1 style={{ marginBottom: "0.5rem" }}>{t.title}</h1>
      {t.learning_objectives && (
        <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>{t.learning_objectives}</p>
      )}
      <TopicContent
        topicId={topicId}
        topicTitle={t.title}
        subjectName={t.subjects?.name ?? "Subject"}
        lessons={lessonList}
        questionCount={questionCount}
        estimatedStudyTimeMinutes={t.estimated_study_time_minutes ?? 15}
      />
    </>
  );
}
