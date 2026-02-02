"use client";

import { useState, useEffect } from "react";

type Student = { id: string; name: string; email: string };

type ActivityItem = { type: "lesson" | "quiz"; date: string; title: string; detail: string; attemptId?: string };
type QuizAttempt = { id: string; topic_title: string; subject_name: string; score_percent: number; created_at: string };
type ProgressData = {
  lessonsCompleted: number;
  quizAttempts: QuizAttempt[];
  weakTopics: string[];
  activityFeed: ActivityItem[];
  weeklySummary: {
    lessonsThisWeek: number;
    quizzesThisWeek: number;
    totalTimeMinutes: number;
    lastActivityAt: string | null;
    streakDays: number;
  };
  daysSinceActivity: number | null;
  goal: number | null;
  messages: { id: string; body: string; created_at: string }[];
};

export function ParentDashboard({ students }: { students: Student[] }) {
  const [linking, setLinking] = useState(false);
  const [studentEmail, setStudentEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  async function handleLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLinking(true);
    const res = await fetch("/api/parent/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentEmail: studentEmail.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    setLinking(false);
    if (!res.ok) {
      setError(data.error ?? "Could not link student.");
      return;
    }
    setStudentEmail("");
    window.location.reload();
  }

  if (students.length === 0 && !linking) {
    return (
      <div className="card">
        <p style={{ marginBottom: "1rem", color: "var(--muted)" }}>
          No students linked yet. Enter your child's Study Buddy account email to link them.
        </p>
        <form onSubmit={handleLink} style={{ maxWidth: "320px" }}>
          <div className="form-group">
            <label htmlFor="studentEmail">Student's email</label>
            <input
              id="studentEmail"
              type="email"
              value={studentEmail}
              onChange={(e) => setStudentEmail(e.target.value)}
              required
              placeholder="child@example.com"
            />
          </div>
          {error && <p style={{ color: "var(--error)", marginBottom: "0.5rem", fontSize: "0.9rem" }}>{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={linking}>
            {linking ? "Linking…" : "Link student"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>Link another student</h2>
        <form onSubmit={handleLink} style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="form-group" style={{ marginBottom: 0, flex: "1 1 200px" }}>
            <label htmlFor="studentEmail">Student's email</label>
            <input
              id="studentEmail"
              type="email"
              value={studentEmail}
              onChange={(e) => setStudentEmail(e.target.value)}
              placeholder="child@example.com"
            />
          </div>
          <button type="submit" className="btn btn-secondary" disabled={linking}>
            {linking ? "Linking…" : "Link"}
          </button>
        </form>
        {error && <p style={{ color: "var(--error)", marginTop: "0.5rem", fontSize: "0.9rem" }}>{error}</p>}
      </div>

      <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "1rem" }}>
        {students.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              className="card"
              style={{
                width: "100%",
                textAlign: "left",
                border: selectedStudent === s.id ? "2px solid var(--accent)" : undefined,
              }}
              onClick={() => setSelectedStudent(selectedStudent === s.id ? null : s.id)}
            >
              <strong>{s.name}</strong>
              <span style={{ color: "var(--muted)", fontSize: "0.9rem", display: "block" }}>{s.email}</span>
              <span style={{ color: "var(--accent)", fontSize: "0.85rem", marginTop: "0.35rem" }}>
                {selectedStudent === s.id ? "Hide ▼" : "View progress ▶"}
              </span>
            </button>
            {selectedStudent === s.id && (
              <div style={{ marginTop: "0.5rem", paddingLeft: "0.5rem" }}>
                <StudentProgress studentId={s.id} studentName={s.name} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function StudentProgress({ studentId, studentName }: { studentId: string; studentName: string }) {
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [goalInput, setGoalInput] = useState("");
  const [goalSaving, setGoalSaving] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [messageSending, setMessageSending] = useState(false);
  const [attemptDetail, setAttemptDetail] = useState<{
    topic_title: string;
    subject_name: string;
    score_percent: number;
    created_at: string;
    wrong_answers: { question_text: string; their_answer: string; correct_answer: string; explanation: string | null }[];
  } | null>(null);
  const [loadingAttemptId, setLoadingAttemptId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setAttemptDetail(null);
    fetch(`/api/parent/progress?studentId=${studentId}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setGoalInput(d?.goal != null ? String(d.goal) : "2");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [studentId]);

  async function saveGoal() {
    const num = parseInt(goalInput, 10);
    if (isNaN(num) || num < 1 || num > 20) return;
    setGoalSaving(true);
    await fetch("/api/parent/goals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, topics_per_week: num }),
    });
    setGoalSaving(false);
    if (data) setData({ ...data, goal: num });
  }

  async function sendMessage() {
    if (!messageInput.trim()) return;
    setMessageSending(true);
    await fetch("/api/parent/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, body: messageInput.trim() }),
    });
    setMessageSending(false);
    setMessageInput("");
    const res = await fetch(`/api/parent/progress?studentId=${studentId}`);
    const d = await res.json();
    if (d?.messages) setData((prev) => prev ? { ...prev, messages: d.messages } : null);
  }

  async function viewAttemptDetail(attemptId: string) {
    setLoadingAttemptId(attemptId);
    setAttemptDetail(null);
    const res = await fetch(`/api/parent/quiz-attempt?studentId=${studentId}&attemptId=${attemptId}`);
    const d = await res.json();
    setLoadingAttemptId(null);
    if (res.ok) setAttemptDetail(d);
  }

  if (loading) return <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>Loading…</p>;
  if (!data) return <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>No progress data.</p>;

  const weak = Array.from(new Set(data.quizAttempts.filter((a) => a.score_percent < 60).map((a) => a.topic_title)));
  const ws = data.weeklySummary;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Nudges / celebrations */}
      {(data.daysSinceActivity != null && data.daysSinceActivity >= 3) && (
        <div className="card" style={{ background: "rgba(251, 191, 36, 0.15)", borderColor: "var(--warning)" }}>
          <strong>No study in {data.daysSinceActivity} days</strong>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--muted)" }}>A gentle nudge to encourage {studentName} to study.</p>
        </div>
      )}
      {ws.streakDays >= 3 && (
        <div className="card" style={{ background: "rgba(52, 211, 153, 0.15)", borderColor: "var(--success)" }}>
          <strong>{ws.streakDays}-day streak!</strong>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--muted)" }}>Keep it up.</p>
        </div>
      )}

      {/* Weekly summary */}
      <div className="card" style={{ background: "var(--bg)" }}>
        <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>This week</h3>
        <p style={{ marginBottom: "0.35rem" }}>Lessons completed: <strong>{ws.lessonsThisWeek}</strong></p>
        <p style={{ marginBottom: "0.35rem" }}>Quizzes taken: <strong>{ws.quizzesThisWeek}</strong></p>
        <p style={{ marginBottom: "0.35rem" }}>Time studied: <strong>{ws.totalTimeMinutes} min</strong></p>
        <p style={{ marginBottom: 0 }}>Streak: <strong>{ws.streakDays} days</strong></p>
      </div>

      {/* Activity feed */}
      <div className="card" style={{ background: "var(--bg)" }}>
        <h3 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>Activity</h3>
        {data.activityFeed.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", margin: 0 }}>No activity yet.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {data.activityFeed.slice(0, 15).map((e, i) => (
              <li key={i} style={{ marginBottom: "0.5rem", fontSize: "0.9rem" }}>
                <span style={{ color: "var(--muted)", marginRight: "0.5rem" }}>
                  {new Date(e.date).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
                {e.type === "lesson" ? "Completed lesson:" : "Quiz:"} <strong>{e.title}</strong> — {e.detail}
                {e.attemptId && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ marginLeft: "0.5rem", padding: "0.2rem 0.5rem", fontSize: "0.8rem" }}
                    onClick={() => viewAttemptDetail(e.attemptId!)}
                  >
                    View details
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Quiz attempt detail (wrong answers) */}
      {attemptDetail && (
        <div className="card" style={{ background: "var(--bg)" }}>
          <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>Quiz: {attemptDetail.topic_title} — {attemptDetail.score_percent}%</h3>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "0.75rem" }}>
            {new Date(attemptDetail.created_at).toLocaleString()}
          </p>
          {attemptDetail.wrong_answers.length === 0 ? (
            <p style={{ color: "var(--success)", margin: 0 }}>No wrong answers.</p>
          ) : (
            <>
              <p style={{ marginBottom: "0.5rem" }}><strong>Questions to review together:</strong></p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {attemptDetail.wrong_answers.map((w, i) => (
                  <li key={i} className="card" style={{ marginBottom: "0.5rem", padding: "0.75rem" }}>
                    <p style={{ marginBottom: "0.35rem" }}>{w.question_text}</p>
                    <p style={{ marginBottom: "0.2rem", color: "var(--error)", fontSize: "0.9rem" }}>Their answer: {w.their_answer}</p>
                    <p style={{ marginBottom: "0.2rem", color: "var(--success)", fontSize: "0.9rem" }}>Correct: {w.correct_answer}</p>
                    {w.explanation && <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.85rem" }}>{w.explanation}</p>}
                  </li>
                ))}
              </ul>
            </>
          )}
          <button type="button" className="btn btn-secondary" style={{ marginTop: "0.5rem" }} onClick={() => setAttemptDetail(null)}>Close</button>
        </div>
      )}

      {/* Quiz attempts list */}
      <div className="card" style={{ background: "var(--bg)" }}>
        <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>Quiz scores</h3>
        {data.quizAttempts.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", margin: 0 }}>No quizzes yet.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {data.quizAttempts.map((a) => (
              <li key={a.id} style={{ marginBottom: "0.35rem", display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                <span>{a.topic_title}: <strong>{a.score_percent}%</strong></span>
                <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>{new Date(a.created_at).toLocaleDateString()}</span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: "0.2rem 0.5rem", fontSize: "0.8rem" }}
                  onClick={() => viewAttemptDetail(a.id)}
                  disabled={loadingAttemptId === a.id}
                >
                  {loadingAttemptId === a.id ? "Loading…" : "View details"}
                </button>
              </li>
            ))}
          </ul>
        )}
        {weak.length > 0 && (
          <p style={{ marginTop: "0.5rem", marginBottom: 0, fontSize: "0.9rem" }}>
            <strong>Topics to review (score &lt; 60%):</strong> {weak.join(", ")}
          </p>
        )}
      </div>

      {/* Weekly goal */}
      <div className="card" style={{ background: "var(--bg)" }}>
        <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>Weekly goal</h3>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "0.5rem" }}>
          How many topics should {studentName} complete per week? They'll see this on their dashboard.
        </p>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="number"
            min={1}
            max={20}
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
            style={{ width: "4rem", padding: "0.4rem" }}
          />
          <button type="button" className="btn btn-primary" onClick={saveGoal} disabled={goalSaving}>
            {goalSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {/* Message to child */}
      <div className="card" style={{ background: "var(--bg)" }}>
        <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>Message for {studentName}</h3>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "0.5rem" }}>
          They'll see your latest message on their dashboard.
        </p>
        <textarea
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          placeholder="e.g. Great job this week! Let's review English tomorrow."
          rows={2}
          style={{ width: "100%", marginBottom: "0.5rem", padding: "0.5rem", borderRadius: 8, background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
        />
        <button type="button" className="btn btn-primary" onClick={sendMessage} disabled={messageSending || !messageInput.trim()}>
          {messageSending ? "Sending…" : "Send"}
        </button>
        {data.messages.length > 0 && (
          <p style={{ marginTop: "0.75rem", marginBottom: 0, fontSize: "0.85rem", color: "var(--muted)" }}>
            Latest: &quot;{data.messages[0].body.slice(0, 80)}{data.messages[0].body.length > 80 ? "…" : ""}&quot;
          </p>
        )}
      </div>
    </div>
  );
}
