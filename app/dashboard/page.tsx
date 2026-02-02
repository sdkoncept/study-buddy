import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
  const profile = await requireProfile();

  if (profile.role === "student") {
    let goal: number | null = null;
    let message: { body: string; created_at: string } | null = null;
    try {
      const supabase = await createClient();
      const [goalRes, messageRes] = await Promise.all([
        supabase.from("parent_goals").select("topics_per_week").eq("student_id", profile.id).maybeSingle(),
        supabase.from("parent_messages").select("body, created_at").eq("student_id", profile.id).order("created_at", { ascending: false }).limit(1),
      ]);
      goal = (goalRes.data as { topics_per_week: number } | null)?.topics_per_week ?? null;
      const messageList = (messageRes.data ?? []) as { body: string; created_at: string }[];
      message = messageList[0] ?? null;
    } catch {
      // parent_goals / parent_messages tables may not exist yet
    }

    return (
      <>
        <h1 style={{ marginBottom: "0.5rem" }}>Welcome back, {profile.full_name || "Student"}!</h1>
        <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>
          Choose a subject to study today.
        </p>
        {goal != null && (
          <div className="card" style={{ marginBottom: "1rem", background: "var(--surface)" }}>
            <strong>Your parent&apos;s goal for you:</strong> Complete <strong>{goal} topics</strong> this week.
          </div>
        )}
        {message && (
          <div className="card" style={{ marginBottom: "1rem", background: "rgba(56, 189, 248, 0.1)", borderColor: "var(--accent)" }}>
            <strong>Message from parent:</strong>
            <p style={{ margin: "0.35rem 0 0", whiteSpace: "pre-wrap" }}>{message.body}</p>
            <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>{new Date(message.created_at).toLocaleString()}</span>
          </div>
        )}
        <Link href="/dashboard/subjects" className="btn btn-primary">
          View subjects
        </Link>
      </>
    );
  }

  if (profile.role === "parent") {
    redirect("/parent");
  }

  if (profile.role === "admin") {
    return (
      <>
        <h1 style={{ marginBottom: "0.5rem" }}>Admin dashboard</h1>
        <p style={{ color: "var(--muted)", marginBottom: "1.5rem" }}>
          Manage subjects, topics, lessons, and questions.
        </p>
        <Link href="/admin" className="btn btn-primary">
          Go to Admin
        </Link>
      </>
    );
  }

  return null;
}
