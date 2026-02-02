import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SubjectForm } from "../../SubjectForm";
import type { Subject } from "@/lib/types";

export default async function EditSubjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["admin"]);
  const { id } = await params;
  const supabase = await createClient();
  const { data: subject, error } = await supabase
    .from("subjects")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !subject) notFound();

  return (
    <>
      <nav style={{ marginBottom: "1rem" }}>
        <Link href="/admin/subjects" style={{ color: "var(--muted)", fontSize: "0.9rem" }}>← Subjects</Link>
      </nav>
      <h1 style={{ marginBottom: "1rem" }}>Edit subject</h1>
      <SubjectForm subject={subject as Subject} />
    </>
  );
}
