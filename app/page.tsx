import Link from "next/link";

export default function HomePage() {
  return (
    <div className="container" style={{ paddingTop: "3rem", textAlign: "center" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>Study Buddy</h1>
      <p style={{ color: "var(--muted)", marginBottom: "2rem" }}>
        Learn, practice, and track your progress. Year 8.
      </p>
      <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
        <Link href="/login" className="btn btn-primary">Log in</Link>
        <Link href="/signup" className="btn btn-secondary">Sign up</Link>
      </div>
    </div>
  );
}
