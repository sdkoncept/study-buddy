import { createClient } from "@/lib/supabase/server";
import { parseNotesPdfText } from "@/lib/parse-notes-pdf";
import { extractPdfNotes, lessonIndexToPageIndices } from "@/lib/pdf-notes";
import { NextResponse } from "next/server";

const STORAGE_BUCKET = "lesson-images";

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || (profile as { role: string }).role !== "admin") return null;
  return user;
}

/** Upload page images to Supabase Storage; returns public URLs by page index. */
async function uploadPageImages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  subjectId: string,
  pageBuffers: Buffer[]
): Promise<Map<number, string>> {
  const urlByPage = new Map<number, string>();
  if (pageBuffers.length === 0) return urlByPage;
  const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const prefix = `${subjectId}/${uploadId}`;
  for (let p = 0; p < pageBuffers.length; p++) {
    const path = `${prefix}/page-${p}.png`;
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, pageBuffers[p], { contentType: "image/png", upsert: false });
    if (error) {
      console.warn("Storage upload failed for page", p, error.message);
      continue;
    }
    const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(data.path);
    urlByPage.set(p, urlData.publicUrl);
  }
  return urlByPage;
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const user = await requireAdmin(supabase);
    if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const subjectId = (formData.get("subjectId") as string)?.trim();

    if (!file || file.size === 0) return NextResponse.json({ error: "PDF file required" }, { status: 400 });
    if (!subjectId) return NextResponse.json({ error: "subjectId required" }, { status: 400 });

    const contentType = file.type || "";
    if (!contentType.includes("pdf") && !file.name?.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
    }

    const { data: subject, error: subErr } = await supabase
      .from("subjects")
      .select("id")
      .eq("id", subjectId)
      .single();
    if (subErr || !subject) return NextResponse.json({ error: "Subject not found" }, { status: 404 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const { fullText, pageImageBuffers, numPages } = await extractPdfNotes(buffer);

    if (!fullText || fullText.length < 50) {
      return NextResponse.json({ error: "PDF has no extractable text or is too short" }, { status: 400 });
    }

    const parsed = parseNotesPdfText(fullText);
    if (parsed.length === 0) {
      const snippet = fullText.slice(0, 2500).replace(/\n/g, "\n");
      return NextResponse.json(
        {
          error: "Could not parse any topics from the PDF. Check that it has a 'Scheme of work' table and topic headings.",
          extractedTextPreview: snippet,
          hint: "If your PDF uses different headings (e.g. 'Topics', 'Units'), share this preview to adapt the parser.",
        },
        { status: 400 }
      );
    }

    const totalLessons = parsed.reduce((sum, t) => sum + t.lessons.length, 0);
    const pageUrls = await uploadPageImages(supabase, subjectId, pageImageBuffers);

    const { data: maxTopic } = await supabase
      .from("topics")
      .select("sort_order")
      .eq("subject_id", subjectId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    let topicSortOrder = (maxTopic as { sort_order: number } | null)?.sort_order ?? 0;

    let totalInserted = 0;
    const createdTopicIds: string[] = [];
    let globalLessonIndex = 0;

    for (const topic of parsed) {
      topicSortOrder += 1;
      const { data: insertedTopic, error: topicErr } = await supabase
        .from("topics")
        .insert({
          subject_id: subjectId,
          title: topic.title,
          week_range: topic.weekRange ?? null,
          learning_objectives: topic.learningObjectives,
          sort_order: topicSortOrder,
        })
        .select("id")
        .single();
      if (topicErr) {
        console.error("Topic insert error:", topicErr);
        return NextResponse.json({ error: `Failed to create topic: ${topicErr.message}` }, { status: 500 });
      }
      const topicId = (insertedTopic as { id: string }).id;
      createdTopicIds.push(topicId);

      let lessonSortOrder = 0;
      for (const lesson of topic.lessons) {
        const pageIndices = lessonIndexToPageIndices(globalLessonIndex, totalLessons, numPages);
        const imageUrls = pageIndices
          .map((p) => pageUrls.get(p))
          .filter((u): u is string => Boolean(u));
        lessonSortOrder += 1;
        const { error: lessonErr } = await supabase.from("lessons").insert({
          topic_id: topicId,
          title: lesson.title,
          content: lesson.content || "(No content)",
          image_url: imageUrls[0] ?? null,
          image_urls: imageUrls.length > 0 ? imageUrls : [],
          sort_order: lessonSortOrder,
        });
        if (lessonErr) {
          console.error("Lesson insert error:", lessonErr);
          globalLessonIndex += 1;
          continue;
        }
        totalInserted += 1;
        globalLessonIndex += 1;
      }
    }

    return NextResponse.json({
      ok: true,
      created: { topics: parsed.length, lessons: totalInserted, images: pageUrls.size },
      topicIds: createdTopicIds,
    });
  } catch (e) {
    console.error("Notes upload error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 500 }
    );
  }
}
