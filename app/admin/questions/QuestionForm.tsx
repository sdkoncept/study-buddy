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
    question_type?: "multiple_choice" | "short_answer" | "external_answer";
    options: string[];
    correct_index: number;
    correct_indices?: number[] | null;
    correct_answer_text?: string | null;
    explanation: string | null;
    image_url?: string | null;
  };
};

export function QuestionForm({ topicId, question }: QuestionFormProps) {
  const router = useRouter();
  const [questionText, setQuestionText] = useState(question?.question_text ?? "");
  const [questionType, setQuestionType] = useState<"multiple_choice" | "short_answer" | "external_answer">(
    (question?.question_type === "external_answer" ? "external_answer" : question?.question_type === "short_answer" ? "short_answer" : "multiple_choice")
  );
  const [optionsText, setOptionsText] = useState(
    question?.options?.length ? (question.options as string[]).join("\n") : ""
  );
  const [correctIndices, setCorrectIndices] = useState<number[]>(() => {
    if (question?.correct_indices?.length) return [...question.correct_indices].sort((a, b) => a - b);
    if (question?.correct_index != null) return [question.correct_index];
    return [0];
  });
  const [correctAnswerText, setCorrectAnswerText] = useState(question?.correct_answer_text ?? "");
  const [explanation, setExplanation] = useState(question?.explanation ?? "");
  const [imageUrl, setImageUrl] = useState(question?.image_url ?? "");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("topicId", topicId);
      const res = await fetch("/api/admin/questions/upload-image", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setImageUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  }

  const toggleCorrect = (index: number) => {
    setCorrectIndices((prev) => {
      const next = prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index].sort((a, b) => a - b);
      return next;
    });
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (questionType === "multiple_choice") {
      const options = optionsText.split("\n").map((s) => s.trim()).filter(Boolean);
      if (options.length < 2) {
        setError("Add at least 2 options (one per line).");
        return;
      }
      const valid = correctIndices.filter((i) => i >= 0 && i < options.length);
      if (valid.length === 0) {
        setError("Select at least one correct option.");
        return;
      }
    } else if (questionType === "short_answer") {
      if (!correctAnswerText.trim()) {
        setError("Enter the correct answer for short-answer questions.");
        return;
      }
    }
    setLoading(true);
    const url = question ? `/api/admin/questions/${question.id}` : "/api/admin/questions";
    const options = questionType === "multiple_choice"
      ? optionsText.split("\n").map((s) => s.trim()).filter(Boolean)
      : [];
    const validIndices = questionType === "multiple_choice"
      ? correctIndices.filter((i) => i >= 0 && i < options.length)
      : [];
    const isExternal = questionType === "external_answer";
    const res = await fetch(url, {
      method: question ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic_id: topicId,
        question_text: questionText.trim(),
        question_type: questionType,
        options: isExternal ? [] : options,
        correct_index: questionType === "multiple_choice" ? (validIndices[0] ?? 0) : 0,
        correct_indices: questionType === "multiple_choice" ? validIndices : null,
        correct_answer_text: questionType === "short_answer" ? correctAnswerText.trim() : null,
        explanation: explanation.trim() || null,
        image_url: imageUrl.trim() || null,
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
          placeholder="e.g. In the equation 3 + y = 10, what is y? Or: Complete the diagram to show what happens when a light ray hits a plane mirror."
        />
      </div>
      <div className="form-group">
        <label>Question image (optional)</label>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
          Add a diagram or image for the question. PNG, JPEG, WebP, or GIF, max 5 MB.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
              onChange={handleImageUpload}
              disabled={uploadingImage}
              style={{ fontSize: "0.9rem" }}
            />
            {uploadingImage && <span style={{ color: "var(--muted)", fontSize: "0.9rem" }}>Uploading…</span>}
          </div>
          {imageUrl && (
            <div style={{ position: "relative", display: "inline-block" }}>
              <img
                src={imageUrl}
                alt="Question"
                style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 8, border: "1px solid var(--border)" }}
              />
              <button
                type="button"
                onClick={() => setImageUrl("")}
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  padding: "0.25rem 0.5rem",
                  fontSize: "0.8rem",
                  background: "var(--error)",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Remove
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="form-group">
        <label>Answer type</label>
        <div style={{ display: "flex", gap: "1rem", marginTop: "0.35rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer" }}>
            <input
              type="radio"
              name="question_type"
              checked={questionType === "multiple_choice"}
              onChange={() => setQuestionType("multiple_choice")}
            />
            Multiple choice (student can pick one or more)
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer" }}>
            <input
              type="radio"
              name="question_type"
              checked={questionType === "short_answer"}
              onChange={() => setQuestionType("short_answer")}
            />
            Short answer (type in)
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer" }}>
            <input
              type="radio"
              name="question_type"
              checked={questionType === "external_answer"}
              onChange={() => setQuestionType("external_answer")}
            />
            Answer outside platform (e.g. draw on paper)
          </label>
        </div>
      </div>
      {questionType === "multiple_choice" && (
        <>
          <div className="form-group">
            <label htmlFor="options">Options (one per line; first line = index 0)</label>
            <textarea
              id="options"
              value={optionsText}
              onChange={(e) => setOptionsText(e.target.value)}
              rows={5}
              placeholder={"4\n5\n6\n7"}
            />
          </div>
          <div className="form-group">
            <label>Correct option(s) — tick all that apply</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
              {optionsText.split("\n").map((line, i) => {
                const opt = line.trim();
                if (!opt) return null;
                return (
                  <label key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={correctIndices.includes(i)}
                      onChange={() => toggleCorrect(i)}
                    />
                    <span>Index {i}: {opt}</span>
                  </label>
                );
              })}
            </div>
            <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: "0.35rem" }}>
              Student must select exactly these options to get the question right.
            </p>
          </div>
        </>
      )}
      {questionType === "external_answer" && (
        <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
          The student will see the question (and any image) and can mark it complete after answering on paper or elsewhere.
        </p>
      )}
      {questionType === "short_answer" && (
        <div className="form-group">
          <label htmlFor="correct_answer_text">Correct answer (what the student should type)</label>
          <input
            id="correct_answer_text"
            type="text"
            value={correctAnswerText}
            onChange={(e) => setCorrectAnswerText(e.target.value)}
            placeholder="e.g. 7"
          />
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
            Compared case-insensitively after trimming. Use the explanation below to describe the expected answer.
          </p>
        </div>
      )}
      <div className="form-group">
        <label htmlFor="explanation">Explanation (shown after the student answers)</label>
        <textarea
          id="explanation"
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          rows={2}
          placeholder="e.g. Subtract 3 from both sides: y = 10 - 3 = 7"
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
