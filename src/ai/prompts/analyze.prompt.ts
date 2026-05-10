const TASK_DESCRIPTION: Record<
  'review' | 'bugs' | 'optimize' | 'explain',
  string
> = {
  review:
    'Perform a general content review. Evaluate writing quality, structure, clarity, and accuracy.',
  bugs: 'Identify factual errors, logical inconsistencies, or technical inaccuracies.',
  optimize:
    'Suggest concrete improvements for clarity, conciseness, and overall quality.',
  explain:
    'Provide a detailed explanation of the main concepts assuming the reader is a beginner.',
};

export function buildAnalyzePrompt(
  title: string,
  content: string,
  task: 'review' | 'bugs' | 'optimize' | 'explain',
): string {
  return `${TASK_DESCRIPTION[task]}

Respond ONLY with a valid JSON object in this exact format (no markdown code blocks, no extra text):
{
  "analysis": "your detailed analysis here",
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"],
  "severity": "info"
}

Use "info" severity for informational or minor findings, "warning" for moderate issues, and "error" for critical issues.

Article Title: ${title}

Article Content:
${content}`;
}
