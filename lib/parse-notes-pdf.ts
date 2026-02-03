/**
 * Parse Biology-style notes PDF text into topics and lessons.
 * Expects: "Scheme of work" (or similar), table with WEEKS/TOPICS, then per-topic blocks with "Learning objectives:" and "I. Section title" style lessons.
 * Extracts week ranges (e.g. "1 & 2", "3", "4-5") so the same subject can be uploaded multiple times with different weeks.
 */
export type ParsedTopic = {
  title: string;
  weekRange: string | null;
  learningObjectives: string | null;
  lessons: { title: string; content: string }[];
};

/** Match week(s) at start: "1 & 2", "3", "4-5", "1  2" etc. Captures week part and rest. */
const TOPIC_TABLE_LINE = /^\s*([\d\s&\-]+?)\s{2,}(.+)$|^\s*([\d\s&\-]+)\t+(.+)$/;
/** Line with only week numbers then tab then title */
const TOPIC_TABLE_TAB = /^\s*([\d\s&\-]*)\t+(.+)$/;
/** Match "1. Topic title" or "1) Topic title" (number can be week) */
const NUMBERED_TOPIC_LINE = /^\s*(\d+)[.)]\s+(.+)$/;
/** "WEEK N" or "WEEK N - N" */
const WEEK_HEADING = /^\s*WEEK\s+(\d+(?:\s*[&\-]\s*\d+)?)\s*$/i;

type TopicEntry = { weekRange: string | null; title: string };

function normalizeWeekRange(s: string): string | null {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > 0 && t.length < 30 ? t : null;
}

