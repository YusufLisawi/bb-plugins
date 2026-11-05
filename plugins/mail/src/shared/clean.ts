// Trim what an email carries besides its message: quoted history, signature
// blocks, legal disclaimers and link noise. The reader folds these away; the
// AI never sees them, which keeps prompts short and on-topic.
import { splitQuoted } from "./quotes.js";

const CLOSING_PART = /^(un saludo|saludos|un abrazo|abrazos|atentamente|cordialmente|gracias|muchas gracias|mil gracias|best|best regards|kind regards|regards|thanks|thank you|many thanks|cheers|bien à vous|cordialement|merci|mit freundlichen grüßen|viele grüße|un cordial saludo|reciba un cordial saludo|quedo a la espera|quedamos a la espera|sincerely|warm regards|talk soon|un fuerte abrazo|besos|bss)$/i;

/** "Un Abrazo y Gracias", "Thanks, best" — a line made only of closing phrases. */
export function isClosing(line: string): boolean {
  if (!line || line.length > 60) return false;
  const parts = line.toLowerCase().replace(/[.!¡]+/g, "").split(/\s+(?:y|and|&)\s+|,\s*/).map((part) => part.trim()).filter(Boolean);
  return parts.length > 0 && parts.every((part) => CLOSING_PART.test(part));
}
const SIGNATURE_LINE = /(\+?\d[\d\s().-]{6,}\d)|(\bwww\.|https?:\/\/)|(@[\w-]+\.\w+)|(\|\|)|(\s\|\s)|\b(tel|tlf|tfno|móvil|movil|mobile|phone|fax|ext)\b\.?|\b(c\/|calle|avda|avenida|plaza|street|st\.|suite|planta|piso)\b|\b(ceo|cto|cfo|coo|manager|director|directora|responsable|head of|founder|fundador|gerente|consultor|consultant|engineer|ingeniero|departamento|department)\b/i;
const DISCLAIMER = /(confidencial|confidential|aviso legal|legal notice|protección de datos|proteccion de datos|data protection|\brgpd\b|\bgdpr\b|\blopd\b|destinatario|intended recipient|privileged|antes de imprimir|before printing|please consider the environment|este (mensaje|correo)|this (e-?mail|message) (and|may|is)|exento de responsabilidad|virus)/i;
const NOISE = [
  /<(?:https?|tel|mailto|sip):[^>\s]+>/gi,
  /\[(?:cid|image)[^\]]*\]/gi,
  /\[https?:\/\/[^\]]+\]/gi,
];

export interface SplitMessage {
  /** What the sender actually wrote. */
  body: string;
  /** Signature, disclaimer and quoted history, folded by default. */
  folded: string;
}

function tidy(text: string): string {
  let out = text;
  for (const pattern of NOISE) out = out.replace(pattern, "");
  return out
    // Long tracking links read as noise; keep their domain.
    .replace(/https?:\/\/([^/\s]+)\/\S{60,}/g, (_match, host: string) => `https://${host}/…`)
    .replace(/^[ \t]*[-_=*~]{5,}[ \t]*$/gm, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Where a legal footer starts near the end of `lines`, or -1. */
function disclaimerStart(lines: string[]): number {
  for (let index = Math.max(0, lines.length - 40); index < lines.length; index += 1) {
    const line = lines[index]!.trim();
    if (line.length > 40 && DISCLAIMER.test(line)) {
      let start = index;
      while (start > 0 && lines[start - 1]!.trim()) start -= 1;
      if (start > 0) return start;
    }
  }
  return -1;
}

/** Find where a signature or legal footer starts in `lines`, or -1. */
function signatureStart(all: string[]): number {
  const legal = disclaimerStart(all);
  const lines = legal > 0 ? all.slice(0, legal) : all;
  // A closing ("Un saludo,") followed by a name and contact details.
  for (let index = Math.max(0, lines.length - 18); index < lines.length; index += 1) {
    if (!isClosing(lines[index]!.trim())) continue;
    const rest = lines.slice(index + 1).map((line) => line.trim()).filter(Boolean);
    const contact = rest.slice(1).filter((line) => SIGNATURE_LINE.test(line)).length;
    // Keep the closing and the name; fold the business card below them.
    if (rest.length > 2 && (contact >= 1 || rest.length > 4)) {
      let cut = index + 1;
      // A second closing line ("Gracias" then "Un saludo.") stays with the first.
      while (cut < lines.length && (!lines[cut]!.trim() || isClosing(lines[cut]!.trim()))) cut += 1;
      return cut + 1;
    }
  }
  return legal;
}

/** Split an email into what was written and what can be folded away. */
export function splitMessage(text: string): SplitMessage {
  const quoted = splitQuoted(text);
  const lines = tidy(quoted.body).split("\n");
  const cut = signatureStart(lines);
  const body = (cut > 0 ? lines.slice(0, cut) : lines).join("\n").trim();
  const signature = cut > 0 ? lines.slice(cut).join("\n").trim() : "";
  const folded = [signature, quoted.quoted].filter(Boolean).join("\n\n");
  return { body: body || quoted.body.trim(), folded };
}

/** Just the message, trimmed for an AI prompt. */
export function cleanForAi(text: string, maxChars = 1500): string {
  const { body } = splitMessage(text);
  const flat = body.replace(/\n{2,}/g, "\n").trim();
  return flat.length > maxChars ? `${flat.slice(0, maxChars - 1)}…` : flat;
}

/** A rough language guess for style matching: "es", "en", "fr", "de", "pt" or "other". */
export function guessLanguage(text: string): string {
  const words = text.toLowerCase().match(/[a-záéíóúñüçàèêëïôœ]+/g) ?? [];
  const score: Record<string, number> = { es: 0, en: 0, fr: 0, de: 0, pt: 0 };
  const lists: Record<string, string[]> = {
    es: ["que", "de", "el", "la", "los", "por", "para", "con", "una", "es", "gracias", "hola", "saludo", "muchas", "pero", "como", "está"],
    en: ["the", "and", "to", "of", "you", "for", "is", "with", "thanks", "hi", "please", "regards", "this", "that", "we"],
    fr: ["le", "les", "des", "est", "pour", "avec", "une", "merci", "bonjour", "nous", "vous", "cordialement"],
    de: ["und", "der", "die", "das", "ist", "mit", "für", "danke", "bitte", "wir", "sie", "nicht"],
    pt: ["que", "não", "obrigado", "olá", "para", "com", "uma", "você", "estou", "muito"],
  };
  for (const word of words) for (const [lang, list] of Object.entries(lists)) if (list.includes(word)) score[lang]! += 1;
  const [best, count] = Object.entries(score).sort((a, b) => b[1] - a[1])[0]!;
  return count >= 2 ? best : "other";
}
