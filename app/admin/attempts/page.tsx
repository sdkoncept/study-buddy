"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Attempt = {
  id: string;
  user_id: string;
  topic_id: string;
  score_percent: number;
  created_at: string;
  topics: { title: string; subjects: { name: string } } | null;
  profiles: { full_name: string | null; email: string } | null;
};

type AttemptDetail = {
  topic_title: string;
  score_percent: number;
  created_at: string;
  attempt_id: string;
  student_id: string;
  wrong_answers: { question_text: string; their_answer: string; correct_answer: string; explanation: string | null }[];
  external_questions: { question_id: string; question_text: string; external_grade?: { image_url: string | null; score: number } }[];
};

function AttemptDetailCard({
  detail,
  onClose,
  onGraded,
}: {
  detail: AttemptDetail;
  onClose: () => void;
  onGraded: () => void;
}) {
  const [grading, setGrading] = useState<Record<string, { score: string; file: File | null; saving: boolean }>>(() => {
    const init: Record<string, { score: string; file: File | null; saving: boolean }> = {};
    (detail.external_questions ?? []).forEach((eq) => {
      init[eq.question_id] = { score: eq.external_grade?.score != null ? String(eq.external_grade.score) : "", file: null, saving: false };
    });
    return init;
  });
  const externals = detail.external_questions ?? [];

  async function submitGrade(qId: string) {
    if (!detail.attempt_id || !detail.student_id) return;
    const g = grading[qId];
    const score = g?.score ? parseInt(g.score, 10) : NaN;
    if (isNaN(score) || score < 0 || score > 100) return;
    setGrading((prev) => ({ ...prev, [qId]: { ...prev[qId], saving: true } }));
    try {
      const formData = new FormData();
      formData.append("attemptId", detail.attempt_id);
      formData.append("studentId", detail.student_id);
      formData.append("questionId", qId);
      formData.append("score", String(score));
      if (g?.file) formData.append("file", g.file);
      const res = await fetch("/api/external-grade", { method: "POST", body: formData });
      if (res.ok) onGraded();
    } finally {
      setGrading((prev) => ({ ...prev, [qId]: { ...prev[qId], saving: false, file: null } }));
    }
  }

  return (
    <div className="card" style={{ background: "var(--bg)", marginBottom: "1rem" }}>
      <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>Quiz: {detail.topic_title} — {detail.score_percent}%</h3>
      <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "0.75rem" }}>{new Date(detail.created_at).toLocaleString()}</p>
      {detail.wrong_answers?.length === 0 ? (
        <p style={{ color: "var(--success)", margin: 0 }}>No wrong answers.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {detail.wrong_answers.map((w, i) => (
            <li key={i} className="card" style={{ marginBottom: "0.5rem", padding: "0.75rem" }}>
              <p style={{ marginBottom: "0.35rem" }}>{w.question_text}</p>
              <p style={{ marginBottom: "0.2rem", color: "var(--error)", fontSize: "0.9rem" }}>Their answer: {w.their_answer}</p>
              <p style={{ marginBottom: "0.2rem", color: "var(--success)", fontSize: "0.9rem" }}>Correct: {w.correct_answer}</p>
              {w.explanation && <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.85rem" }}>{w.explanation}</p>}
            </li>
          ))}
        </ul>
      )}
      {externals.length > 0 && (
        <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
          <h4 style={{ fontSize: "0.95rem", marginBottom: "0.5rem", color: "var(--muted)" }}>Questions answered outside platform</h4>
          <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "0.75rem" }}>Upload the student&apos;s work and add a score (0–100).</p>
          {externals.map((eq) => (
            <div key={eq.question_id} className="card" style={{ marginBottom: "0.75rem", padding: "0.75rem" }}>
              <p style={{ marginBottom: "0.5rem", fontSize: "0.9rem" }}>{eq.question_text}</p>
              {eq.external_grade?.image_url && (
                <img src={eq.external_grade.image_url} alt="Student work" style={{ maxWidth: "100%", maxHeight: 160, borderRadius: 8, marginBottom: "0.5rem", border: "1px solid var(--border)" }} />
              )}
              <p style={{ fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                {eq.external_grade != null ? <>Scored: <strong>{eq.external_grade.score}%</strong></> : "Not yet graded"}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
                <input
                  type="number"
                  min={0}
                  max={100}
                  placeholder="Score 0–100"
                  value={grading[eq.question_id]?.score ?? ""}
                  onChange={(e) => setGrading((p) => ({ ...p, [eq.question_id]: { ...p[eq.question_id], score: e.target.value } }))}
                  style={{ width: "5rem", padding: "0.4rem", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)" }}
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    setGrading((p) => ({ ...p, [eq.question_id]: { ...p[eq.question_id], file: f ?? null } }));
                  }}
                  style={{ fontSize: "0.85rem" }}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ padding: "0.4rem 0.75rem" }}
                  onClick={() => submitGrade(eq.question_id)}
                  disabled={grading[eq.question_id]?.saving || (() => {
                    const s = grading[eq.question_id]?.score ?? (eq.external_grade != null ? String(eq.external_grade.score) : "");
                    const n = parseInt(s, 10);
                    return isNaN(n) || n < 0 || n > 100;
                  })()}
                >
                  {grading[eq.question_id]?.saving ? "Saving…" : eq.external_grade ? "Update grade" : "Save grade"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <button type="button" className="btn btn-secondary" style={{ marginTop: "0.5rem" }} onClick={onClose}>Close</button>
    </div>
  );
}

export default function AdminAttemptsPage() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<AttemptDetail | null>(null);

  useEffect(() => {
    fetch("/api/admin/attempts")
      .then((r) => r.json())
      .then((d) => {
        if (!d.error && Array.isArray(d.attempts)) setAttempts(d.attempts);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function viewDetail(attemptId: string, studentId: string) {
    const res = await fetch(`/api/admin/quiz-attempt?attemptId=${attemptId}&studentId=${studentId}`);
    const d = await res.json();
    if (res.ok) setDetail(d);
  }

  return (
    <>
      <nav style={{ marginBottom: "1rem" }}>
        <Link href="/admin" style={{ color: "var(--muted)", fontSize: "0.9rem" }}>← Admin</Link>
      </nav>
      <h1 style={{ marginBottom: "0.5rem" }}>Quiz attempts</h1>
      <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>
        View attempts and grade questions answered outside the platform.
      </p>

      {loading ? (
        <p style={{ color: "var(--muted)" }}>Loading…</p>
      ) : detail ? (
        <AttemptDetailCard
          detail={detail}
          onClose={() => setDetail(null)}
          onGraded={() => detail && viewDetail(detail.attempt_id, detail.student_id)}
        />
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {attempts.map((a) => (
            <li key={a.id}>
              <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                <div>
                  <strong>{(a.profiles?.full_name || a.profiles?.email) ?? "Student"}</strong>
                  <span style={{ color: "var(--muted)", marginLeft: "0.5rem" }}>
                    {a.topics?.title ?? "—"} — {a.score_percent}%
                  </span>
                  <p style={{ color: "var(--muted)", fontSize: "0.85rem", margin: "0.25rem 0 0" }}>
                    {new Date(a.created_at).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ padding: "0.4rem 0.8rem" }}
                  onClick={() => viewDetail(a.id, a.user_id)}
                >
                  View & grade
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {!loading && !detail && attempts.length === 0 && (
        <p style={{ color: "var(--muted)" }}>No quiz attempts yet.</p>
      )}
    </>
  );
}
