"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type LessonFormProps = {
  topicId: string;
  lesson?: {
    id: string;
    topic_id: string;
    title: string;
    content: string;
    image_url: string | null;
    image_urls?: string[] | null;
    audio_url: string | null;
  };
};

export function LessonForm({ topicId, lesson }: LessonFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(lesson?.title ?? "");
  const [content, setContent] = useState(lesson?.content ?? "");
  const [imageUrlsText, setImageUrlsText] = useState(() => {
    if (lesson?.image_urls?.length) return lesson.image_urls!.join("\n");
    if (lesson?.image_url) return lesson.image_url;
    return "";
  });
  const [audioUrl, setAudioUrl] = useState(lesson?.audio_url ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const imageUrls = imageUrlsText
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const url = lesson ? `/api/admin/lessons/${lesson.id}` : "/api/admin/lessons";
    const res = await fetch(url, {
      method: lesson ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic_id: topicId,
        title: title.trim(),
        content: content.trim(),
        image_url: imageUrls[0] ?? null,
        image_urls: imageUrls,
        audio_url: audioUrl.trim() || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    router.push(`/admin/topics/${topicId}/lessons`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ maxWidth: "640px" }}>
      <div className="form-group">
        <label htmlFor="title">Lesson title</label>
        <input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="e.g. What is a variable?"
        />
      </div>
      <div className="form-group">
        <label htmlFor="content">Content (text)</label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          rows={8}
          placeholder="Lesson explanation..."
        />
      </div>
      <div className="form-group">
        <label htmlFor="image_urls">Image URLs (optional, one per line)</label>
        <textarea
          id="image_urls"
          value={imageUrlsText}
          onChange={(e) => setImageUrlsText(e.target.value)}
          rows={3}
          placeholder={"https://example.com/image1.png\nhttps://example.com/image2.png"}
        />
        <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
          Add multiple image URLs; one per line. All will be shown in the lesson.
        </p>
      </div>
      <div className="form-group">
        <label htmlFor="audio_url">Audio URL (optional, for languages)</label>
        <input
          id="audio_url"
          type="url"
          value={audioUrl}
          onChange={(e) => setAudioUrl(e.target.value)}
          placeholder="https://..."
        />
      </div>
      {error && <p style={{ color: "var(--error)", marginBottom: "0.5rem", fontSize: "0.9rem" }}>{error}</p>}
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Saving…" : lesson ? "Update" : "Create"}
        </button>
        <Link href={`/admin/topics/${topicId}/lessons`} className="btn btn-secondary">Cancel</Link>
      </div>
    </form>
  );
}