export function parseNotesPdfText(rawText: string): ParsedTopic[] {
  const text = rawText.replace(/\r\n/g, "\n").trim();
  const lines = text.split("\n");

  // 1) Collect (weekRange, title) after "SCHEME OF WORK" / "WEEKS/TOPICS"
  const topicEntries: TopicEntry[] = [];
  let collectTopics = false;
  let skippedHeader = false;
  const schemePattern = /(?:SCHEME|Scheme)\s+OF\s+WORK|S\.?O\.?W\.?|WEEKS?\s*\/\s*TOPICS?/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (schemePattern.test(trimmed)) {
      collectTopics = true;
      skippedHeader = false;
      continue;
    }
    if (collectTopics) {
      if (/^--\s+\d+ of/.test(trimmed) || /^YEAR\s+\d/i.test(trimmed)) break;
      if (!trimmed) continue;
      if (!skippedHeader && /WEEKS?|TOPICS?|SUBTOPICS?/i.test(trimmed)) {
        skippedHeader = true;
        continue;
      }
      let weekRange: string | null = null;
      let topicTitle: string | null = null;
      const tabMatch = trimmed.match(TOPIC_TABLE_TAB);
      if (tabMatch) {
        weekRange = normalizeWeekRange(tabMatch[1]);
        topicTitle = tabMatch[2].trim();
      } else {
        const match = trimmed.match(TOPIC_TABLE_LINE);
        if (match) {
          const weekPart = (match[1] ?? match[3] ?? "").trim();
          const titlePart = (match[2] ?? match[4] ?? "").trim();
          if (titlePart) {
            weekRange = normalizeWeekRange(weekPart);
            topicTitle = titlePart;
          }
        }
        if (!topicTitle) {
          if (/^[\d\s&\-]+$/.test(trimmed)) continue;
          topicTitle = trimmed.replace(/^[\d\s&\-]+/, "").trim();
        }
      }
      if (topicTitle && topicTitle.length > 1 && topicTitle.length < 200 && !/^\d+$/.test(topicTitle)) {
        topicEntries.push({ weekRange, title: topicTitle });
      }
    }
  }

  // Fallback 1: "WEEK N" / "WEEK N - M" then next heading as topic
  if (topicEntries.length === 0) {
    for (let i = 0; i < lines.length; i++) {
      const weekMatch = lines[i].trim().match(WEEK_HEADING);
      if (weekMatch) {
        const weekRange = weekMatch[1].trim();
        for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
          const t = lines[j].trim();
          if (t.length < 4 || t.length > 80) continue;
          if (/^WEEK\s|^LEARNING|^OBJECTIVES|^EVALUATION/i.test(t)) continue;
          if (/^[A-Z][A-Z\s\-]+$/.test(t) || (/^[A-Z][a-zA-Z\s\-]+$/.test(t) && !t.endsWith("."))) {
            topicEntries.push({ weekRange: weekRange || null, title: t });
            break;
          }
        }
      }
    }
  }

  // Fallback 2: numbered list "1. Topic" — use number as week
  if (topicEntries.length === 0) {
    const searchEnd = Math.min(lines.length, 120);
    for (let i = 0; i < searchEnd; i++) {
      const match = lines[i].trim().match(NUMBERED_TOPIC_LINE);
      if (match) {
        const title = match[2].trim();
        if (title.length > 2 && title.length < 150 && !/^\d+$/.test(title)) {
          topicEntries.push({ weekRange: match[1], title });
        }
      }
    }
  }

  // Fallback 3: heading after blank or "WEEK N" (capture week from "WEEK N")
  if (topicEntries.length === 0) {
    for (let i = 0; i < lines.length - 1; i++) {
      const curr = lines[i].trim();
      const next = lines[i + 1].trim();
      const weekM = curr.match(WEEK_HEADING);
      const isAfterWeek = !!weekM;
      const isAfterBlank = curr === "";
      if (!isAfterWeek && !isAfterBlank) continue;
      if (next.length < 5 || next.length > 100) continue;
      if (/^WEEK\s|^LEARNING|^OBJECTIVES|^EVALUATION|^\d+[.)]\s/i.test(next)) continue;
      if (/\.\s*$/.test(next)) continue;
      if (/^[A-Z][A-Za-z\s\-]+$/.test(next) || /^[A-Z][A-Z\s\-]+$/.test(next)) {
        const weekRange = weekM ? weekM[1].trim() : null;
        topicEntries.push({ weekRange, title: next });
      }
    }
    const seen = new Set<string>();
    const deduped: TopicEntry[] = [];
    for (const e of topicEntries) {
      const key = e.title.toLowerCase().trim();
      if (!seen.has(key)) { seen.add(key); deduped.push(e); }
    }
    if (deduped.length > 0) {
      topicEntries.length = 0;
      topicEntries.push(...deduped);
    }
  }

  if (topicEntries.length === 0) return [];

  // 2) For each topic, find its section and build ParsedTopic with weekRange
  const topics: ParsedTopic[] = [];
  for (let i = 0; i < topicEntries.length; i++) {
    const { title, weekRange } = topicEntries[i];
    const nextTitle = topicEntries[i + 1]?.title;
    const headingPattern = new RegExp(`\\n\\s*${escapeRe(title)}\\s*\\n`, "gi");
    let sectionStart = -1;
    let match: RegExpExecArray | null;
    while ((match = headingPattern.exec(text)) !== null) {
      const before = text.slice(Math.max(0, match.index - 250), match.index);
      if (/Learning objectives|WEEK\s+\d/i.test(before)) {
        sectionStart = match.index + match[0].length;
        break;
      }
      if (sectionStart < 0) sectionStart = match.index + match[0].length;
    }
    if (sectionStart < 0) {
      topics.push({ title, weekRange, learningObjectives: null, lessons: [] });
      continue;
    }
    const endPatterns = [
      nextTitle ? new RegExp(`\\n\\s*${escapeRe(nextTitle)}\\s*\\n`, "i") : null,
      /\n\s*EVALUATION\s*\n/i,
      /\n\s*WEEK\s+\d/i,
      /\n--\s+\d+ of\s+\d+\s*--/,
    ].filter(Boolean) as RegExp[];
    let sectionEnd = text.length;
    for (const re of endPatterns) {
      re.lastIndex = sectionStart;
      const m = re.exec(text);
      if (m && m.index < sectionEnd) sectionEnd = m.index;
    }
    let sectionContent = text.slice(sectionStart, sectionEnd).trim();
    sectionContent = sectionContent.replace(/\n--\s+\d+ of \d+\s*--\s*/g, "\n").trim();

    const loInPrev = text.slice(Math.max(0, sectionStart - 400), sectionStart).match(/Learning objectives:\s*([\s\S]*?)(?=\n[A-Z]|\n\s*[IVX]+\.|$)/i);
    const learningObjectives = loInPrev ? loInPrev[1].trim().slice(0, 2000) || null : null;

    const lessons: { title: string; content: string }[] = [];
    const maxContent = 50000;
    const maxTitle = 300;

    // 1) Roman numerals: I. Title \n content
    const romanRe = /(?:^|\n)\s*([IVX]+\.)\s+([^\n]+)\n([\s\S]*?)(?=(?:\n\s*[IVX]+\.\s+)|\nEVALUATION|\nWEEK\s+\d|\n--\s+\d+ of|$)/gim;
    let romanMatch: RegExpExecArray | null;
    while ((romanMatch = romanRe.exec(sectionContent)) !== null) {
      const lessonTitle = romanMatch[2].trim();
      let content = romanMatch[3].trim();
      if (lessonTitle.length > 0 && (content.length > 0 || lessonTitle.length > 1)) {
        lessons.push({ title: lessonTitle.slice(0, maxTitle), content: content.slice(0, maxContent) || "(Content for this section.)" });
      }
    }

    // 2) Arabic numerals: 1. Title or 1) Title
    if (lessons.length === 0) {
      const arabicRe = /(?:^|\n)\s*(\d+)[.)]\s+([^\n]+)\n([\s\S]*?)(?=(?:\n\s*\d+[.)]\s+)|\nEVALUATION|\nWEEK\s+\d|\n--\s+\d+ of|$)/gim;
      let arabicMatch: RegExpExecArray | null;
      while ((arabicMatch = arabicRe.exec(sectionContent)) !== null) {
        const lessonTitle = arabicMatch[2].trim();
        let content = arabicMatch[3].trim();
        if (lessonTitle.length > 0 && (content.length > 0 || lessonTitle.length > 1)) {
          lessons.push({ title: lessonTitle.slice(0, maxTitle), content: content.slice(0, maxContent) || "(Content for this section.)" });
        }
      }
    }

    // 3) Split by double newline into blocks (first line = title, rest = content)
    if (lessons.length === 0 && sectionContent.length > 20) {
      const blocks = sectionContent.split(/\n\s*\n/).map((b) => b.trim()).filter((b) => b.length > 10);
      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        const firstLineEnd = block.indexOf("\n");
        const firstLine = firstLineEnd >= 0 ? block.slice(0, firstLineEnd).trim() : block;
        const rest = firstLineEnd >= 0 ? block.slice(firstLineEnd + 1).trim() : "";
        const useTitle = firstLine.length > 0 && firstLine.length < 200 ? firstLine : `${title} — Part ${i + 1}`;
        const useContent = rest.length > 0 ? rest : block;
        lessons.push({ title: useTitle.slice(0, maxTitle), content: useContent.slice(0, maxContent) || "(Content for this section.)" });
      }
    }

    // 4) Single lesson fallback: use whole section
    if (lessons.length === 0 && sectionContent.length > 20) {
      lessons.push({ title: title.slice(0, maxTitle), content: sectionContent.slice(0, maxContent) });
    }

    topics.push({ title: title.slice(0, maxTitle), weekRange, learningObjectives, lessons });
  }

  return topics;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
