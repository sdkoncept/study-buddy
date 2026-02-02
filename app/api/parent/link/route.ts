import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      let profileRes = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    let profile = profileRes.data as { role: string } | null;

    // If no profile (e.g. RLS or trigger missed), try to create it via ensure_profile
    if (!profile && user) {
      await supabase.rpc("ensure_profile");
      profileRes = await supabase.from("profiles").select("role").eq("id", user.id).single();
      profile = profileRes.data as { role: string } | null;
    }

    if (!profile) {
      return NextResponse.json(
        { error: "Your account has no profile. Run the SQL in supabase/ensure-profile-function.sql and supabase/backfill-missing-profiles.sql in Supabase SQL Editor (see README)." },
        { status: 403 }
      );
    }
    if (profile.role !== "parent") {
      return NextResponse.json(
        { error: "Only parent accounts can link students. Your account role is set as \"" + profile.role + "\". Ask an admin to change it to Parent in Supabase (Table Editor → profiles)." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const studentEmail = (body?.studentEmail as string)?.trim();
    if (!studentEmail) {
      return NextResponse.json({ error: "studentEmail required" }, { status: 400 });
    }

    const { data: studentProfile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("email", studentEmail)
      .single();

    if (!studentProfile) {
      return NextResponse.json({ error: "No account found with that email." }, { status: 404 });
    }
    if ((studentProfile as { role: string }).role !== "student") {
      return NextResponse.json({ error: "That account is not a student." }, { status: 400 });
    }

    const studentId = (studentProfile as { id: string }).id;
    const { error } = await supabase
      .from("parent_students")
      .upsert({ parent_id: user.id, student_id: studentId }, { onConflict: "parent_id,student_id" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Parent link error:", e);
    return NextResponse.json(
      { error: "Connection error. Please try again." },
      { status: 503 }
    );
  }
}
