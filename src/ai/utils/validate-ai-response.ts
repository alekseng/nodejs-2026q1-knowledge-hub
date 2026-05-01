export interface TranslateAiResponse {
  translatedText: string;
  detectedLanguage: string;
}

export interface AnalyzeAiResponse {
  analysis: string;
  suggestions: string[];
  severity: 'info' | 'warning' | 'error';
}

const VALID_SEVERITY = new Set<string>(['info', 'warning', 'error']);

export function validateTranslateResponse(
  parsed: unknown,
): TranslateAiResponse | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;
  if (typeof obj.translatedText !== 'string' || !obj.translatedText)
    return null;
  if (typeof obj.detectedLanguage !== 'string' || !obj.detectedLanguage)
    return null;
  return {
    translatedText: obj.translatedText,
    detectedLanguage: obj.detectedLanguage,
  };
}

export function validateAnalyzeResponse(
  parsed: unknown,
): AnalyzeAiResponse | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;
  if (typeof obj.analysis !== 'string' || !obj.analysis) return null;
  const suggestions = Array.isArray(obj.suggestions)
    ? obj.suggestions.filter((s): s is string => typeof s === 'string')
    : [];
  const severity = VALID_SEVERITY.has(obj.severity as string)
    ? (obj.severity as 'info' | 'warning' | 'error')
    : 'info';
  return { analysis: obj.analysis, suggestions, severity };
}
