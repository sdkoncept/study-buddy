import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LessonForm } from "../../LessonForm";
import type { Lesson } from "@/lib/types";

export default async function EditLessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["admin"]);
  const { id } = await params;
  const supabase = await createClient();
  const { data: lesson, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !lesson) notFound();

  const l = lesson as Lesson;
  return (
    <>
      <nav style={{ marginBottom: "1rem" }}>
        <Link href={`/admin/topics/${l.topic_id}/lessons`} style={{ color: "var(--muted)", fontSize: "0.9rem" }}>← Lessons</Link>
      </nav>
      <h1 style={{ marginBottom: "1rem" }}>Edit lesson</h1>
      <LessonForm topicId={l.topic_id} lesson={l} />
    </>
  );
}
