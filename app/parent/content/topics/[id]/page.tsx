import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Topic, Lesson } from "@/lib/types";

export default async function ParentTopicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["parent"]);
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
  const lessonList = (lessons ?? []) as Lesson[];

  return (
    <>
      <nav style={{ marginBottom: "1rem" }}>
        <Link href={`/parent/content/subjects/${t.subject_id}`} style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
          ← {t.subjects?.name ?? "Subject"}
        </Link>
      </nav>
      <h1 style={{ marginBottom: "0.5rem" }}>{t.title}</h1>
      {t.learning_objectives && (
        <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>{t.learning_objectives}</p>
      )}
      <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>Lessons (read-only)</h2>
      <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "1rem" }}>
        {lessonList.map((l) => (
          <li key={l.id} className="card">
            <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>{l.title}</h3>
            <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, fontSize: "0.95rem" }}>{l.content}</div>
            {(() => {
              const urls = l.image_urls?.length ? l.image_urls : l.image_url ? [l.image_url] : [];
              return urls.length > 0 ? (
                <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {urls.map((src, i) => (
                    <img key={i} src={src} alt="" style={{ maxWidth: "100%", borderRadius: 8 }} />
                  ))}
                </div>
              ) : null;
            })()}
            {l.audio_url && (
              <audio controls src={l.audio_url} style={{ marginTop: "0.75rem" }} />
            )}
          </li>
        ))}
      </ul>
      {lessonList.length === 0 && <p style={{ color: "var(--muted)" }}>No lessons in this topic.</p>}
    </>
  );
}
