import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { UploadNotesForm } from "./UploadNotesForm";

export default async function AdminUploadNotesPage() {
  await requireRole(["admin"]);
  const supabase = await createClient();
  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name")
    .order("sort_order", { ascending: true });

  const list = (subjects ?? []) as { id: string; name: string }[];

  return (
    <>
      <nav style={{ marginBottom: "1rem" }}>
        <Link href="/admin" style={{ color: "var(--muted)", fontSize: "0.9rem" }}>← Admin</Link>
      </nav>
      <h1 style={{ marginBottom: "0.5rem" }}>Upload notes (PDF)</h1>
      <p style={{ color: "var(--muted)", marginBottom: "1.5rem" }}>
        Pick a subject and upload a notes PDF. The platform parses the scheme of work and section headings to create topics and lessons. Week ranges (e.g. 1 & 2, 3) are extracted so you can upload the same subject multiple times (e.g. Mathematics for different terms or weeks)—each upload adds new topics and lessons.
      </p>
      <UploadNotesForm subjects={list} />
    </>
  );
}
