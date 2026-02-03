import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Subject } from "@/lib/types";

export default async function AdminSubjectsPage() {
  await requireRole(["admin"]);
  const supabase = await createClient();
  const { data: subjects } = await supabase
    .from("subjects")
    .select("*")
    .order("sort_order", { ascending: true });

  const list = (subjects ?? []) as Subject[];

  return (
    <>
      <nav style={{ marginBottom: "1rem" }}>
        <Link href="/admin" style={{ color: "var(--muted)", fontSize: "0.9rem" }}>← Admin</Link>
      </nav>
      <h1 style={{ marginBottom: "0.5rem" }}>Subjects</h1>
      <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>
        Add or edit subjects. Year 8 default subjects + custom (e.g. Edo Language).
      </p>
      <Link href="/admin/subjects/new" className="btn btn-primary" style={{ marginBottom: "1.5rem" }}>
        Add subject
      </Link>
      <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {list.map((s) => (
          <li key={s.id}>
            <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
              <div>
                <Link href={`/admin/subjects/${s.id}/topics`} style={{ color: "inherit", fontWeight: 600 }}>{s.name}</Link>
                <span className="badge badge-muted" style={{ marginLeft: "0.5rem" }}>{s.class_level} · {s.term}</span>
                {s.is_custom && <span className="badge badge-warning" style={{ marginLeft: "0.35rem" }}>Custom</span>}
                {s.description && (
                  <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: "0.35rem" }}>{s.description}</p>
                )}
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <Link href={`/admin/subjects/${s.id}/topics`} className="btn btn-secondary" style={{ padding: "0.4rem 0.8rem" }}>
                  Topics
                </Link>
                <Link href={`/admin/subjects/${s.id}/edit`} className="btn btn-secondary" style={{ padding: "0.4rem 0.8rem" }}>
                  Edit
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {list.length === 0 && (
        <p style={{ color: "var(--muted)" }}>No subjects. Add one to get started.</p>
      )}
    </>
  );
}
