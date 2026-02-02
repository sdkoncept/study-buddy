"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) {
        setError(err.message);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setError(
        msg.includes("NEXT_PUBLIC_SUPABASE") || msg.includes("fetch") || msg.includes("network")
          ? "Cannot reach the server. Check your connection and try again."
          : msg
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ paddingTop: "3rem", maxWidth: "400px" }}>
      <h1 style={{ marginBottom: "1.5rem" }}>Log in to Study Buddy</h1>
      <form onSubmit={handleSubmit} className="card">
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        {error && (
          <p style={{ color: "var(--error)", marginBottom: "1rem", fontSize: "0.9rem" }}>
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%" }}>
          {loading ? "Signing in…" : "Log in"}
        </button>
      </form>
      <p style={{ marginTop: "1rem", color: "var(--muted)", fontSize: "0.9rem" }}>
        Don’t have an account? <Link href="/signup">Sign up</Link>
      </p>
    </div>
  );
}
