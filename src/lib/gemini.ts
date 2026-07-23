// Gemini 2.5 Flash summarization helper.
//
// Produces a short Spanish "resumen para portfolio" for a merged PR, plus a
// change type (feature/fix/refactor/docs/perf/other). Uses native fetch only —
// no SDK dependency. The GOOGLE_API_KEY is read from env on the server ONLY,
// never logged, never sent to the client. Every failure path is captured and
// returned as { summary: null, error }; this function never throws.

interface SummarizePrInput {
  title: string;
  body: string;
  linkedIssueTitle?: string;
}

export interface SummarizePrResult {
  summary: string | null;
  type?: 'feature' | 'fix' | 'refactor' | 'docs' | 'perf' | 'other';
  error?: string;
}

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const MAX_OUTPUT_TOKENS = 1000;
const REQUEST_TIMEOUT_MS = 30_000;

// Truncate body to 3000 chars to avoid context saturation and keep the model
// focused on the high-level description rather than diffs/logs/tables.
const MAX_BODY_CHARS = 3000;

function truncateBody(body: string): string {
  if (body.length <= MAX_BODY_CHARS) return body;
  return body.slice(0, MAX_BODY_CHARS) + '\n\n[... resto truncado ...]';
}

function buildSystemInstruction(): string {
  return [
    'Eres un redactor técnico especializado en portfolios de desarrolladores.',
    'Tu trabajo es resumir Pull Requests merged en proyectos Open Source.',
    'Siempre respondes en español, con tono profesional y accesible.',
    'Usas verbos de acción en primera persona (Implementé, Optimicé, Refactoricé, Corregí).',
    'Destacás el valor técnico y el impacto, no los detalles internos del código.',
    'Si el body contiene métricas de rendimiento o benchmarks, las incluís.',
    'No inventás nada que no esté en el texto del PR.',
  ].join('\n');
}

function buildUserPrompt(input: SummarizePrInput): string {
  const issueLine = input.linkedIssueTitle
    ? `\n- Issue vinculada: ${input.linkedIssueTitle}`
    : '';
  return [
    'Resumí este PR para mi portfolio en EXACTAMENTE 2 oraciones:',
    '',
    'Primera oración: qué se implementó o resolvió (el valor técnico).',
    'Segunda oración: el impacto o beneficio para el proyecto (por qué importa).',
    '',
    'Además clasificá el tipo de cambio en una de estas categorías:',
    'feature, fix, refactor, docs, perf, other.',
    '',
    'Respondé SOLO con JSON en este formato exacto (sin markdown, sin texto adicional):',
    '{ "summary": "tus 2 oraciones aquí", "type": "feature" }',
    '',
    'DATOS DEL PR:',
    `- Título: ${input.title}${issueLine}`,
    `- Descripción:\n${truncateBody(input.body || '(sin descripción)')}`,
  ].join('\n');
}

/**
 * Summarize a PR via Gemini 2.5 Flash. Returns `{ summary, type }` on success
 * or `{ summary: null, error }` on any failure. Never throws. Never logs the
 * API key.
 */
export async function summarizePr(input: SummarizePrInput): Promise<SummarizePrResult> {
  const apiKey = import.meta.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return { summary: null, error: 'GOOGLE_API_KEY missing' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: buildSystemInstruction() }] },
        contents: [{ parts: [{ text: buildUserPrompt(input) }] }],
        generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS, temperature: 0.3 },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      return { summary: null, error: `Gemini HTTP ${res.status}` };
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text || text.trim().length === 0) {
      return { summary: null, error: 'Gemini returned empty summary' };
    }

    // Try to parse JSON response
    const cleaned = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
    try {
      const parsed = JSON.parse(cleaned) as { summary?: string; type?: string };
      if (!parsed.summary || parsed.summary.trim().length === 0) {
        return { summary: null, error: 'Gemini returned empty summary in JSON' };
      }
      const validTypes = ['feature', 'fix', 'refactor', 'docs', 'perf', 'other'] as const;
      const type = validTypes.includes(parsed.type as typeof validTypes[number])
        ? (parsed.type as SummarizePrResult['type'])
        : undefined;
      return { summary: parsed.summary.trim(), type };
    } catch {
      // Fallback: if JSON parsing fails, use raw text
      return { summary: text.trim() };
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Gemini request failed';
    return { summary: null, error: message };
  } finally {
    clearTimeout(timeout);
  }
}