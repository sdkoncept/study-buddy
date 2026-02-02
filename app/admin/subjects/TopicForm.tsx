"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type TopicFormProps = {
  subjectId: string;
  topic?: {
    id: string;
    subject_id: string;
    title: string;
    learning_objectives: string | null;
    estimated_study_time_minutes: number;
    difficulty_level: string | null;
  };
};

export function TopicForm({ subjectId, topic }: TopicFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(topic?.title ?? "");
  const [learningObjectives, setLearningObjectives] = useState(topic?.learning_objectives ?? "");
  const [estimatedMinutes, setEstimatedMinutes] = useState(topic?.estimated_study_time_minutes ?? 15);
  const [difficulty, setDifficulty] = useState(topic?.difficulty_level ?? "Easy");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const url = topic ? `/api/admin/topics/${topic.id}` : "/api/admin/topics";
    const res = await fetch(url, {
      method: topic ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject_id: subjectId,
        title: title.trim(),
        learning_objectives: learningObjectives.trim() || null,
        estimated_study_time_minutes: estimatedMinutes,
        difficulty_level: difficulty,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    router.push(`/admin/subjects/${subjectId}/topics`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ maxWidth: "480px" }}>
      <div className="form-group">
        <label htmlFor="title">Topic title</label>
        <input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="e.g. Introduction to Algebra"
        />
      </div>
      <div className="form-group">
        <label htmlFor="learning_objectives">Learning objectives</label>
        <textarea
          id="learning_objectives"
          value={learningObjectives}
          onChange={(e) => setLearningObjectives(e.target.value)}
          placeholder="What the student should learn"
        />
      </div>
      <div className="form-group">
        <label htmlFor="estimated_minutes">Estimated study time (minutes)</label>
        <input
          id="estimated_minutes"
          type="number"
          min={1}
          value={estimatedMinutes}
          onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
        />
      </div>
      <div className="form-group">
        <label htmlFor="difficulty">Difficulty</label>
        <select id="difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
        </select>
      </div>
      {error && <p style={{ color: "var(--error)", marginBottom: "0.5rem", fontSize: "0.9rem" }}>{error}</p>}
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Saving…" : topic ? "Update" : "Create"}
        </button>
        <Link href={`/admin/subjects/${subjectId}/topics`} className="btn btn-secondary">Cancel</Link>
      </div>
    </form>
  );
}
