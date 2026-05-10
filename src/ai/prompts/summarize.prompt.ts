const LENGTH_DESCRIPTION: Record<'short' | 'medium' | 'detailed', string> = {
  short: '1-2 sentences',
  medium: '1 short paragraph (3-5 sentences)',
  detailed: '2-3 paragraphs covering all key points',
};

export function buildSummarizePrompt(
  title: string,
  content: string,
  maxLength: 'short' | 'medium' | 'detailed',
): string {
  return `Summarize the following article in ${LENGTH_DESCRIPTION[maxLength]}.
Provide only the summary text with no additional commentary, labels, or formatting.

Article Title: ${title}

Article Content:
${content}`;
}
