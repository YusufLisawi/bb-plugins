// Split a plain-text email into what the sender just wrote and the history
// their client quoted below it, across the common English and Spanish (plus
// French, German, Italian, Portuguese, Dutch) reply styles.

const ORIGINAL = /^-{2,}\s*(original message|mensaje original|message d'origine|ursprüngliche nachricht|messaggio originale|mensagem original|oorspronkelijk bericht)\s*-{2,}\s*$/i;
const WROTE = /^(on|el|le|am|il|op|em)\s.+(wrote|escribió|escribio|a écrit|schrieb|ha scritto|schreef|escreveu)\s*:?\s*$/i;
const WROTE_START = /^(on|el|le|am|il|op|em)\s/i;
const HEADER_FROM = /^\*?(from|de|von|da|van)\s*:\*?\s*\S/i;
const HEADER_NEXT = /^\*?(sent|enviado( el)?|date|fecha|gesendet|envoyé|inviato|data|verzonden|to|para|an|à|a)\s*:/i;
const OUTLOOK_RULE = /^_{8,}\s*$/;
const SIGNATURE = /^--\s?$/;
const FORWARD = /^(-{2,}\s*(forwarded message|mensaje reenviado|message transféré|weitergeleitete nachricht|messaggio inoltrato|mensagem encaminhada)\s*-{2,}|begin forwarded message:|inicio del mensaje reenviado:)/i;
const MOBILE_FOOTER = /^(sent from my (iphone|ipad|android|mobile|phone)|enviado desde mi (iphone|ipad|android|móvil|movil|teléfono)|get outlook for (ios|android)|obtener outlook para (ios|android)|enviado desde outlook para (ios|android)|sent from outlook for (ios|android)|sent from mail for windows|enviado desde correo para windows)/i;
const LABEL = /^(internal|interno|uso interno|public|público|publico|general|confidential|confidencial|c2 general|restricted|restringido)\s*$/i;

export interface SplitText {
  /** What this message adds. */
  body: string;
  /** Quoted history and signature, hidden until asked for. */
  quoted: string;
}

function findCut(lines: string[]): number {
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!.trim();
    if (!line) continue;
    // A forward's content is the message: keep all of it visible.
    if (FORWARD.test(line)) return lines.length;
    if (ORIGINAL.test(line)) return index;
    if (SIGNATURE.test(lines[index]!.trimEnd()) && index > 0) return index;
    if (WROTE.test(line)) return index;
    if (WROTE_START.test(line) && index + 1 < lines.length && WROTE.test(`${line} ${lines[index + 1]!.trim()}`)) return index;
    if (OUTLOOK_RULE.test(line) || HEADER_FROM.test(line)) {
      const start = OUTLOOK_RULE.test(line) ? index + 1 : index;
      const window = lines.slice(start, start + 6).map((entry) => entry.trim()).filter(Boolean);
      if (window.some((entry) => HEADER_FROM.test(entry)) && window.some((entry) => HEADER_NEXT.test(entry))) return index;
    }
    if (line.startsWith(">")) {
      const rest = lines.slice(index).map((entry) => entry.trim()).filter(Boolean);
      const quoted = rest.filter((entry) => entry.startsWith(">")).length;
      if (quoted / rest.length >= 0.6) return index;
    }
  }
  return lines.length;
}

export function splitQuoted(text: string): SplitText {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  // A classification banner ("Internal") above the greeting is noise.
  while (lines.length > 0 && (!lines[0]!.trim() || LABEL.test(lines[0]!.trim()))) lines.shift();
  const cut = findCut(lines);
  const bodyLines = lines.slice(0, cut);
  while (bodyLines.length > 0 && (!bodyLines[bodyLines.length - 1]!.trim() || MOBILE_FOOTER.test(bodyLines[bodyLines.length - 1]!.trim()))) bodyLines.pop();
  const body = bodyLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  const quoted = lines.slice(cut).join("\n").trim();
  // A message that is only a quote (a bare forward) keeps its text visible.
  if (!body && quoted) return { body: quoted, quoted: "" };
  return { body, quoted };
}
