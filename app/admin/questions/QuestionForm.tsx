"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type QuestionFormProps = {
  topicId: string;
  question?: {
    id: string;
    topic_id: string;
    question_text: string;
    options: string[];
    correct_index: number;
    explanation: string | null;
  };
};

export function QuestionForm({ topicId, question }: QuestionFormProps) {
  const router = useRouter();
  const [questionText, setQuestionText] = useState(question?.question_text ?? "");
  const [optionsText, setOptionsText] = useState(
    question?.options ? (question.options as string[]).join("\n") : ""
  );
  const [correctIndex, setCorrectIndex] = useState(question?.correct_index ?? 0);
  const [explanation, setExplanation] = useState(question?.explanation ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const options = optionsText.split("\n").map((s) => s.trim()).filter(Boolean);
    if (options.length < 2) {
      setError("Add at least 2 options (one per line).");
      return;
    }
    if (correctIndex < 0 || correctIndex >= options.length) {
      setError("Correct option index must be between 0 and " + (options.length - 1) + ".");
      return;
    }
    setLoading(true);
    const url = question ? `/api/admin/questions/${question.id}` : "/api/admin/questions";
    const res = await fetch(url, {
      method: question ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic_id: topicId,
        question_text: questionText.trim(),
        options,
        correct_index: correctIndex,
        explanation: explanation.trim() || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    router.push(`/admin/topics/${topicId}/questions`);
    router.refresh();
  }

  const optionCount = optionsText.split("\n").filter((s) => s.trim()).length;

  return (
    <form onSubmit={handleSubmit} className="card" style={{ maxWidth: "640px" }}>
      <div className="form-group">
        <label htmlFor="question_text">Question</label>
        <textarea
          id="question_text"
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          required
          rows={2}
          placeholder="e.g. In the equation 3 + y = 10, what is y?"
        />
      </div>
      <div className="form-group">
        <label htmlFor="options">Options (one per line; first line = index 0)</label>
        <textarea
          id="options"
          value={optionsText}
          onChange={(e) => setOptionsText(e.target.value)}
          required
          rows={5}
          placeholder={"4\n5\n6\n7"}
        />
      </div>
      <div className="form-group">
        <label htmlFor="correct_index">Correct option index (0 to {Math.max(0, optionCount - 1)})</label>
        <input
          id="correct_index"
          type="number"
          min={0}
          max={Math.max(0, optionCount - 1)}
          value={correctIndex}
          onChange={(e) => setCorrectIndex(Number(e.target.value))}
        />
      </div>
      <div className="form-group">
        <label htmlFor="explanation">Explanation (shown after answer)</label>
        <textarea
          id="explanation"
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          rows={2}
          placeholder="Short explanation..."
        />
      </div>
      {error && <p style={{ color: "var(--error)", marginBottom: "0.5rem", fontSize: "0.9rem" }}>{error}</p>}
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Saving…" : question ? "Update" : "Create"}
        </button>
        <Link href={`/admin/topics/${topicId}/questions`} className="btn btn-secondary">Cancel</Link>
      </div>
    </form>
  );
}
