import { requireRole } from "@/lib/auth";
import Link from "next/link";
import { QuestionForm } from "@/app/admin/questions/QuestionForm";

export default async function NewQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["admin"]);
  const { id: topicId } = await params;
  return (
    <>
      <nav style={{ marginBottom: "1rem" }}>
        <Link href={`/admin/topics/${topicId}/questions`} style={{ color: "var(--muted)", fontSize: "0.9rem" }}>← Questions</Link>
      </nav>
      <h1 style={{ marginBottom: "1rem" }}>Add question</h1>
      <QuestionForm topicId={topicId} />
    </>
  );
}
