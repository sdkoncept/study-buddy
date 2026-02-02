"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"student" | "parent" | "admin">("student");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName || undefined, role },
        },
      });
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
      <h1 style={{ marginBottom: "1.5rem" }}>Sign up for Study Buddy</h1>
      <form onSubmit={handleSubmit} className="card">
        <div className="form-group">
          <label htmlFor="fullName">Full name</label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
          />
        </div>
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
            minLength={6}
            autoComplete="new-password"
          />
        </div>
        <div className="form-group">
          <label htmlFor="role">I am a</label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as "student" | "parent" | "admin")}
          >
            <option value="student">Student</option>
            <option value="parent">Parent</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        {error && (
          <p style={{ color: "var(--error)", marginBottom: "1rem", fontSize: "0.9rem" }}>
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%" }}>
          {loading ? "Creating account…" : "Sign up"}
        </button>
      </form>
      <p style={{ marginTop: "1rem", color: "var(--muted)", fontSize: "0.9rem" }}>
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </div>
  );
}
