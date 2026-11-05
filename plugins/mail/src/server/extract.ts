// Turn an attachment into plain text locally, so a small model only has to
// read words: PDFs, Word, PowerPoint, Excel, OpenDocument, text, CSV, HTML and
// calendar invites. Images are passed to the model as images instead.
import JSZip from "jszip";

export type AttachmentKind = "pdf" | "word" | "slides" | "sheet" | "text" | "image" | "unsupported";
export type ReadType = "pdf" | "office" | "images" | "text";

const MAX_TEXT = 15_000;

export function kindOf(filename: string, contentType: string): AttachmentKind {
  const name = filename.toLowerCase();
  const type = contentType.toLowerCase();
  if (type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (/\.(docx|odt)$/.test(name) || type.includes("wordprocessingml") || type.includes("opendocument.text")) return "word";
  if (/\.(pptx|odp)$/.test(name) || type.includes("presentationml") || type.includes("opendocument.presentation")) return "slides";
  if (/\.(xlsx|ods)$/.test(name) || type.includes("spreadsheetml") || type.includes("opendocument.spreadsheet")) return "sheet";
  if (/^image\/(png|jpe?g|gif|webp)$/.test(type) || /\.(png|jpe?g|gif|webp)$/.test(name)) return "image";
  if (type.startsWith("text/") || /\.(txt|csv|tsv|md|html?|json|ics|eml|xml|log)$/.test(name) || type === "application/json") return "text";
  return "unsupported";
}

/** Which settings switch covers this kind. */
export function readTypeOf(kind: AttachmentKind): ReadType | null {
  if (kind === "pdf") return "pdf";
  if (kind === "word" || kind === "slides" || kind === "sheet") return "office";
  if (kind === "image") return "images";
  if (kind === "text") return "text";
  return null;
}

function decodeXml(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_match, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function stripTags(xml: string): string {
  return decodeXml(xml.replace(/<[^>]+>/g, " ")).replace(/[ \t]+/g, " ").trim();
}

function byNumber(a: string, b: string): number {
  return Number(/(\d+)\.xml$/.exec(a)?.[1] ?? 0) - Number(/(\d+)\.xml$/.exec(b)?.[1] ?? 0);
}

async function pdfText(content: Buffer): Promise<{ text: string; pages: number }> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(content));
  const { text, totalPages } = await extractText(pdf, { mergePages: true });
  return { text: String(text), pages: totalPages };
}

async function wordText(content: Buffer, filename: string): Promise<string> {
  if (filename.toLowerCase().endsWith(".odt")) {
    const zip = await JSZip.loadAsync(content);
    const xml = (await zip.file("content.xml")?.async("string")) ?? "";
    return xml.split(/<\/text:p>|<\/text:h>/).map(stripTags).filter(Boolean).join("\n");
  }
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer: content });
  return result.value;
}

async function slidesText(content: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(content);
  const slides = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name)).sort(byNumber);
  if (slides.length === 0) {
    const xml = (await zip.file("content.xml")?.async("string")) ?? "";
    return xml.split(/<\/draw:page>/).map((page, index) => `Slide ${index + 1}: ${stripTags(page)}`).filter((line) => line.length > 10).join("\n");
  }
  const out: string[] = [];
  for (const [index, name] of slides.entries()) {
    const xml = (await zip.file(name)?.async("string")) ?? "";
    const words = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((match) => decodeXml(match[1]!)).join(" ");
    if (words.trim()) out.push(`Slide ${index + 1}: ${words.trim()}`);
  }
  return out.join("\n");
}

/** Excel and OpenDocument sheets as tab-separated rows (first 200 rows, 30 columns per sheet). */
async function sheetText(content: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(content);
  if (zip.file("content.xml") && !zip.file("xl/workbook.xml")) {
    const xml = (await zip.file("content.xml")!.async("string")) ?? "";
    return xml.split(/<\/table:table-row>/).slice(0, 200).map((row) => row.split(/<\/table:table-cell>/).slice(0, 30).map(stripTags).join("\t").trim()).filter(Boolean).join("\n");
  }
  const shared = ((await zip.file("xl/sharedStrings.xml")?.async("string")) ?? "")
    .split(/<\/si>/)
    .map((item) => [...item.matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((match) => decodeXml(match[1]!)).join(""));
  const workbook = (await zip.file("xl/workbook.xml")?.async("string")) ?? "";
  const names = [...workbook.matchAll(/<sheet[^>]*name="([^"]*)"/g)].map((match) => decodeXml(match[1]!));
  const sheets = Object.keys(zip.files).filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name)).sort(byNumber);
  const out: string[] = [];
  for (const [index, name] of sheets.entries()) {
    const xml = (await zip.file(name)?.async("string")) ?? "";
    const rows = xml.split(/<\/row>/).slice(0, 200).map((row) => {
      const cells = [...row.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)].slice(0, 30).map((cell) => {
        const attributes = cell[1] ?? "";
        const inner = cell[2] ?? "";
        const value = /<v>([^<]*)<\/v>/.exec(inner)?.[1] ?? "";
        if (/t="s"/.test(attributes)) return shared[Number(value)] ?? "";
        if (/t="inlineStr"/.test(attributes)) return stripTags(inner);
        return decodeXml(value);
      });
      return cells.join("\t").trim();
    }).filter(Boolean);
    if (rows.length) out.push(`# ${names[index] ?? `Sheet ${index + 1}`}\n${rows.join("\n")}`);
  }
  return out.join("\n\n");
}

function plainText(content: Buffer, filename: string, contentType: string): string {
  const raw = content.toString("utf8");
  if (/html/.test(contentType) || /\.html?$/i.test(filename)) {
    return decodeXml(raw.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<br\s*\/?>|<\/p>|<\/div>|<\/tr>/gi, "\n").replace(/<[^>]+>/g, " ")).replace(/[ \t]+/g, " ");
  }
  return raw;
}

export interface Extracted {
  kind: AttachmentKind;
  /** Empty for images (read by the model) and unsupported files. */
  text: string;
  note: string | null;
}

export async function extractAttachment(content: Buffer, filename: string, contentType: string): Promise<Extracted> {
  const kind = kindOf(filename, contentType);
  const clip = (text: string) => {
    const flat = text.replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    return flat.length > MAX_TEXT ? `${flat.slice(0, MAX_TEXT)}\n…[truncated]` : flat;
  };
  switch (kind) {
    case "pdf": {
      const { text, pages } = await pdfText(content);
      if (text.trim().length < 40) return { kind, text: "", note: `Scanned PDF (${pages} pages) with no text layer.` };
      return { kind, text: clip(text), note: `${pages} pages` };
    }
    case "word":
      return { kind, text: clip(await wordText(content, filename)), note: null };
    case "slides":
      return { kind, text: clip(await slidesText(content)), note: null };
    case "sheet":
      return { kind, text: clip(await sheetText(content)), note: null };
    case "text":
      return { kind, text: clip(plainText(content, filename, contentType)), note: null };
    case "image":
      return { kind, text: "", note: null };
    default:
      return { kind, text: "", note: "This file type can't be read yet." };
  }
}
