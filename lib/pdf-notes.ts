/**
 * Extract text and page images from a notes PDF.
 * - Text: used for parsing topics/lessons (via pdf-parse).
 * - Page images: one image per page, distributed across lessons by order.
 */

export type PdfNotesResult = {
  fullText: string;
  /** One buffer per page (PNG). Empty if extraction failed or was skipped. */
  pageImageBuffers: Buffer[];
  numPages: number;
};

/**
 * Extract full text from PDF (for parser).
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  if (typeof globalThis.DOMMatrix === "undefined") {
    const DOMMatrixPolyfill = (await import("@thednp/dommatrix")).default;
    (globalThis as unknown as { DOMMatrix: unknown }).DOMMatrix = DOMMatrixPolyfill;
  }
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  const textResult = await parser.getText();
  const text = textResult?.text ?? "";
  await parser.destroy?.();
  return text;
}

/**
 * Extract page images from PDF. Uses pdf-to-img (data URL from buffer).
 * Returns one PNG buffer per page, in order.
 */
export async function extractPdfPageImages(buffer: Buffer): Promise<Buffer[]> {
  const buffers: Buffer[] = [];
  try {
    const dataUrl = `data:application/pdf;base64,${buffer.toString("base64")}`;
    const { pdf } = await import("pdf-to-img");
    const document = await pdf(dataUrl, { scale: 2 });
    for await (const image of document) {
      buffers.push(Buffer.from(image));
    }
  } catch (e) {
    console.warn("PDF page image extraction failed (non-fatal):", e);
  }
  return buffers;
}

/**
 * Full extraction: text + page images. Use for notes upload.
 */
export async function extractPdfNotes(buffer: Buffer): Promise<PdfNotesResult> {
  const [fullText, pageImageBuffers] = await Promise.all([
    extractPdfText(buffer),
    extractPdfPageImages(buffer),
  ]);
  return {
    fullText: fullText.trim(),
    pageImageBuffers,
    numPages: pageImageBuffers.length,
  };
}

/**
 * Map lesson index to page indices (0-based). Spreads lessons evenly across pages.
 * E.g. 3 lessons, 10 pages -> lesson 0: [0,1,2,3], lesson 1: [4,5,6], lesson 2: [7,8,9].
 */
export function lessonIndexToPageIndices(
  lessonIndex: number,
  totalLessons: number,
  numPages: number
): number[] {
  if (numPages === 0 || totalLessons === 0) return [];
  const start = Math.floor((lessonIndex / totalLessons) * numPages);
  const end =
    lessonIndex < totalLessons - 1
      ? Math.floor(((lessonIndex + 1) / totalLessons) * numPages) - 1
      : numPages - 1;
  const pages: number[] = [];
  for (let p = start; p <= end && p < numPages; p++) pages.push(p);
  return pages.length > 0 ? pages : [start];
}
