"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button type="button" className="btn btn-secondary" style={{ padding: "0.4rem 0.8rem" }} onClick={signOut}>
      Sign out
    </button>
  );
}
