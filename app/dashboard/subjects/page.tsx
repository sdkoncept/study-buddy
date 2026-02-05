import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Subject } from "@/lib/types";
import { StudyHelpChat } from "../StudyHelpChat";

export default async function SubjectsPage() {
  await requireRole(["student"]);
  const supabase = await createClient();
  const { data: subjects } = await supabase
    .from("subjects")
    .select("*")
    .order("sort_order", { ascending: true });

  const list = (subjects ?? []) as Subject[];

  return (
    <>
      <h1 style={{ marginBottom: "0.5rem" }}>Subjects</h1>
      <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>
        Choose a subject to study. Year 8 — First term.
      </p>
      <div style={{ marginBottom: "1.5rem" }}>
        <StudyHelpChat variant="button" />
      </div>
      <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {list.map((s) => (
          <li key={s.id}>
            <Link
              href={`/dashboard/subjects/${s.id}`}
              className="card"
              style={{
                display: "block",
                color: "inherit",
                textDecoration: "none",
                transition: "border-color 0.2s",
              }}
            >
              <strong>{s.name}</strong>
              {s.description && (
                <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: "0.35rem" }}>
                  {s.description}
                </p>
              )}
              <span className="badge badge-muted" style={{ marginTop: "0.5rem" }}>
                {s.class_level} · {s.term}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {list.length === 0 && (
        <p style={{ color: "var(--muted)" }}>No subjects yet. Ask your admin to add some.</p>
      )}
    </>
  );
}
