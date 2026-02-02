"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface QuestionRow {
  id: string;
  question_text: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
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
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState<{ questionId: string; selectedIndex: number }[]>([]);
  const [scoreSaved, setScoreSaved] = useState(false);
  const [finalScore, setFinalScore] = useState<{ correct: number; total: number; percent: number } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("questions")
      .select("id, question_text, options, correct_index, explanation")
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
  const isCorrect = selected !== null && selected === q.correct_index;
  const showResult = submitted && selected !== null;

  async function handleNext() {
    if (selected === null) return;
    const newAnswers = [...answers, { questionId: q.id, selectedIndex: selected }];
    setAnswers(newAnswers);
    if (current < questions.length - 1) {
      setCurrent((c) => c + 1);
      setSelected(null);
      setSubmitted(false);
    } else {
      const correct = newAnswers.filter(
        (a, i) => questions[i].correct_index === a.selectedIndex
      ).length;
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
      <ul style={{ listStyle: "none" }}>
        {(q.options || []).map((opt, i) => (
          <li key={i} style={{ marginBottom: "0.5rem" }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{
                width: "100%",
                textAlign: "left",
                background:
                  submitted && i === q.correct_index
                    ? "rgba(52, 211, 153, 0.2)"
                    : submitted && i === selected && i !== q.correct_index
                    ? "rgba(248, 113, 113, 0.2)"
                    : selected === i
                    ? "var(--border)"
                    : undefined,
              }}
              onClick={() => !submitted && setSelected(i)}
              disabled={submitted}
            >
              {opt}
              {submitted && i === q.correct_index && " ✓"}
              {submitted && i === selected && i !== q.correct_index && " ✗"}
            </button>
          </li>
        ))}
      </ul>
      {showResult && q.explanation && (
        <p style={{ marginTop: "1rem", padding: "0.75rem", background: "var(--bg)", borderRadius: 8, fontSize: "0.9rem" }}>
          {q.explanation}
        </p>
      )}
      <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
        {!submitted ? (
          <button
            className="btn btn-primary"
            onClick={() => setSubmitted(true)}
            disabled={selected === null}
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
