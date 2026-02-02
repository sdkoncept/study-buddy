import { requireRole } from "@/lib/auth";
import Link from "next/link";
import { SubjectForm } from "../SubjectForm";

export default async function NewSubjectPage() {
  await requireRole(["admin"]);
  return (
    <>
      <nav style={{ marginBottom: "1rem" }}>
        <Link href="/admin/subjects" style={{ color: "var(--muted)", fontSize: "0.9rem" }}>← Subjects</Link>
      </nav>
      <h1 style={{ marginBottom: "1rem" }}>Add subject</h1>
      <SubjectForm />
    </>
  );
}
