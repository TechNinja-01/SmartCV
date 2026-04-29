import type { ActionFunctionArgs } from 'react-router';
import { callGeminiWithFallback, GEMINI_UNAVAILABLE_MESSAGE } from '~/lib/gemini';

export async function loader() {
  return Response.json(
    { message: "This endpoint handles POST requests only." },
    { status: 405 } 
  );
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return Response.json(
      { error: 'Method not allowed' },
      { status: 405 }
    );
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!GEMINI_API_KEY) {
    return Response.json({ error: 'API key not configured on server.' }, { status: 500 });
  }

  const { jobTitle, experienceLevel, jobDescription } = await request.json();
  const normalizedJobTitle = (jobTitle || '').trim();
  const normalizedExperienceLevel = (experienceLevel || '').trim();
  const normalizedJobDescription = (jobDescription || '').trim();

  if (!normalizedJobTitle || !normalizedExperienceLevel) {
    return Response.json(
      { error: 'Missing required fields' }, 
      { status: 400 }
    );
  }

  // Using the improved prompt from the new code
  const prompt = `
    Generate 10 interview questions for a ${normalizedExperienceLevel} ${normalizedJobTitle} position.
    ${normalizedJobDescription ? `Job Description: ${normalizedJobDescription}` : ''}

    Return the questions strictly as a JSON array with this structure:
    [
      {
        "question": "the interview question",
        "answer": "A concise professional sample answer",
        "category": "Technical/Behavioral/Situational",
        "difficulty": "Easy/Medium/Hard"
      }
    ]

    IMPORTANT RULES:
    • Respond with ONLY the JSON array.
    • No markdown, no code fences.
  `;

  try {
    const text = await callGeminiWithFallback(prompt, {
      responseMimeType: 'application/json',
    });

    // Parse JSON safely without needing regex replacement
    try {
      const parsedQuestions = JSON.parse(text);
      if (!Array.isArray(parsedQuestions)) {
        throw new Error('AI returned an invalid payload shape.');
      }
      return Response.json(parsedQuestions);
    } catch (parseError) {
      console.error('Gemini API returned invalid JSON:', text);
      return Response.json(
        { error: 'AI returned an invalid response. Please try again.' },
        { status: 500 }
      );
    }
  } catch (err: any) {
    console.error('Gemini API Error:', err);
    const message = typeof err?.message === 'string' ? err.message : '';
    if (message === GEMINI_UNAVAILABLE_MESSAGE) {
      return Response.json(
        { error: GEMINI_UNAVAILABLE_MESSAGE, code: 'GEMINI_UNAVAILABLE' },
        { status: 503 }
      );
    }
    return Response.json(
      { error: err.message || 'Failed to generate questions' },
      { status: 500 }
    );
  }
}