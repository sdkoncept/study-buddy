"use client";

import { useState } from "react";
import Link from "next/link";
import type { Lesson } from "@/lib/types";
import { Quiz } from "./Quiz";

export function TopicContent({
  topicId,
  topicTitle,
  lessons,
  questionCount,
}: {
  topicId: string;
  topicTitle: string;
  lessons: Lesson[];
  questionCount: number;
}) {
  const [view, setView] = useState<"lesson" | "quiz" | "result">("lesson");
  const [lessonIndex, setLessonIndex] = useState(0);
  const [lessonCompleted, setLessonCompleted] = useState(false);

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
      <div className="card">
        <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>No lessons for this topic yet.</p>
        {hasQuiz && (
          <button className="btn btn-primary" onClick={() => setView("quiz")}>
            Take quiz ({questionCount} questions)
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="card">
      <h2 style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>{currentLesson.title}</h2>
      <div
        style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, marginBottom: "1.5rem" }}
      >
        {currentLesson.content}
      </div>
      {currentLesson.image_url && (
        <img
          src={currentLesson.image_url}
          alt=""
          style={{ maxWidth: "100%", borderRadius: 8, marginBottom: "1rem" }}
        />
      )}
      {currentLesson.audio_url && (
        <audio controls src={currentLesson.audio_url} style={{ marginBottom: "1rem" }} />
      )}
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
  );
}
