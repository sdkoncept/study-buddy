import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Topic, Lesson } from "@/lib/types";

export default async function AdminLessonsPage({
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

  const { data: lessons } = await supabase
    .from("lessons")
    .select("*")
    .eq("topic_id", topicId)
    .order("sort_order", { ascending: true });

  const t = topic as Topic & { subjects: { id: string; name: string } };
  const list = (lessons ?? []) as Lesson[];

  return (
    <>
      <nav style={{ marginBottom: "1rem" }}>
        <Link href={`/admin/subjects/${t.subject_id}/topics`} style={{ color: "var(--muted)", fontSize: "0.9rem" }}>← Topics</Link>
      </nav>
      <h1 style={{ marginBottom: "0.5rem" }}>{t.title} — Lessons</h1>
      <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>{t.subjects?.name}</p>
      <Link href={`/admin/topics/${topicId}/lessons/new`} className="btn btn-primary" style={{ marginBottom: "1.5rem" }}>
        Add lesson
      </Link>
      <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {list.map((l) => (
          <li key={l.id}>
            <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
              <div>
                <Link href={`/admin/lessons/${l.id}/edit`} style={{ color: "inherit", fontWeight: 600 }}>{l.title}</Link>
                <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: "0.35rem", maxWidth: "60ch" }}>
                  {l.content.slice(0, 120)}…
                </p>
              </div>
              <Link href={`/admin/lessons/${l.id}/edit`} className="btn btn-secondary" style={{ padding: "0.4rem 0.8rem" }}>Edit</Link>
            </div>
          </li>
        ))}
      </ul>
      {list.length === 0 && <p style={{ color: "var(--muted)" }}>No lessons. Add one to get started.</p>}
    </>
  );
}
