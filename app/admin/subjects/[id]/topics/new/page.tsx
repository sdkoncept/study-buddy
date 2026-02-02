import { requireRole } from "@/lib/auth";
import Link from "next/link";
import { TopicForm } from "../../../TopicForm";

export default async function NewTopicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["admin"]);
  const { id: subjectId } = await params;
  return (
    <>
      <nav style={{ marginBottom: "1rem" }}>
        <Link href={`/admin/subjects/${subjectId}/topics`} style={{ color: "var(--muted)", fontSize: "0.9rem" }}>← Topics</Link>
      </nav>
      <h1 style={{ marginBottom: "1rem" }}>Add topic</h1>
      <TopicForm subjectId={subjectId} />
    </>
  );
}
