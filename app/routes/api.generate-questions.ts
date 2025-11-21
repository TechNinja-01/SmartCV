import { GoogleGenerativeAI } from '@google/generative-ai';

export async function loader() {
  return Response.json(
    { message: "This endpoint handles POST requests only." },
    { status: 405 } 
  );
}

export async function action({ request }: any) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_API_KEY) {
    return Response.json(
      { error: 'API key not configured on server.' },
      { status: 500 }
    );
  }

  const { jobTitle, experienceLevel, jobDescription } = await request.json();

  if (!jobTitle || !experienceLevel) {
    return Response.json(
      { error: 'Missing required fields' }, 
      { status: 400 }
    );
  }

  // Using the improved prompt from the new code
  const prompt = `
    Generate 10 interview questions for a ${experienceLevel} ${jobTitle} position.
    ${jobDescription ? `Job Description: ${jobDescription}` : ''}

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
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    
    // Initialize model with JSON mode enabled (New Code functionality)
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash', // Ensure this model name is correct for your access level
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    // Use the cleaner 'text()' method (Old Code style) 
    // This works perfectly with JSON mode
    const text = response.text(); 

    // Parse JSON safely without needing regex replacement
    try {
      const parsedQuestions = JSON.parse(text);
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
    return Response.json(
      { error: err.message || 'Failed to generate questions' },
      { status: 500 }
    );
  }
}