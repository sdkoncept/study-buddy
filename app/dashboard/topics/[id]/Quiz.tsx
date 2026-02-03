"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface QuestionRow {
  id: string;
  question_text: string;
  question_type: "multiple_choice" | "short_answer";
  options: string[];
  correct_index: number;
  correct_indices: number[] | null;
  correct_answer_text: string | null;
  explanation: string | null;
}

type AnswerEntry = { questionId: string; selectedIndex?: number; selectedIndices?: number[]; typedAnswer?: string };

function sameSet(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort((x, y) => x - y).join(",");
  const sb = [...b].sort((x, y) => x - y).join(",");
  return sa === sb;
}

function getCorrectIndices(q: QuestionRow): number[] {
  if (q.correct_indices?.length) return q.correct_indices;
  return [q.correct_index];
}

function normalizeAnswer(s: string): string {
  return s.trim().toLowerCase();
}

export function Quiz({
  topicId,
  topicTitle,
  questionCount,
  onBack,
}: {
  topicId: string;
  topicTitle: string;
  questionCount: number;
  onBack: () => void;
}) {
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState<AnswerEntry[]>([]);
  const [scoreSaved, setScoreSaved] = useState(false);
  const [finalScore, setFinalScore] = useState<{ correct: number; total: number; percent: number } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("questions")
      .select("id, question_text, question_type, options, correct_index, correct_indices, correct_answer_text, explanation")
      .eq("topic_id", topicId)
      .limit(20)
      .then(({ data, error }) => {
        if (!error && data) setQuestions(data as QuestionRow[]);
        setLoading(false);
      });
  }, [topicId]);

  if (loading) return <p style={{ color: "var(--muted)" }}>Loading quiz…</p>;
  if (questions.length === 0) {
    return (
      <div>
        <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>No questions for this topic.</p>
        <button className="btn btn-secondary" onClick={onBack}>Back to lesson</button>
      </div>
    );
  }

  const q = questions[current];
  const isShortAnswer = (q.question_type ?? "multiple_choice") === "short_answer";
  const correctSet = getCorrectIndices(q);
  const isCorrect = isShortAnswer
    ? submitted && q.correct_answer_text != null && normalizeAnswer(typedAnswer) === normalizeAnswer(q.correct_answer_text)
    : submitted && sameSet(selectedIndices, correctSet);
  const canSubmit = isShortAnswer ? typedAnswer.trim().length > 0 : true;
  const showResult = submitted;

  function scoreAnswers(entries: AnswerEntry[]): number {
    return entries.filter((a, i) => {
      const qu = questions[i];
      if ((qu.question_type ?? "multiple_choice") === "short_answer") {
        const expected = qu.correct_answer_text?.trim();
        if (!expected) return false;
        return normalizeAnswer(a.typedAnswer ?? "") === normalizeAnswer(expected);
      }
      const theirIndices = a.selectedIndices ?? (a.selectedIndex != null ? [a.selectedIndex] : []);
      return sameSet(theirIndices, getCorrectIndices(qu));
    }).length;
  }

  const toggleOption = (i: number) => {
    if (submitted) return;
    setSelectedIndices((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i].sort((a, b) => a - b)
    );
  };

  async function handleNext() {
    const entry: AnswerEntry = isShortAnswer
      ? { questionId: q.id, typedAnswer: typedAnswer.trim() }
      : { questionId: q.id, selectedIndices: [...selectedIndices] };
    const newAnswers = [...answers, entry];
    setAnswers(newAnswers);
    if (current < questions.length - 1) {
      setCurrent((c) => c + 1);
      setSelectedIndices([]);
      setTypedAnswer("");
      setSubmitted(false);
    } else {
      const correct = scoreAnswers(newAnswers);
      const scorePercent = Math.round((correct / questions.length) * 100);
      if (!scoreSaved) {
        setFinalScore({ correct, total: questions.length, percent: scorePercent });
        setScoreSaved(true);
        await fetch("/api/progress/quiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topicId,
            scorePercent,
            answersJson: newAnswers,
          }),
        });
      }
    }
  }

  if (scoreSaved && finalScore) {
    return (
      <div className="card">
        <h2 style={{ marginBottom: "0.5rem" }}>Quiz complete</h2>
        <p style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
          Score: <strong>{finalScore.percent}%</strong> ({finalScore.correct}/{finalScore.total})
        </p>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Link href="/dashboard/subjects" className="btn btn-primary">Back to subjects</Link>
          <button className="btn btn-secondary" onClick={onBack}>Review topic</button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <p style={{ color: "var(--muted)", marginBottom: "0.5rem" }}>
        Question {current + 1} of {questions.length}
      </p>
      <h2 style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>{q.question_text}</h2>

      {isShortAnswer ? (
        <div style={{ marginBottom: "1rem" }}>
          <input
            type="text"
            value={typedAnswer}
            onChange={(e) => setTypedAnswer(e.target.value)}
            placeholder="Type your answer..."
            disabled={submitted}
            style={{
              width: "100%",
              padding: "0.75rem",
              fontSize: "1rem",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--text)",
            }}
          />
          {submitted && (
            <p style={{ marginTop: "0.5rem", fontSize: "0.9rem", color: isCorrect ? "var(--success)" : "var(--error)" }}>
              {isCorrect ? "Correct ✓" : "Not quite. See explanation below."}
            </p>
          )}
        </div>
      ) : (
        <div style={{ marginBottom: "1rem" }}>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "0.5rem" }}>Select all that apply</p>
          <ul style={{ listStyle: "none" }}>
            {(q.options || []).map((opt, i) => {
              const correct = correctSet.includes(i);
              const chosen = selectedIndices.includes(i);
              return (
                <li key={i} style={{ marginBottom: "0.5rem" }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      padding: "0.75rem",
                      background:
                        submitted && correct
                          ? "rgba(52, 211, 153, 0.2)"
                          : submitted && chosen && !correct
                          ? "rgba(248, 113, 113, 0.2)"
                          : chosen
                          ? "var(--border)"
                          : "transparent",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      cursor: submitted ? "default" : "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={chosen}
                      onChange={() => toggleOption(i)}
                      disabled={submitted}
                    />
                    <span>{opt}</span>
                    {submitted && correct && <span style={{ color: "var(--success)", marginLeft: "auto" }}>✓</span>}
                    {submitted && chosen && !correct && <span style={{ color: "var(--error)", marginLeft: "auto" }}>✗</span>}
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {showResult && q.explanation && (
        <div style={{ marginTop: "1rem", padding: "0.75rem", background: "var(--bg)", borderRadius: 8, fontSize: "0.9rem" }}>
          <strong style={{ display: "block", marginBottom: "0.35rem" }}>Explanation</strong>
          {q.explanation}
        </div>
      )}

      <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
        {!submitted ? (
          <button
            className="btn btn-primary"
            onClick={() => setSubmitted(true)}
            disabled={!canSubmit}
          >
            Submit answer
          </button>
        ) : (
          <button className="btn btn-primary" onClick={handleNext}>
            {current < questions.length - 1 ? "Next" : "Finish quiz"}
          </button>
        )}
        <button className="btn btn-secondary" onClick={onBack}>Back to lesson</button>
      </div>
    </div>
  );
}
