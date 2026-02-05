import { requireProfile } from "@/lib/auth";
import Link from "next/link";
import { SignOutButton } from "./SignOutButton";
import { FloatingAIButton } from "./FloatingAIButton";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();

  return (
    <div>
      {profile.role === "student" && <FloatingAIButton show />}
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          padding: "0.75rem 1rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <Link href="/dashboard" style={{ fontWeight: 600, color: "var(--text)" }}>
          Study Buddy
        </Link>
        <nav style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <span style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
            {profile.full_name || profile.email}
          </span>
          <span className="badge badge-muted">{profile.role}</span>
          {profile.role === "admin" && (
            <Link href="/admin" className="btn btn-secondary" style={{ padding: "0.4rem 0.8rem" }}>
              Admin
            </Link>
          )}
          {profile.role === "parent" && (
            <Link href="/parent" className="btn btn-secondary" style={{ padding: "0.4rem 0.8rem" }}>
              My children
            </Link>
          )}
          <SignOutButton />
        </nav>
      </header>
      <main className="container" style={{ paddingTop: "1.5rem", paddingBottom: "2rem" }}>
        {children}
      </main>
    </div>
  );
}
