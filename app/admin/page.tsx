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
        <div className="card">
          <strong style={{ fontSize: "1.5rem" }}>{count ?? 0}</strong>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: "0.25rem" }}>Subjects</p>
        </div>
        <div className="card">
          <strong style={{ fontSize: "1.5rem" }}>{topicCount ?? 0}</strong>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: "0.25rem" }}>Topics</p>
        </div>
        <div className="card">
          <strong style={{ fontSize: "1.5rem" }}>{questionCount ?? 0}</strong>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: "0.25rem" }}>Questions</p>
        </div>
      </div>
      <Link href="/admin/subjects" className="btn btn-primary">Manage subjects</Link>
    </>
  );
}
