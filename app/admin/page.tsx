import { requireRole } from "@/lib/auth";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  await requireRole(["admin"]);
  const supabase = await createClient();
  const { count } = await supabase.from("subjects").select("*", { count: "exact", head: true });
  const { count: topicCount } = await supabase.from("topics").select("*", { count: "exact", head: true });
  const { count: questionCount } = await supabase.from("questions").select("*", { count: "exact", head: true });

  return (
    <>
      <h1 style={{ marginBottom: "0.5rem" }}>Admin dashboard</h1>
      <p style={{ color: "var(--muted)", marginBottom: "1.5rem" }}>
        Manage subjects, topics, lessons, and questions.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <Link href="/admin/subjects" className="card" style={{ textDecoration: "none", color: "inherit" }}>
          <strong style={{ fontSize: "1.5rem" }}>{count ?? 0}</strong>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: "0.25rem" }}>Subjects</p>
        </Link>
        <Link href="/admin/subjects" className="card" style={{ textDecoration: "none", color: "inherit" }}>
          <strong style={{ fontSize: "1.5rem" }}>{topicCount ?? 0}</strong>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: "0.25rem" }}>Topics</p>
        </Link>
        <Link href="/admin/questions" className="card" style={{ textDecoration: "none", color: "inherit" }}>
          <strong style={{ fontSize: "1.5rem" }}>{questionCount ?? 0}</strong>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: "0.25rem" }}>Questions</p>
        </Link>
      </div>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <Link href="/admin/subjects" className="btn btn-primary">Manage subjects</Link>
        <Link href="/admin/attempts" className="btn btn-secondary">Quiz attempts</Link>
        <Link href="/admin/notes/upload" className="btn btn-secondary">Upload notes (PDF)</Link>
      </div>
    </>
  );
}
