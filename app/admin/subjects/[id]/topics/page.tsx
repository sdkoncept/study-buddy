import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Subject, Topic } from "@/lib/types";
import { DeleteButton } from "../../../DeleteButton";

export default async function AdminTopicsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["admin"]);
  const { id: subjectId } = await params;
  const supabase = await createClient();

  const { data: subject, error: subErr } = await supabase
    .from("subjects")
    .select("*")
    .eq("id", subjectId)
    .single();

  if (subErr || !subject) notFound();

  const { data: topics } = await supabase
    .from("topics")
    .select("*")
    .eq("subject_id", subjectId)
    .order("sort_order", { ascending: true });

  const sub = subject as Subject;
  const list = (topics ?? []) as Topic[];

  return (
    <>
      <nav style={{ marginBottom: "1rem" }}>
        <Link href="/admin/subjects" style={{ color: "var(--muted)", fontSize: "0.9rem" }}>← Subjects</Link>
      </nav>
      <h1 style={{ marginBottom: "0.5rem" }}>{sub.name} — Topics</h1>
      <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>Add topics and lessons.</p>
      <Link href={`/admin/subjects/${subjectId}/topics/new`} className="btn btn-primary" style={{ marginBottom: "1.5rem" }}>
        Add topic
      </Link>
      <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {list.map((t) => (
          <li key={t.id}>
            <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
              <div>
                <Link href={`/admin/topics/${t.id}/lessons`} style={{ color: "inherit", fontWeight: 600 }}>{t.title}</Link>
                {t.week_range && <span className="badge badge-muted" style={{ marginLeft: "0.5rem" }}>Week {t.week_range}</span>}
                <span className="badge badge-muted" style={{ marginLeft: "0.5rem" }}>{t.estimated_study_time_minutes} min · {t.difficulty_level ?? "—"}</span>
                {t.learning_objectives && (
                  <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: "0.35rem" }}>{t.learning_objectives}</p>
                )}
              </div>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                <Link href={`/admin/topics/${t.id}/lessons`} className="btn btn-secondary" style={{ padding: "0.4rem 0.8rem" }}>Lessons</Link>
                <Link href={`/admin/topics/${t.id}/questions`} className="btn btn-secondary" style={{ padding: "0.4rem 0.8rem" }}>Questions</Link>
                <Link href={`/admin/topics/${t.id}/edit`} className="btn btn-secondary" style={{ padding: "0.4rem 0.8rem" }}>Edit</Link>
                <DeleteButton
                  endpoint={`/api/admin/topics/${t.id}`}
                  redirectTo={`/admin/subjects/${subjectId}/topics`}
                  label="Delete"
                  itemName={t.title}
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
      {list.length === 0 && <p style={{ color: "var(--muted)" }}>No topics. Add one to get started.</p>}
    </>
  );
}
