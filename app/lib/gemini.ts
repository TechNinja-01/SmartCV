import { GoogleGenerativeAI } from '@google/generative-ai';

// Current "stable-first" order (per incident mitigation):
// 1) gemini-1.5-flash
// 2) gemini-1.5-pro
// 3) gemini-2.5-flash (last; currently overloaded)
const DEFAULT_MODEL = 'gemini-1.5-flash';
const FALLBACK_MODELS = ['gemini-1.5-pro', 'gemini-2.5-flash'] as const;

export const GEMINI_UNAVAILABLE_MESSAGE =
  'Gemini API is temporarily unavailable. Please try again in a few minutes.';

type CallGeminiOptions = {
  responseMimeType?: string;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let cachedAvailableModels: string[] | null = null;
let cachedAvailableModelsAt = 0;
const AVAILABLE_MODELS_TTL_MS = 5 * 60 * 1000;

const coerceStatusCode = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const match = value.match(/\b(429|503)\b/);
    if (match) return Number(match[1]);
    const asNum = Number(value);
    if (Number.isFinite(asNum)) return asNum;
  }
  return undefined;
};

const getErrorStatusCode = (err: unknown): number | undefined => {
  if (!err || typeof err !== 'object') return undefined;
  const anyErr = err as any;
  return (
    coerceStatusCode(anyErr.status) ??
    coerceStatusCode(anyErr.statusCode) ??
    coerceStatusCode(anyErr.httpStatus) ??
    coerceStatusCode(anyErr.code) ??
    coerceStatusCode(anyErr?.response?.status) ??
    coerceStatusCode(anyErr?.response?.statusCode) ??
    coerceStatusCode(anyErr?.error?.code) ??
    coerceStatusCode(anyErr?.cause?.status) ??
    coerceStatusCode(anyErr?.cause?.statusCode) ??
    coerceStatusCode(anyErr?.cause?.code) ??
    coerceStatusCode(anyErr?.cause?.response?.status) ??
    coerceStatusCode(anyErr?.message) ??
    coerceStatusCode(String(err))
  );
};

