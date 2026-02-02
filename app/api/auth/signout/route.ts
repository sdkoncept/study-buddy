import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"), 302);
  } catch (e) {
    console.error("Signout error:", e);
    return NextResponse.redirect(new URL("/?signout=error", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"), 302);
  }
}
