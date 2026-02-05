"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import type { Lesson } from "@/lib/types";
import { Quiz } from "./Quiz";
import { StudyHelpChat } from "@/app/dashboard/StudyHelpChat";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function TopicContent({
  topicId,
  topicTitle,
  subjectName,
  lessons,
  questionCount,
  estimatedStudyTimeMinutes = 15,
}: {
  topicId: string;
  topicTitle: string;
  subjectName: string;
  lessons: Lesson[];
  questionCount: number;
  estimatedStudyTimeMinutes?: number;
}) {
  const [view, setView] = useState<"lesson" | "quiz" | "result">("lesson");
  const [lessonIndex, setLessonIndex] = useState(0);
  const [lessonCompleted, setLessonCompleted] = useState(false);
  const initialSeconds = Math.max(1, estimatedStudyTimeMinutes) * 60;
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (view !== "lesson") return;
    setSecondsLeft(initialSeconds);
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [view, initialSeconds]);

  useEffect(() => {
    if (view === "lesson" && secondsLeft === 0 && questionCount > 0) {
      setView("quiz");
    }
  }, [view, secondsLeft, questionCount]);

  const currentLesson = lessons[lessonIndex];
  const hasNextLesson = lessonIndex < lessons.length - 1;
  const hasQuiz = questionCount > 0;

  if (view === "quiz") {
    return (
      <Quiz
        topicId={topicId}
        topicTitle={topicTitle}
        questionCount={questionCount}
        onBack={() => setView("lesson")}
      />
    );
  }

  if (lessons.length === 0) {
    return (
      <>
        {view === "lesson" && (
          <div
            role="timer"
            aria-live="polite"
            style={{
              marginBottom: "1rem",
              padding: "0.75rem 1rem",
              background: secondsLeft <= 60 ? "rgba(248, 113, 113, 0.15)" : "var(--bg)",
              border: `1px solid ${secondsLeft <= 60 ? "var(--error)" : "var(--border)"}`,
              borderRadius: 8,
              fontSize: "1.25rem",
              fontWeight: 600,
              textAlign: "center",
              color: secondsLeft <= 60 ? "var(--error)" : "var(--text)",
            }}
          >
            Time left: {formatTime(secondsLeft)}
            {secondsLeft <= 60 && <span style={{ fontSize: "0.9rem", fontWeight: 400, marginLeft: "0.5rem" }}>— Quiz starts when time runs out</span>}
          </div>
        )}
        <div className="card">
          <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>No lessons for this topic yet.</p>
          {hasQuiz && (
            <button className="btn btn-primary" onClick={() => setView("quiz")}>
              Take quiz ({questionCount} questions)
            </button>
          )}
          <StudyHelpChat topicId={topicId} subjectName={subjectName} topicTitle={topicTitle} />
        </div>
      </>
    );
  }

  return (
    <>
      {view === "lesson" && (
        <div
          role="timer"
          aria-live="polite"
          style={{
            marginBottom: "1rem",
            padding: "0.75rem 1rem",
            background: secondsLeft <= 60 ? "rgba(248, 113, 113, 0.15)" : "var(--bg)",
            border: `1px solid ${secondsLeft <= 60 ? "var(--error)" : "var(--border)"}`,
            borderRadius: 8,
            fontSize: "1.25rem",
            fontWeight: 600,
            textAlign: "center",
            color: secondsLeft <= 60 ? "var(--error)" : "var(--text)",
          }}
        >
          Time left: {formatTime(secondsLeft)}
          {secondsLeft <= 60 && <span style={{ fontSize: "0.9rem", fontWeight: 400, marginLeft: "0.5rem" }}>— Quiz starts when time runs out</span>}
        </div>
      )}
    <div className="card">
      <h2 style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>{currentLesson.title}</h2>
      <div
        style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, marginBottom: "1.5rem" }}
      >
        {currentLesson.content}
      </div>
      {(() => {
        const urls = currentLesson.image_urls?.length
          ? currentLesson.image_urls
          : currentLesson.image_url
            ? [currentLesson.image_url]
            : [];
        return urls.length > 0 ? (
          <div style={{ marginBottom: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {urls.map((src, i) => (
              <img
                key={i}
                src={src}
                alt=""
                style={{ maxWidth: "100%", borderRadius: 8 }}
              />
            ))}
          </div>
        ) : null;
      })()}
      {currentLesson.audio_url && (
        <audio controls src={currentLesson.audio_url} style={{ marginBottom: "1rem" }} />
      )}
      <StudyHelpChat topicId={topicId} subjectName={subjectName} topicTitle={topicTitle} />
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        {!lessonCompleted && (
          <button
            className="btn btn-primary"
            onClick={async () => {
              setLessonCompleted(true);
              await fetch("/api/progress/lesson", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lessonId: currentLesson.id }),
              });
            }}
          >
            Mark as complete
          </button>
        )}
        {lessonCompleted && <span className="badge badge-success">Completed</span>}
        {hasNextLesson && (
          <button
            className="btn btn-secondary"
            onClick={() => {
              setLessonIndex((i) => i + 1);
              setLessonCompleted(false);
            }}
          >
            Next lesson
          </button>
        )}
        {!hasNextLesson && hasQuiz && (
          <button className="btn btn-primary" onClick={() => setView("quiz")}>
            Take quiz ({questionCount} questions)
          </button>
        )}
      </div>
      {!hasNextLesson && !hasQuiz && (
        <p style={{ color: "var(--muted)", marginTop: "0.5rem" }}>
          You’ve finished this topic. <Link href="/dashboard/subjects">Back to subjects</Link>.
        </p>
      )}
    </div>
    </>
  );
}
