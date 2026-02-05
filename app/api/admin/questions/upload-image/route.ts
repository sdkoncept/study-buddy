import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const STORAGE_BUCKET = "lesson-images";
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || (profile as { role: string }).role !== "admin") return null;
  return user;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const user = await requireAdmin(supabase);
    if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const topicId = (formData.get("topicId") as string)?.trim();

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "Image file required" }, { status: 400 });
    }
    if (!topicId) {
      return NextResponse.json({ error: "topicId required" }, { status: 400 });
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "Image must be under 5 MB" }, { status: 400 });
    }

    const contentType = file.type || "";
    if (!ALLOWED_TYPES.includes(contentType) && !file.name?.match(/\.(png|jpe?g|webp|gif)$/i)) {
      return NextResponse.json({ error: "File must be PNG, JPEG, WebP, or GIF" }, { status: 400 });
    }

    const ext = file.name?.match(/\.(png|jpe?g|webp|gif)$/i)?.[1] ?? "png";
    const path = `questions/${topicId}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, buffer, { contentType: file.type || `image/${ext}`, upsert: false });

    if (error) {
      console.error("Question image upload error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(data.path);
    return NextResponse.json({ url: urlData.publicUrl });
  } catch (e) {
    console.error("Question image upload error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 500 }
    );
  }
}
