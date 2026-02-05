import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function AdminAllQuestionsPage() {
  await requireRole(["admin"]);
  const supabase = await createClient();

  const { data: questions } = await supabase
    .from("questions")
    .select("id, topic_id, question_text, options, correct_index, topics(id, title, subject_id, subjects(id, name))")
    .order("topic_id", { ascending: true });

  // Supabase returns joined relation as "topics" (table name); may be object or array
  type TopicWithSubject = { id: string; title: string; subject_id: string; subjects: { name: string } | null };
  const list = (questions ?? []).map((q) => {
    const raw = (q as unknown as { topics?: TopicWithSubject | TopicWithSubject[] }).topics;
    const topic: TopicWithSubject | undefined = Array.isArray(raw) ? raw[0] : raw;
    return { ...q, topic };
  });


  return (
    <>
      <nav style={{ marginBottom: "1rem" }}>
        <Link href="/admin" style={{ color: "var(--muted)", fontSize: "0.9rem" }}>← Admin</Link>
      </nav>
      <h1 style={{ marginBottom: "0.5rem" }}>All questions</h1>
      <p style={{ color: "var(--muted)", marginBottom: "1.5rem" }}>
        {list.length} question{list.length !== 1 ? "s" : ""}. Click a question to edit, or use the topic link to manage that topic&apos;s quiz.
      </p>
      <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {list.map((q) => (
          <li key={q.id}>
            <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
              <div style={{ flex: "1 1 300px" }}>
                <Link href={`/admin/questions/${q.id}/edit`} style={{ color: "inherit", fontWeight: 600, fontSize: "0.95rem" }}>
                  {q.question_text}
                </Link>
                <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: "0.35rem" }}>
                  {(q as unknown as { question_type?: string }).question_type === "external_answer"
                    ? "Answer outside platform"
                    : (q as unknown as { question_type?: string }).question_type === "short_answer"
                    ? `Short answer → correct: "${(q as unknown as { correct_answer_text?: string }).correct_answer_text ?? "—"}"`
                    : (() => {
                        const correctIndices = (q as unknown as { correct_indices?: number[] }).correct_indices;
                        const ind = correctIndices?.length ? correctIndices : [q.correct_index];
                        return `Multiple choice → correct indices: ${ind.join(", ")}`;
                      })()}
                </p>
                {q.topic && (
                  <p style={{ color: "var(--muted)", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                    <Link href={`/admin/topics/${q.topic_id}/questions`} style={{ color: "var(--muted)" }}>
                      {q.topic.subjects?.name ?? "—"} → {q.topic.title}
                    </Link>
                  </p>
                )}
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <Link href={`/admin/topics/${q.topic_id}/questions`} className="btn btn-secondary" style={{ padding: "0.4rem 0.8rem" }}>Topic questions</Link>
                <Link href={`/admin/questions/${q.id}/edit`} className="btn btn-primary" style={{ padding: "0.4rem 0.8rem" }}>Edit</Link>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {list.length === 0 && (
        <p style={{ color: "var(--muted)" }}>No questions yet. Add topics and then add questions from each topic&apos;s page.</p>
      )}
    </>
  );
}
