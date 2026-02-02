import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { QuestionForm } from "../../QuestionForm";
import type { Question } from "@/lib/types";

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["admin"]);
  const { id } = await params;
  const supabase = await createClient();
  const { data: question, error } = await supabase
    .from("questions")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !question) notFound();

  const q = question as Question;
  return (
    <>
      <nav style={{ marginBottom: "1rem" }}>
        <Link href={`/admin/topics/${q.topic_id}/questions`} style={{ color: "var(--muted)", fontSize: "0.9rem" }}>← Questions</Link>
      </nav>
      <h1 style={{ marginBottom: "1rem" }}>Edit question</h1>
      <QuestionForm topicId={q.topic_id} question={q} />
    </>
  );
}
