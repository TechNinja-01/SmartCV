import type { ActionFunctionArgs } from 'react-router';
import { callGeminiWithFallback } from '~/lib/gemini';

export async function loader() {
  return Response.json(
    { message: 'This endpoint handles POST requests only.' },
    { status: 405 }
  );
}

type CoverLetterRequestBody = {
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  background: string;
};

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'API key not configured on server.' },
      { status: 500 }
    );
  }

  const body = (await request.json()) as Partial<CoverLetterRequestBody>;
  const jobTitle = (body.jobTitle || '').trim();
  const companyName = (body.companyName || '').trim();
  const jobDescription = (body.jobDescription || '').trim();
  const background = (body.background || '').trim();

  if (!jobTitle || !companyName || !jobDescription || !background) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const prompt = `Write a professional cover letter for a ${jobTitle} position at ${companyName}.
Job Description: ${jobDescription}
Candidate Background: ${background}

Requirements:
- 3 paragraphs, ~280 words
- professional but warm tone
- no generic filler phrases like "I am writing to express my interest"
- Return only the cover letter text, no subject line or metadata.`;

  try {
    const text = await callGeminiWithFallback(prompt);
    const cleaned = text.trim();
    if (!cleaned) {
      return Response.json(
        { error: 'Cover letter generation returned an empty response.' },
        { status: 500 }
      );
    }
    return Response.json({ content: cleaned });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate cover letter';
    return Response.json({ error: message }, { status: 500 });
  }
}

