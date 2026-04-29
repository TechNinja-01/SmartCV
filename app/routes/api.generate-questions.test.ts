import { beforeEach, describe, expect, it, vi } from 'vitest';

const generateContentMock = vi.fn();
const getGenerativeModelMock = vi.fn(() => ({
  generateContent: generateContentMock,
}));

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel = getGenerativeModelMock;
  },
}));

describe('api.generate-questions route action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-key';
    delete process.env.GOOGLE_API_KEY;
  });

  it('returns 405 for non-POST request', async () => {
    const { action } = await import('./api.generate-questions');
    const request = new Request('http://localhost/api/generate-questions', {
      method: 'GET',
    });

    const response = await action({ request, params: {}, context: {} } as any);
    expect(response.status).toBe(405);
  });

  it('returns 500 when no API key is configured', async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;

    const { action } = await import('./api.generate-questions');
    const request = new Request('http://localhost/api/generate-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobTitle: 'Frontend Engineer',
        experienceLevel: 'Mid-Level',
        jobDescription: '',
      }),
    });

    const response = await action({ request, params: {}, context: {} } as any);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toContain('API key not configured');
  });

  it('returns 400 when required fields are missing', async () => {
    const { action } = await import('./api.generate-questions');
    const request = new Request('http://localhost/api/generate-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobTitle: '',
        experienceLevel: 'Mid-Level',
      }),
    });

    const response = await action({ request, params: {}, context: {} } as any);
    expect(response.status).toBe(400);
  });

  it('returns parsed JSON array on success', async () => {
    generateContentMock.mockResolvedValue({
      response: {
        text: () =>
          JSON.stringify([
            {
              question: 'Tell me about a complex bug you fixed.',
              answer: 'I isolated the issue with logs and added tests.',
              category: 'Behavioral',
              difficulty: 'Medium',
            },
          ]),
      },
    });

    const { action } = await import('./api.generate-questions');
    const request = new Request('http://localhost/api/generate-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobTitle: 'Frontend Engineer',
        experienceLevel: 'Mid-Level',
        jobDescription: 'React role',
      }),
    });

    const response = await action({ request, params: {}, context: {} } as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body[0].category).toBe('Behavioral');
    expect(getGenerativeModelMock).toHaveBeenCalled();
  });

  it('returns 500 when AI response is invalid JSON', async () => {
    generateContentMock.mockResolvedValue({
      response: {
        text: () => 'not-json',
      },
    });

    const { action } = await import('./api.generate-questions');
    const request = new Request('http://localhost/api/generate-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobTitle: 'Frontend Engineer',
        experienceLevel: 'Mid-Level',
      }),
    });

    const response = await action({ request, params: {}, context: {} } as any);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toContain('invalid response');
  });
});
