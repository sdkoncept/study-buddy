"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";

/** AI study helper - works with or without topic context. Use throughout the platform. */
export function StudyHelpChat({
  topicId,
  subjectName,
  topicTitle,
  variant = "button",
}: {
  topicId?: string | null;
  subjectName?: string;
  topicTitle?: string;
  variant?: "button" | "inline";
}) {
  const [open, setOpen] = useState(false);

  const {
    messages,
    sendMessage,
    status,
    error,
    stop,
    clearError,
  } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/ai/ask",
      body: { topicId: topicId ?? undefined, subjectName, topicTitle },
    }),
  });

  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = input.trim();
    if (!t || status === "submitted" || status === "streaming") return;
    sendMessage({ text: t });
    setInput("");
  };

  const buttonLabel = topicId ? "Ask the teacher" : "Ask AI";
  const helpText = topicId
    ? "Ask questions about this topic. The AI teacher will use the lesson content to help you."
    : "Ask about any subject, topic, or concept. I can help you study and understand the material.";

  if (!open && variant === "button") {
    return (
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => setOpen(true)}
        style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
      >
        <span aria-hidden>💬</span> {buttonLabel}
      </button>
    );
  }

  if (!open && variant === "inline") {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          bottom: "1.5rem",
          right: "1.5rem",
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.75rem 1rem",
          background: "var(--accent)",
          color: "white",
          border: "none",
          borderRadius: 999,
          fontSize: "0.95rem",
          fontWeight: 600,
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}
      >
        <span aria-hidden>💬</span> Ask AI
      </button>
    );
  }

  return (
    <div
      className="card"
      style={{
        marginTop: variant === "inline" ? 0 : "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        maxHeight: variant === "inline" ? "min(80vh, 500px)" : "420px",
        ...(variant === "inline" && {
          position: "fixed",
          bottom: "1.5rem",
          right: "1.5rem",
          zIndex: 100,
          width: "min(400px, calc(100vw - 3rem))",
          boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
        }),
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ fontSize: "1rem", margin: 0 }}>💬 {buttonLabel}</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          style={{
            background: "none",
            border: "none",
            color: "var(--muted)",
            cursor: "pointer",
            padding: "0.25rem",
            fontSize: "1.25rem",
            lineHeight: 1,
          }}
          aria-label="Close"
        >
          ×
        </button>
      </div>
      <p style={{ color: "var(--muted)", fontSize: "0.85rem", margin: 0 }}>{helpText}</p>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          minHeight: 120,
          maxHeight: 240,
          padding: "0.75rem",
          background: "var(--bg)",
          borderRadius: 8,
          border: "1px solid var(--border)",
        }}
      >
        {messages.length === 0 && (
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", margin: 0 }}>
            {topicId
              ? 'Ask a question to get started. e.g. "Can you explain this in simpler terms?"'
              : 'Ask anything! e.g. "Help me understand algebra" or "What topics should I study next?"'}
          </p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} style={{ marginBottom: "0.75rem" }}>
            <span
              style={{
                display: "inline-block",
                fontWeight: 600,
                fontSize: "0.8rem",
                color: msg.role === "user" ? "var(--accent)" : "var(--success)",
                marginBottom: "0.25rem",
              }}
            >
              {msg.role === "user" ? "You" : "AI"}
            </span>
            <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5, fontSize: "0.95rem" }}>
              {msg.parts.map((part, i) => {
                if (typeof part === "object" && part !== null && "type" in part && (part as { type: string }).type === "text" && "text" in part) {
                  return <span key={`${msg.id}-${i}`}>{(part as { text: string }).text}</span>;
                }
                return null;
              })}
            </div>
          </div>
        ))}
        {(status === "submitted" || status === "streaming") && (
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", fontStyle: "italic", margin: 0 }}>Thinking…</p>
        )}
      </div>

      {error && (
        <div
          style={{
            padding: "0.5rem 0.75rem",
            background: "rgba(248, 113, 113, 0.15)",
            border: "1px solid var(--error)",
            borderRadius: 8,
            fontSize: "0.85rem",
            color: "var(--error)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{error.message}</span>
          <button type="button" onClick={clearError} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", textDecoration: "underline", fontSize: "0.85rem" }}>
            Dismiss
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem" }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question..."
          disabled={status === "submitted" || status === "streaming"}
          style={{
            flex: 1,
            padding: "0.5rem 0.75rem",
            background: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            color: "var(--text)",
            fontSize: "0.95rem",
          }}
        />
        {status === "streaming" || status === "submitted" ? (
          <button type="button" className="btn btn-secondary" onClick={stop}>Stop</button>
        ) : (
          <button type="submit" className="btn btn-primary" disabled={!input.trim()}>Send</button>
        )}
      </form>
    </div>
  );
}
