"use client";

import { useState, useEffect } from "react";

type Student = { id: string; name: string; email: string };

type ActivityItem = { type: "lesson" | "quiz"; date: string; title: string; detail: string; attemptId?: string };
type QuizAttempt = { id: string; topic_title: string; subject_name: string; score_percent: number; created_at: string };
type StudyCalendarDay = { date: string; totalMinutes: number; lessonCount: number };
type SubjectSummaryItem = { subjectName: string; averageScore: number; attemptCount: number };
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
  studyCalendar?: StudyCalendarDay[];
  subjectSummary?: SubjectSummaryItem[];
};

// —— Bar chart: study time per day (last 7 days) ——
function StudyTimeBarChart({ studyCalendarMap }: { studyCalendarMap: Map<string, { totalMinutes: number; lessonCount: number }> }) {
  const days: { label: string; date: string; minutes: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const entry = studyCalendarMap.get(dateStr);
    days.push({
      label: d.toLocaleDateString(undefined, { weekday: "short" }),
      date: dateStr,
      minutes: entry?.totalMinutes ?? 0,
    });
  }
  const maxVal = Math.max(...days.map((x) => x.minutes), 1);

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem", height: 120 }}>
      {days.map((day) => (
        <div key={day.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem" }}>
          <span style={{ fontSize: "0.7rem", color: "var(--muted)", fontWeight: 600 }}>{day.label}</span>
          <div
            title={`${day.minutes} min studied`}
            style={{
              width: "100%",
              height: day.minutes > 0 ? Math.max(10, (day.minutes / maxVal) * 72) : 6,
              background: day.minutes > 0 ? "var(--accent)" : "var(--border)",
              borderRadius: 6,
              minHeight: 6,
            }}
          />
          <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>{day.minutes}m</span>
        </div>
      ))}
    </div>
  );
}

// —— Bar chart: subject average scores (horizontal bars) ——
function SubjectScoreBarChart({ subjectSummary }: { subjectSummary: SubjectSummaryItem[] }) {
  if (subjectSummary.length === 0) return null;
  const maxScore = Math.max(...subjectSummary.map((s) => s.averageScore), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {subjectSummary.map((s) => (
        <div key={s.subjectName} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem" }}>
          <span style={{ minWidth: 100, color: "var(--text)" }}>{s.subjectName}</span>
          <div style={{ flex: 1, height: 20, background: "var(--border)", borderRadius: 6, overflow: "hidden", display: "flex" }}>
            <div
              style={{
                width: `${(s.averageScore / maxScore) * 100}%`,
                minWidth: s.averageScore > 0 ? 4 : 0,
                height: "100%",
                background: s.averageScore >= 80 ? "var(--success)" : s.averageScore < 60 ? "var(--error)" : "var(--warning)",
                borderRadius: 6,
              }}
            />
          </div>
          <span style={{ minWidth: 36, fontWeight: 600, color: s.averageScore >= 80 ? "var(--success)" : s.averageScore < 60 ? "var(--error)" : "var(--warning)" }}>
            {s.averageScore}%
          </span>
        </div>
      ))}
    </div>
  );
}

