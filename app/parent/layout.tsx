import { requireProfile } from "@/lib/auth";
import Link from "next/link";
import { SignOutButton } from "@/app/dashboard/SignOutButton";

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();

  return (
    <div>
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
        <Link href="/parent" style={{ fontWeight: 600, color: "var(--text)" }}>
          Study Buddy
        </Link>
        <nav style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <span style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
            {profile.full_name || profile.email}
          </span>
          <span className="badge badge-muted">{profile.role}</span>
          <Link href="/parent" className="btn btn-secondary" style={{ padding: "0.4rem 0.8rem" }}>
            My children
          </Link>
          <Link href="/parent/content" className="btn btn-secondary" style={{ padding: "0.4rem 0.8rem" }}>
            Browse content
          </Link>
          <Link href="/dashboard" className="btn btn-secondary" style={{ padding: "0.4rem 0.8rem" }}>
            Dashboard
          </Link>
          <SignOutButton />
        </nav>
      </header>
      <main className="container" style={{ paddingTop: "1.5rem", paddingBottom: "2rem" }}>
        {children}
      </main>
    </div>
  );
}
