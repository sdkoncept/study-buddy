import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Subject, Topic } from "@/lib/types";

export default async function ParentSubjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["parent"]);
  const { id } = await params;
  const supabase = await createClient();

  const { data: subject, error: subErr } = await supabase
    .from("subjects")
    .select("*")
    .eq("id", id)
    .single();

  if (subErr || !subject) notFound();

  const { data: topics } = await supabase
    .from("topics")
    .select("*")
    .eq("subject_id", id)
    .order("sort_order", { ascending: true });

  const sub = subject as Subject;
  const topicList = (topics ?? []) as Topic[];

  return (
    <>
      <nav style={{ marginBottom: "1rem" }}>
        <Link href="/parent/content" style={{ color: "var(--muted)", fontSize: "0.9rem" }}>← Browse content</Link>
      </nav>
      <h1 style={{ marginBottom: "0.5rem" }}>{sub.name}</h1>
      {sub.description && <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>{sub.description}</p>}
      <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>Topics</h2>
      <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {topicList.map((t) => (
          <li key={t.id}>
            <Link
              href={`/parent/content/topics/${t.id}`}
              className="card"
              style={{ display: "block", color: "inherit", textDecoration: "none" }}
            >
              <strong>{t.title}</strong>
              {t.learning_objectives && (
                <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: "0.35rem" }}>{t.learning_objectives}</p>
              )}
              <span className="badge badge-muted" style={{ marginTop: "0.5rem" }}>{t.estimated_study_time_minutes} min</span>
            </Link>
          </li>
        ))}
      </ul>
      {topicList.length === 0 && <p style={{ color: "var(--muted)" }}>No topics.</p>}
    </>
  );
}