// —— Compact study calendar (current month) ——
function StudyCalendar({ studyCalendarMap }: { studyCalendarMap: Map<string, { totalMinutes: number; lessonCount: number }> }) {
  const [month, setMonth] = useState(new Date());
  const year = month.getFullYear();
  const monthIdx = month.getMonth();
  const firstDay = new Date(year, monthIdx, 1);
  const lastDay = new Date(year, monthIdx + 1, 0);
  const startPad = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const weekDays = ["S", "M", "T", "W", "T", "F", "S"];

  const pad = (n: number) => n.toString().padStart(2, "0");
  const days: { date: string; dayNum: number | null; minutes: number }[] = [];
  for (let i = 0; i < startPad; i++) days.push({ date: "", dayNum: null, minutes: 0 });
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${pad(monthIdx + 1)}-${pad(d)}`;
    const entry = studyCalendarMap.get(dateStr);
    days.push({ date: dateStr, dayNum: d, minutes: entry?.totalMinutes ?? 0 });
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
        <button type="button" className="btn btn-secondary" style={{ padding: "0.25rem 0.5rem", fontSize: "0.8rem" }} onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1))}>←</button>
        <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
        <button type="button" className="btn btn-secondary" style={{ padding: "0.25rem 0.5rem", fontSize: "0.8rem" }} onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1))}>→</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, fontSize: "0.7rem" }}>
        {weekDays.map((w, i) => (
          <div key={i} style={{ textAlign: "center", color: "var(--muted)", fontWeight: 600 }}>{w}</div>
        ))}
        {days.map((cell, i) => (
          <div
            key={i}
            title={cell.minutes > 0 ? `${cell.minutes} min` : ""}
            style={{
              aspectRatio: "1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: cell.minutes > 0 ? "rgba(56, 189, 248, 0.25)" : "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: 4,
              color: cell.dayNum == null ? "transparent" : "var(--text)",
              fontWeight: cell.minutes > 0 ? 600 : 400,
            }}
          >
            {cell.dayNum ?? ""}
          </div>
        ))}
      </div>
    </div>
  );
}

// —— Quiz attempt detail with external-question grading ——
type AttemptDetail = {
  topic_title: string;
  score_percent: number;
  created_at: string;
  attempt_id?: string;
  student_id?: string;
  wrong_answers: { question_text: string; their_answer: string; correct_answer: string; explanation: string | null }[];
  external_questions?: { question_id: string; question_text: string; external_grade?: { image_url: string | null; score: number } }[];
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
    externals.forEach((eq) => {
      init[eq.question_id] = { score: eq.external_grade?.score != null ? String(eq.external_grade.score) : "", file: null, saving: false };
    });
    return init;
  });
  const attemptId = detail.attempt_id;
  const studentId = detail.student_id;
  const externals = detail.external_questions ?? [];

  async function submitGrade(qId: string) {
    if (!attemptId || !studentId) return;
    const g = grading[qId];
    const score = g?.score ? parseInt(g.score, 10) : NaN;
    if (isNaN(score) || score < 0 || score > 100) return;
    setGrading((prev) => ({ ...prev, [qId]: { ...prev[qId], saving: true } }));
    try {
      const formData = new FormData();
      formData.append("attemptId", attemptId);
      formData.append("studentId", studentId);
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
          {(detail.wrong_answers ?? []).map((w, i) => (
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

// —— One child's full dashboard (all visible, no expand) ——
function ChildDashboard({
  studentId,
  studentName,
  data,
  loading,
}: {
  studentId: string;
  studentName: string;
  data: ProgressData | null;
  loading: boolean;
}) {
  const [goalInput, setGoalInput] = useState("2");
  const [goalSaving, setGoalSaving] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [messageSending, setMessageSending] = useState(false);
  const [attemptDetail, setAttemptDetail] = useState<{
    topic_title: string;
    score_percent: number;
    created_at: string;
    attempt_id?: string;
    student_id?: string;
    wrong_answers: { question_text: string; their_answer: string; correct_answer: string; explanation: string | null }[];
    external_questions?: { question_id: string; question_text: string; external_grade?: { image_url: string | null; score: number } }[];
  } | null>(null);

  useEffect(() => {
    if (data?.goal != null) setGoalInput(String(data.goal));
  }, [data?.goal]);

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
  }

  async function viewAttemptDetail(attemptId: string) {
    const res = await fetch(`/api/parent/quiz-attempt?studentId=${studentId}&attemptId=${attemptId}`);
    const d = await res.json();
    if (res.ok) setAttemptDetail({
      ...d,
      attempt_id: d.attempt_id ?? attemptId,
      student_id: d.student_id ?? studentId,
      wrong_answers: d.wrong_answers ?? [],
      external_questions: d.external_questions ?? [],
    });
  }

  if (loading) {
    return (
      <div className="card" style={{ padding: "2rem", textAlign: "center", color: "var(--muted)" }}>
        Loading {studentName}&apos;s progress…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card" style={{ padding: "1.5rem", color: "var(--muted)" }}>
        No progress data for {studentName} yet.
      </div>
    );
  }

  const studyCalendarMap = new Map((data.studyCalendar ?? []).map((d) => [d.date, { totalMinutes: d.totalMinutes, lessonCount: d.lessonCount }]));
  const subjectSummary = data.subjectSummary ?? [];
  const excelling = subjectSummary.filter((s) => s.averageScore >= 80);
  const struggling = subjectSummary.filter((s) => s.averageScore < 60);
  const ws = data.weeklySummary;

  return (
    <section className="card" style={{ marginBottom: "2rem", borderLeft: "4px solid var(--accent)" }}>
      <h2 style={{ fontSize: "1.25rem", marginBottom: "0.25rem", fontWeight: 700 }}>{studentName}</h2>
      <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>All progress at a glance</p>

      {/* Nudges / celebrations */}
      {(data.daysSinceActivity != null && data.daysSinceActivity >= 3) && (
        <div className="card" style={{ background: "rgba(251, 191, 36, 0.12)", borderColor: "var(--warning)", marginBottom: "1rem" }}>
          <strong>No study in {data.daysSinceActivity} days</strong> — a gentle nudge to encourage {studentName}.
        </div>
      )}
      {ws.streakDays >= 3 && (
        <div className="card" style={{ background: "rgba(52, 211, 153, 0.12)", borderColor: "var(--success)", marginBottom: "1rem" }}>
          <strong>{ws.streakDays}-day streak!</strong> Keep it up.
        </div>
      )}

      {/* Top row: Study time graph + Subject performance graph */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem", marginBottom: "1.5rem" }}>
        <div className="card" style={{ background: "var(--bg)" }}>
          <h3 style={{ fontSize: "0.95rem", marginBottom: "0.75rem", color: "var(--muted)", fontWeight: 600 }}>Study time (last 7 days)</h3>
          <StudyTimeBarChart studyCalendarMap={studyCalendarMap} />
        </div>
        <div className="card" style={{ background: "var(--bg)" }}>
          <h3 style={{ fontSize: "0.95rem", marginBottom: "0.75rem", color: "var(--muted)", fontWeight: 600 }}>Subject performance</h3>
          {subjectSummary.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: "0.85rem", margin: 0 }}>No quiz data yet.</p>
          ) : (
            <SubjectScoreBarChart subjectSummary={subjectSummary} />
          )}
        </div>
      </div>

      {/* Weekly stats: 4 stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <div className="card" style={{ background: "var(--bg)", textAlign: "center", padding: "1rem" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--accent)" }}>{ws.lessonsThisWeek}</div>
          <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Lessons this week</div>
        </div>
        <div className="card" style={{ background: "var(--bg)", textAlign: "center", padding: "1rem" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--accent)" }}>{ws.quizzesThisWeek}</div>
          <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Quizzes this week</div>
        </div>
        <div className="card" style={{ background: "var(--bg)", textAlign: "center", padding: "1rem" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--success)" }}>{ws.totalTimeMinutes}</div>
          <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Minutes studied</div>
        </div>
        <div className="card" style={{ background: "var(--bg)", textAlign: "center", padding: "1rem" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--warning)" }}>{ws.streakDays}</div>
          <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Day streak</div>
        </div>
      </div>

      {/* Excelling / Struggling + Calendar side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem", marginBottom: "1.5rem" }}>
        <div className="card" style={{ background: "var(--bg)" }}>
          <h3 style={{ fontSize: "0.95rem", marginBottom: "0.5rem", color: "var(--success)", fontWeight: 600 }}>Excelling at</h3>
          {excelling.length === 0 ? <p style={{ color: "var(--muted)", fontSize: "0.85rem", margin: 0 }}>No subjects ≥80% yet.</p> : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {excelling.map((s) => (
                <li key={s.subjectName} style={{ marginBottom: "0.35rem", fontSize: "0.9rem" }}><strong>{s.subjectName}</strong> — {s.averageScore}%</li>
              ))}
            </ul>
          )}
        </div>
        <div className="card" style={{ background: "var(--bg)" }}>
          <h3 style={{ fontSize: "0.95rem", marginBottom: "0.5rem", color: "var(--error)", fontWeight: 600 }}>Struggling with</h3>
          {struggling.length === 0 ? <p style={{ color: "var(--muted)", fontSize: "0.85rem", margin: 0 }}>None below 60%.</p> : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {struggling.map((s) => (
                <li key={s.subjectName} style={{ marginBottom: "0.35rem", fontSize: "0.9rem" }}><strong>{s.subjectName}</strong> — {s.averageScore}%</li>
              ))}
            </ul>
          )}
        </div>
        <div className="card" style={{ background: "var(--bg)" }}>
          <h3 style={{ fontSize: "0.95rem", marginBottom: "0.5rem", color: "var(--muted)", fontWeight: 600 }}>Study calendar</h3>
          <StudyCalendar studyCalendarMap={studyCalendarMap} />
        </div>
      </div>

      {/* Recent activity */}
      <div className="card" style={{ background: "var(--bg)", marginBottom: "1.5rem" }}>
        <h3 style={{ fontSize: "0.95rem", marginBottom: "0.75rem", color: "var(--muted)", fontWeight: 600 }}>Recent activity</h3>
        {data.activityFeed.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", margin: 0 }}>No activity yet.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {data.activityFeed.slice(0, 8).map((e, i) => (
              <li key={i} style={{ marginBottom: "0.5rem", fontSize: "0.85rem", display: "flex", flexWrap: "wrap", gap: "0.35rem", alignItems: "center" }}>
                <span style={{ color: "var(--muted)", minWidth: 100 }}>{new Date(e.date).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                {e.type === "lesson" ? "📖" : "📝"} <strong>{e.title}</strong> — {e.detail}
                {e.attemptId && (
                  <button type="button" className="btn btn-secondary" style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }} onClick={() => viewAttemptDetail(e.attemptId!)}>Details</button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Quiz attempt detail modal-style */}
      {attemptDetail && (
        <AttemptDetailCard
          detail={attemptDetail}
          onClose={() => setAttemptDetail(null)}
          onGraded={() => viewAttemptDetail(attemptDetail.attempt_id ?? "")}
        />
      )}

      {/* Goals & message in one row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.25rem" }}>
        <div className="card" style={{ background: "var(--bg)" }}>
          <h3 style={{ fontSize: "0.95rem", marginBottom: "0.5rem", fontWeight: 600 }}>Weekly goal</h3>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "0.5rem" }}>Topics per week for {studentName}</p>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <input type="number" min={1} max={20} value={goalInput} onChange={(e) => setGoalInput(e.target.value)} style={{ width: "4rem", padding: "0.4rem", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)" }} />
            <button type="button" className="btn btn-primary" onClick={saveGoal} disabled={goalSaving}>{goalSaving ? "Saving…" : "Save"}</button>
          </div>
        </div>
        <div className="card" style={{ background: "var(--bg)" }}>
          <h3 style={{ fontSize: "0.95rem", marginBottom: "0.5rem", fontWeight: 600 }}>Message for {studentName}</h3>
          <textarea value={messageInput} onChange={(e) => setMessageInput(e.target.value)} placeholder="e.g. Great job! Let's review English tomorrow." rows={2} style={{ width: "100%", marginBottom: "0.5rem", padding: "0.5rem", borderRadius: 8, background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", fontSize: "0.9rem" }} />
          <button type="button" className="btn btn-primary" onClick={sendMessage} disabled={messageSending || !messageInput.trim()}>{messageSending ? "Sending…" : "Send"}</button>
          {data.messages.length > 0 && <p style={{ marginTop: "0.5rem", marginBottom: 0, fontSize: "0.8rem", color: "var(--muted)" }}>Latest: &quot;{data.messages[0].body.slice(0, 50)}…&quot;</p>}
        </div>
      </div>
    </section>
  );
}

export function ParentDashboard({ students }: { students: Student[] }) {
  const [linking, setLinking] = useState(false);
  const [studentEmail, setStudentEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [progressByStudent, setProgressByStudent] = useState<Record<string, ProgressData | null>>({});
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  const studentIds = students.map((s) => s.id).join(",");
  useEffect(() => {
    if (students.length === 0) return;
    setLoadingIds(new Set(students.map((s) => s.id)));
    Promise.all(
      students.map((s) =>
        fetch(`/api/parent/progress?studentId=${s.id}`)
          .then((r) => r.json())
          .then((d) => ({ id: s.id, data: d.error ? null : d }))
          .catch(() => ({ id: s.id, data: null }))
      )
    ).then((results) => {
      const next: Record<string, ProgressData | null> = {};
      results.forEach(({ id, data }) => { next[id] = data; });
      setProgressByStudent(next);
      setLoadingIds(new Set());
    });
  }, [studentIds, students.length]);

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
      <div className="card" style={{ maxWidth: 420 }}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>Link your first child</h2>
        <p style={{ marginBottom: "1rem", color: "var(--muted)", fontSize: "0.95rem" }}>
          Enter your child&apos;s Study Buddy account email to see their progress here.
        </p>
        <form onSubmit={handleLink}>
          <div className="form-group">
            <label htmlFor="studentEmail">Student&apos;s email</label>
            <input id="studentEmail" type="email" value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} required placeholder="child@example.com" />
          </div>
          {error && <p style={{ color: "var(--error)", marginBottom: "0.5rem", fontSize: "0.9rem" }}>{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={linking}>{linking ? "Linking…" : "Link student"}</button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem", fontWeight: 600 }}>Linked children</h2>
        <div className="card" style={{ marginBottom: "1rem" }}>
          <form onSubmit={handleLink} style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end" }}>
            <div className="form-group" style={{ marginBottom: 0, flex: "1 1 200px" }}>
              <label htmlFor="parentStudentEmail">Add another student</label>
              <input id="parentStudentEmail" type="email" value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} placeholder="child@example.com" />
            </div>
            <button type="submit" className="btn btn-secondary" disabled={linking}>{linking ? "Linking…" : "Link"}</button>
          </form>
          {error && <p style={{ color: "var(--error)", marginTop: "0.5rem", fontSize: "0.9rem" }}>{error}</p>}
        </div>

        {students.map((s) => (
          <ChildDashboard
            key={s.id}
            studentId={s.id}
            studentName={s.name}
            data={progressByStudent[s.id] ?? null}
            loading={loadingIds.has(s.id)}
          />
        ))}
      </section>
    </div>
  );
}
