import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Topic, Question } from "@/lib/types";

export default async function AdminQuestionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["admin"]);
  const { id: topicId } = await params;
  const supabase = await createClient();

  const { data: topic, error: topicErr } = await supabase
    .from("topics")
    .select("*, subjects(id, name)")
    .eq("id", topicId)
    .single();

  if (topicErr || !topic) notFound();

  const { data: questions } = await supabase
    .from("questions")
    .select("*")
    .eq("topic_id", topicId);

  const t = topic as Topic & { subjects: { id: string; name: string } };
  const list = (questions ?? []) as Question[];

  return (
    <>
      <nav style={{ marginBottom: "1rem" }}>
        <Link href={`/admin/subjects/${t.subject_id}/topics`} style={{ color: "var(--muted)", fontSize: "0.9rem" }}>← Topics</Link>
      </nav>
      <h1 style={{ marginBottom: "0.5rem" }}>{t.title} — Questions</h1>
      <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>Topic quiz: 5–10 questions recommended.</p>
      <Link href={`/admin/topics/${topicId}/questions/new`} className="btn btn-primary" style={{ marginBottom: "1.5rem" }}>
        Add question
      </Link>
      <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {list.map((q) => (
          <li key={q.id}>
            <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
              <div style={{ flex: "1 1 300px" }}>
                <strong style={{ fontSize: "0.9rem" }}>{q.question_text}</strong>
                <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: "0.35rem" }}>
                  Options: {(q.options as string[]).join(" · ")} → correct index: {q.correct_index}
                </p>
              </div>
              <Link href={`/admin/questions/${q.id}/edit`} className="btn btn-secondary" style={{ padding: "0.4rem 0.8rem" }}>Edit</Link>
            </div>
          </li>
        ))}
      </ul>
      {list.length === 0 && <p style={{ color: "var(--muted)" }}>No questions. Add some for the topic quiz.</p>}
    </>
  );
}
