"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type SubjectFormProps = {
  subject?: {
    id: string;
    name: string;
    class_level: string;
    term: string;
    description: string | null;
    is_custom: boolean;
  };
};

export function SubjectForm({ subject }: SubjectFormProps) {
  const router = useRouter();
  const [name, setName] = useState(subject?.name ?? "");
  const [classLevel, setClassLevel] = useState(subject?.class_level ?? "Year 8");
  const [term, setTerm] = useState(subject?.term ?? "First");
  const [description, setDescription] = useState(subject?.description ?? "");
  const [isCustom, setIsCustom] = useState(subject?.is_custom ?? false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch(subject ? `/api/admin/subjects/${subject.id}` : "/api/admin/subjects", {
      method: subject ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        class_level: classLevel,
        term,
        description: description.trim() || null,
        is_custom: isCustom,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    router.push("/admin/subjects");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ maxWidth: "480px" }}>
      <div className="form-group">
        <label htmlFor="name">Name</label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="e.g. Mathematics, Edo Language"
        />
      </div>
      <div className="form-group">
        <label htmlFor="class_level">Class level</label>
        <input
          id="class_level"
          value={classLevel}
          onChange={(e) => setClassLevel(e.target.value)}
          placeholder="Year 8"
        />
      </div>
      <div className="form-group">
        <label htmlFor="term">Term</label>
        <select id="term" value={term} onChange={(e) => setTerm(e.target.value)}>
          <option value="First">First</option>
          <option value="Second">Second</option>
          <option value="Third">Third</option>
        </select>
      </div>
      <div className="form-group">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short description of the subject"
        />
      </div>
      <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <input
          id="is_custom"
          type="checkbox"
          checked={isCustom}
          onChange={(e) => setIsCustom(e.target.checked)}
        />
        <label htmlFor="is_custom" style={{ marginBottom: 0 }}>Custom subject (e.g. Edo Language)</label>
      </div>
      {error && <p style={{ color: "var(--error)", marginBottom: "0.5rem", fontSize: "0.9rem" }}>{error}</p>}
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Saving…" : subject ? "Update" : "Create"}
        </button>
        <Link href="/admin/subjects" className="btn btn-secondary">Cancel</Link>
      </div>
    </form>
  );
}
