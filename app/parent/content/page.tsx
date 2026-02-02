import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Subject } from "@/lib/types";

export default async function ParentContentPage() {
  await requireRole(["parent"]);
  const supabase = await createClient();
  const { data: subjects } = await supabase
    .from("subjects")
    .select("*")
    .order("sort_order", { ascending: true });

  const list = (subjects ?? []) as Subject[];

  return (
    <>
      <nav style={{ marginBottom: "1rem" }}>
        <Link href="/parent" style={{ color: "var(--muted)", fontSize: "0.9rem" }}>← My children</Link>
      </nav>
      <h1 style={{ marginBottom: "0.5rem" }}>Browse content (read-only)</h1>
      <p style={{ color: "var(--muted)", marginBottom: "1.5rem" }}>
        See the same subjects, topics, and lessons your child studies.
      </p>
      <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {list.map((s) => (
          <li key={s.id}>
            <Link
              href={`/parent/content/subjects/${s.id}`}
              className="card"
              style={{ display: "block", color: "inherit", textDecoration: "none" }}
            >
              <strong>{s.name}</strong>
              {s.description && (
                <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: "0.35rem" }}>{s.description}</p>
              )}
              <span className="badge badge-muted" style={{ marginTop: "0.5rem" }}>{s.class_level} · {s.term}</span>
            </Link>
          </li>
        ))}
      </ul>
      {list.length === 0 && <p style={{ color: "var(--muted)" }}>No subjects yet.</p>}
    </>
  );
}
