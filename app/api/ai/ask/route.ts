import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { groq } from "@ai-sdk/groq";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { messages, topicId } = body as { messages: UIMessage[]; topicId?: string };

    if (!messages || !Array.isArray(messages))
      return NextResponse.json({ error: "messages required" }, { status: 400 });

    if (!process.env.GROQ_API_KEY) {
      console.error("GROQ_API_KEY not set");
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 503 }
      );
    }

    let systemPrompt = `You are a supportive personal teacher for Year 8 students using the Study Buddy learning platform. Your role is to:
- Break down subjects, topics, and lessons so students gain wholesome, thorough understanding
- Explain concepts simply, with examples where helpful
- Answer questions about the lesson content
- Encourage the student and help them connect ideas
- Stay focused on the curriculum and lesson material; avoid unrelated topics
- Use clear, age-appropriate language`;

    if (topicId) {
      const { data: topic } = await supabase
        .from("topics")
        .select("id, title, learning_objectives, estimated_study_time_minutes, subjects(name, class_level)")
        .eq("id", topicId)
        .single();

      const topicData = topic as {
        title?: string;
        learning_objectives?: string | null;
        estimated_study_time_minutes?: number;
        subjects?: { name?: string; class_level?: string } | null;
      } | null;

      if (topicData) {
        const subjectName = topicData.subjects?.name ?? "Unknown subject";
        const classLevel = topicData.subjects?.class_level ?? "Year 8";
        const objectives = topicData.learning_objectives ?? "Not specified";

        const { data: lessons } = await supabase
          .from("lessons")
          .select("id, title, content, sort_order")
          .eq("topic_id", topicId)
          .order("sort_order", { ascending: true });

        const lessonsText = (lessons ?? [])
          .map(
            (l: { title: string; content: string }, i: number) =>
              `Lesson ${i + 1}: ${l.title}\n${l.content}`
          )
          .join("\n\n---\n\n");

        systemPrompt += `\n\n## Current context\nSubject: ${subjectName} (${classLevel})\nTopic: ${topicData.title}\nLearning objectives: ${objectives}\n\n## Lesson content\n${lessonsText || "(No lessons yet)"}\n\nUse the lesson content above to answer the student's questions. Stay grounded in this material.`;
      }
    }

    const modelId = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
    const result = streamText({
      model: groq(modelId),
      system: systemPrompt,
      messages: await convertToModelMessages(messages as unknown as UIMessage[]),
    });

    return result.toUIMessageStreamResponse();
  } catch (e) {
    console.error("AI ask error:", e);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
