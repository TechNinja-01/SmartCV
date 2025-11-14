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
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const prompt = `
    Generate 10 interview questions for a ${experienceLevel} ${jobTitle} position.
    ${jobDescription ? `Job Description: ${jobDescription}` : ''}

    Return the questions as a JSON array with this structure:
    [
      {
        "question": "the interview question",
        "answer": "A concise, professional sample answer or key points to cover",
        "category": "Technical/Behavioral/Situational",
        "difficulty": "Easy/Medium/Hard"
      }
    ]

    IMPORTANT: Respond with ONLY the raw JSON array, starting with [ and ending with ].
    Do not include the word "json" or any other text before or after the array.
    Do not use Markdown formatting (no asterisks, bolding, or bullet points) inside the JSON strings.
  `;

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    try {
      const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedQuestions = JSON.parse(cleanText);
      
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