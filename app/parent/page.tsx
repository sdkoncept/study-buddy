import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ParentDashboard } from "./ParentDashboard";

export default async function ParentPage() {
  await requireRole(["parent"]);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: links } = await supabase
    .from("parent_students")
    .select("student_id")
    .eq("parent_id", user.id);

  const studentIds = (links ?? []).map((l: { student_id: string }) => l.student_id);
  let students: { id: string; name: string; email: string }[] = [];
  if (studentIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", studentIds);
    students = (profiles ?? []).map((p: { id: string; full_name: string | null; email: string }) => ({
      id: p.id,
      name: p.full_name ?? "Student",
      email: p.email ?? "",
    }));
  }

  return (
    <>
      <h1 style={{ marginBottom: "0.5rem" }}>My children</h1>
      <p style={{ color: "var(--muted)", marginBottom: "1.5rem" }}>
        View progress for each linked student.
      </p>
      <ParentDashboard students={students} />
    </>
  );
}
