import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const topicId = body?.topicId as string | undefined;
    const scorePercent = body?.scorePercent as number | undefined;
    const answersJson = body?.answersJson as { questionId: string; selectedIndex: number }[] | undefined;

    if (!topicId || scorePercent == null) {
      return NextResponse.json({ error: "topicId and scorePercent required" }, { status: 400 });
    }

    const { error } = await supabase.from("quiz_attempts").insert({
      user_id: user.id,
      topic_id: topicId,
      score_percent: scorePercent,
      answers_json: answersJson ?? null,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Progress quiz error:", e);
    return NextResponse.json(
      { error: "Connection error. Please try again." },
      { status: 503 }
    );
  }
}
