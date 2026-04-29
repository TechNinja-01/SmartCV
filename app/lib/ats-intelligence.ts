export interface KeywordGapResult {
  foundKeywords: string[];
  missingKeywords: string[];
}

export interface RewriteSuggestionsResult {
  suggestions: string[];
}

export const buildKeywordGapPrompt = (jobDescription: string) => `
You are an ATS keyword analyst.
Analyze the attached resume and compare it against this job description:
${jobDescription}

Return only valid JSON with this shape:
{
  "foundKeywords": ["keyword1", "keyword2"],
  "missingKeywords": ["keywordA", "keywordB"]
}

Rules:
- Use concise keyword phrases.
- Include only unique values.
- Do not include markdown or code fences.
`;

const toUniqueStrings = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const normalized = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);

  return Array.from(new Set(normalized));
};

export const parseKeywordGapResult = (content: string): KeywordGapResult => {
  const raw = content.trim();
  const sanitized = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const parsed = JSON.parse(sanitized) as Partial<KeywordGapResult>;

  return {
    foundKeywords: toUniqueStrings(parsed.foundKeywords),
    missingKeywords: toUniqueStrings(parsed.missingKeywords),
  };
};

export const buildRewriteSuggestionsPrompt = (feedback: Feedback) => `
You are a resume writing coach.
Using the attached resume and this ATS feedback JSON:
${JSON.stringify(feedback)}

Return only valid JSON:
{
  "suggestions": [
    "Specific rewrite suggestion 1",
    "Specific rewrite suggestion 2"
  ]
}

Rules:
- Return 5 to 8 concise, actionable bullet-ready suggestions.
- Each suggestion should be specific enough to apply directly to resume content.
- No markdown, no code fences.
`;

export const parseRewriteSuggestionsResult = (
  content: string
): RewriteSuggestionsResult => {
  const raw = content.trim();
  const sanitized = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const parsed = JSON.parse(sanitized) as Partial<RewriteSuggestionsResult>;

  return {
    suggestions: toUniqueStrings(parsed.suggestions),
  };
};
