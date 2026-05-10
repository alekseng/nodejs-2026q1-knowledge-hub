export function buildTranslatePrompt(
  content: string,
  targetLanguage: string,
  sourceLanguage?: string,
): string {
  const sourcePart = sourceLanguage
    ? `from ${sourceLanguage}`
    : 'from its current language (detect automatically)';

  return `Translate the following article content ${sourcePart} to ${targetLanguage}.

Respond ONLY with a valid JSON object in this exact format (no markdown code blocks, no extra text):
{
  "translatedText": "the full translated content here",
  "detectedLanguage": "the detected or provided source language name in English"
}

Article Content:
${content}`;
}