const listAvailableModels = async (apiKey: string) => {
  const now = Date.now();
  if (
    cachedAvailableModels &&
    now - cachedAvailableModelsAt < AVAILABLE_MODELS_TTL_MS
  ) {
    return cachedAvailableModels;
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(
        apiKey
      )}`
    );
    if (!res.ok) {
      return cachedAvailableModels ?? [];
    }

    const data = (await res.json()) as any;
    const models = Array.isArray(data?.models) ? data.models : [];
    const normalized = models
      .map((m: any) => (typeof m?.name === 'string' ? m.name : ''))
      .filter(Boolean)
      .map((name: string) => name.replace(/^models\//, '').trim())
      .filter((name: string) => name.length > 0)
      // Avoid clearly non-text models when auto-expanding candidates.
      .filter((name: string) => {
        const n = name.toLowerCase();
        return !n.includes('tts') && !n.includes('audio') && !n.includes('image');
      });

    cachedAvailableModels = normalized;
    cachedAvailableModelsAt = now;
    return normalized;
  } catch {
    return cachedAvailableModels ?? [];
  }
};

const isRetryableOverloadError = (error: unknown) => {
  const anyErr = error as any;
  const status = getErrorStatusCode(error);
  const message = typeof anyErr?.message === 'string' ? anyErr.message : '';

  // Explicit broad matching (SDK error shapes vary)
  const is503or429 =
    anyErr?.status === 503 ||
    anyErr?.status === 429 ||
    anyErr?.statusCode === 503 ||
    anyErr?.statusCode === 429 ||
    anyErr?.httpStatus === 503 ||
    anyErr?.httpStatus === 429 ||
    status === 503 ||
    status === 429 ||
    (typeof message === 'string' &&
      (message.includes('503') ||
        message.includes('429') ||
        message.includes('Service Unavailable') ||
        message.includes('Too Many Requests') ||
        message.toLowerCase().includes('high demand')));

  return is503or429;
};

const isModelNotFoundOrUnsupportedError = (error: unknown) => {
  const anyErr = error as any;
  const status = getErrorStatusCode(error);
  const message = typeof anyErr?.message === 'string' ? anyErr.message : '';
  return (
    status === 404 ||
    anyErr?.status === 404 ||
    anyErr?.statusCode === 404 ||
    anyErr?.httpStatus === 404 ||
    (typeof message === 'string' &&
      (message.includes('404') ||
        message.toLowerCase().includes('not found') ||
        message.toLowerCase().includes('is not found for api version') ||
        message.toLowerCase().includes('not supported for generatecontent') ||
        message.toLowerCase().includes('supported methods')))
  );
};

const isUnsupportedResponseModalityError = (error: unknown) => {
  const anyErr = error as any;
  const message = typeof anyErr?.message === 'string' ? anyErr.message : '';
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes('response modalities') ||
    (m.includes('not supported') && (m.includes('modality') || m.includes('modalities')))
  );
};

const getModelChain = () => {
  const primaryFromEnv = (process.env.VITE_GEMINI_MODEL || '').trim();
  const chain = [primaryFromEnv, DEFAULT_MODEL, ...FALLBACK_MODELS].filter(
    (m, idx, arr) => m && arr.indexOf(m) === idx
  );
  return chain;
};

const expandModelAliases = (modelName: string) => {
  // Google occasionally changes canonical model IDs; keep lightweight aliases.
  // We always try the original first, then common alternates.
  const aliases: string[] = [modelName];

  if (modelName === 'gemini-2.5-flash') {
    aliases.push('gemini-2.5-flash-preview-05-20');
  }

  if (modelName === 'gemini-1.5-flash') {
    aliases.push('gemini-1.5-flash-latest');
  }

  if (modelName === 'gemini-1.5-pro') {
    aliases.push('gemini-1.5-pro-latest');
  }

  return aliases.filter((m, idx, arr) => m && arr.indexOf(m) === idx);
};

/**
 * Calls Gemini using a model fallback chain.
 *
 * - Tries models in order: (env override if set) → 1.5-flash → 1.5-pro → 2.5-flash
 * - Retries up to 2 times (1s, then 2s) for 503/429 per model
 * - Moves to next model on 503/429 after retries
 * - Throws a user-safe error message if all models fail
 */
export async function callGeminiWithFallback(
  prompt: string,
  options: CallGeminiOptions = {}
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('API key not configured on server.');
  }

  const availableModels = await listAvailableModels(apiKey);
  const modelChain = getModelChain();
  const genAI = new GoogleGenerativeAI(apiKey);

  let lastErr: unknown;

  for (const configuredModelName of modelChain) {
    const expandedModels = [
      ...expandModelAliases(configuredModelName),
      ...availableModels.filter(
        (m) =>
          m === configuredModelName ||
          m.startsWith(`${configuredModelName}-`) ||
          m.startsWith(`${configuredModelName}.`)
      ),
    ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

    for (const modelName of expandedModels) {
      for (let attempt = 0; attempt < 3; attempt++) {
        console.log(
          `[Gemini] trying model: ${modelName}, attempt: ${attempt + 1}`
        );
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: options.responseMimeType
            ? { responseMimeType: options.responseMimeType }
            : undefined,
        });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.info(`[Gemini] model used: ${modelName}`);
        return text;
      } catch (error) {
        lastErr = error;
        const isRetryable = isRetryableOverloadError(error);
        const shouldRetry = isRetryable && attempt < 2;

        if (isModelNotFoundOrUnsupportedError(error)) {
          // Model ID not available for this API/key/version -> try next model immediately.
          break;
        }

        if (isUnsupportedResponseModalityError(error)) {
          // Model exists but doesn't support TEXT generateContent; skip it.
          break;
        }

        if (shouldRetry) {
          await sleep(1000 * (attempt + 1));
          continue;
        }

        if (!isRetryable) {
          // Config/auth or other hard failures should fail fast.
          throw error instanceof Error ? error : new Error(String(error));
        }

        // exhausted retries for this model -> move to next model
        break;
      }
    }
    }
  }

  // All models exhausted (retryable overload conditions).
  console.warn('[Gemini] all fallback models exhausted', {
    lastErrorStatus: getErrorStatusCode(lastErr),
  });
  throw new Error(GEMINI_UNAVAILABLE_MESSAGE);
}

