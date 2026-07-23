// Gemini 2.5 Flash summarization helper.
//
// Produces a short Spanish "resumen para humanos" for a merged PR. Uses native
// fetch only — no SDK dependency. The GOOGLE_API_KEY is read from env on the
// server ONLY, never logged, never sent to the client. Every failure path is
// captured and returned as { summary: null, error }; this function never throws.

interface SummarizePrInput {
  title: string;
  body: string;
  linkedIssueTitle?: string;
}

interface SummarizePrResult {
  summary: string | null;
  error?: string;
}

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const MAX_OUTPUT_TOKENS = 600;
const REQUEST_TIMEOUT_MS = 30_000;

function buildPrompt(input: SummarizePrInput): string {
  const issueLine = input.linkedIssueTitle
    ? `\nIssue vinculada: ${input.linkedIssueTitle}`
    : '';
  return [
    'Resumí este pull request en 2-3 oraciones en español, para un recruiter técnico o colega desarrollador.',
    'No inventes detalles técnicos que no estén en el texto. Sé conciso y claro.',
    'Mencioná el problema que resuelve si está en el body. No incluyas el link en el resumen (lo agregamos nosotros después).',
    'IMPORTANTE: sé específico sobre el problema técnico y la solución. No te quedes en "corrige un bug" genérico — explicá QUÉ bug y CÓMO se soluciona.',
    '',
    `Título: ${input.title}`,
    `Body: ${input.body || '(sin descripción)'}${issueLine}`,
  ].join('\n');
}

/**
 * Summarize a PR via Gemini 2.5 Flash. Returns `{ summary }` on success or
 * `{ summary: null, error }` on any failure (missing key, network, non-2xx,
 * empty response, parse error). Never throws. Never logs the API key.
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
        contents: [{ parts: [{ text: buildPrompt(input) }] }],
        generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS, temperature: 0.3 },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      // Do not include the response body — it could echo parts of the request.
      return { summary: null, error: `Gemini HTTP ${res.status}` };
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text || text.trim().length === 0) {
      return { summary: null, error: 'Gemini returned empty summary' };
    }
    return { summary: text.trim() };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Gemini request failed';
    return { summary: null, error: message };
  } finally {
    clearTimeout(timeout);
  }
}