import { requireRole } from "@/lib/auth";
import Link from "next/link";
import { LessonForm } from "@/app/admin/lessons/LessonForm";

export default async function NewLessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["admin"]);
  const { id: topicId } = await params;
  return (
    <>
      <nav style={{ marginBottom: "1rem" }}>
        <Link href={`/admin/topics/${topicId}/lessons`} style={{ color: "var(--muted)", fontSize: "0.9rem" }}>← Lessons</Link>
      </nav>
      <h1 style={{ marginBottom: "1rem" }}>Add lesson</h1>
      <LessonForm topicId={topicId} />
    </>
  );
}
