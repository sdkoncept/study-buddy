"use client";

import { useState } from "react";
import Link from "next/link";

type Subject = { id: string; name: string };

export function UploadNotesForm({ subjects }: { subjects: Subject[] }) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ topics: number; lessons: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [extractedPreview, setExtractedPreview] = useState<string | null>(null);
  const [parseHint, setParseHint] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !subjectId) return;
    setError(null);
    setResult(null);
    setExtractedPreview(null);
    setParseHint(null);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("subjectId", subjectId);
      const res = await fetch("/api/admin/notes/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `Upload failed (${res.status})`);
        if (data.extractedTextPreview) setExtractedPreview(data.extractedTextPreview);
        if (data.hint) setParseHint(data.hint);
        return;
      }
      setResult(data.created ?? { topics: 0, lessons: 0 });
      setFile(null);
      const input = document.getElementById("pdf-file") as HTMLInputElement;
      if (input) input.value = "";
    } finally {
      setLoading(false);
    }
  }

  if (subjects.length === 0) {
    return (
      <div className="card">
        <p style={{ marginBottom: "1rem", color: "var(--muted)" }}>
          Create at least one subject first, then upload notes PDFs here.
        </p>
        <Link href="/admin/subjects/new" className="btn btn-primary">Add subject</Link>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: 520 }}>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="subject">Subject</label>
          <select
            id="subject"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            required
            style={{ width: "100%", padding: "0.6rem 0.75rem", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)" }}
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="pdf-file">Notes PDF</label>
          <input
            id="pdf-file"
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required
            style={{ width: "100%", padding: "0.5rem", fontSize: "0.9rem" }}
          />
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: "0.35rem" }}>
            PDF should have a &quot;Scheme of work&quot; table (WEEKS / TOPICS) and topic sections. Week numbers (e.g. 1 & 2, 3) are stored so the same subject can be uploaded again with different weeks.
          </p>
        </div>
        {error && (
          <div style={{ marginBottom: "0.75rem" }}>
            <p style={{ color: "var(--error)", fontSize: "0.9rem" }}>{error}</p>
            {parseHint && <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: "0.35rem" }}>{parseHint}</p>}
            {extractedPreview && (
              <details style={{ marginTop: "0.75rem" }}>
                <summary style={{ cursor: "pointer", fontSize: "0.9rem", color: "var(--muted)" }}>Show extracted text (first ~2500 chars)</summary>
                <pre
                  style={{
                    marginTop: "0.5rem",
                    padding: "0.75rem",
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: "0.75rem",
                    maxHeight: 280,
                    overflow: "auto",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {extractedPreview}
                </pre>
              </details>
            )}
          </div>
        )}
        {result && (
          <p style={{ color: "var(--success)", marginBottom: "0.75rem", fontSize: "0.9rem" }}>
            Created <strong>{result.topics}</strong> topics and <strong>{result.lessons}</strong> lessons.
          </p>
        )}
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Uploading & parsing…" : "Upload and create topics & lessons"}
        </button>
      </form>
    </div>
  );
}
