import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TopicForm } from "@/app/admin/subjects/TopicForm";
import type { Topic } from "@/lib/types";

export default async function EditTopicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["admin"]);
  const { id } = await params;
  const supabase = await createClient();
  const { data: topic, error } = await supabase
    .from("topics")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !topic) notFound();

  const t = topic as Topic;
  return (
    <>
      <nav style={{ marginBottom: "1rem" }}>
        <Link href={`/admin/subjects/${t.subject_id}/topics`} style={{ color: "var(--muted)", fontSize: "0.9rem" }}>← Topics</Link>
      </nav>
      <h1 style={{ marginBottom: "1rem" }}>Edit topic</h1>
      <TopicForm subjectId={t.subject_id} topic={t} />
    </>
  );
}
