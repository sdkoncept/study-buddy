"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  const isConnectionError =
    error.message?.includes("fetch") ||
    error.message?.includes("network") ||
    error.message?.includes("NEXT_PUBLIC_SUPABASE") ||
    error.message?.includes("Supabase");

  return (
    <div className="container" style={{ paddingTop: "3rem", maxWidth: "480px", textAlign: "center" }}>
      <h1 style={{ marginBottom: "0.5rem" }}>Something went wrong</h1>
      <p style={{ color: "var(--muted)", marginBottom: "1.5rem" }}>
        {isConnectionError
          ? "We couldn’t reach the server. Check your connection and try again."
          : "An unexpected error occurred. You can try again."}
      </p>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => reset()}
      >
        Try again
      </button>
      <p style={{ marginTop: "1.5rem", fontSize: "0.85rem", color: "var(--muted)" }}>
        <a href="/">Return home</a>
      </p>
    </div>
  );
}
