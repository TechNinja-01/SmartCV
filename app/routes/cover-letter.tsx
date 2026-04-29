import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import ErrorState from '~/components/ErrorState';
import LoadingState from '~/components/LoadingState';
import Navbar from '~/components/Navbar';
import { normalizeAppErrorMessage } from '~/lib/errors';
import { usePuterStore } from '~/lib/puter';

interface CoverLetterPayload {
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  personalSummary: string;
}

const COVER_LETTER_KEY = 'smartcv_cover_letters';

const CoverLetterRoute = () => {
  const { auth, isLoading, ai, kv } = usePuterStore();
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [lastPayload, setLastPayload] = useState<CoverLetterPayload | null>(null);
  const [copyStatus, setCopyStatus] = useState('');

  useEffect(() => {
    if (!isLoading && !auth.isAuthenticated) {
      navigate('/auth?next=/cover-letter');
    }
  }, [auth.isAuthenticated, isLoading, navigate]);

  const generateCoverLetter = async (payload: CoverLetterPayload) => {
    setIsGenerating(true);
    setError('');
    setCopyStatus('');
    try {
      const prompt = `Write a professional cover letter around 300 words.
Job Title: ${payload.jobTitle}
Company Name: ${payload.companyName}
Job Description: ${payload.jobDescription}
Candidate Summary: ${payload.personalSummary}

Return plain text only.`;

      const response = await ai.chat(prompt, { model: 'gpt-4.1-nano' });
      const content = response?.message?.content;
      const generatedText =
        typeof content === 'string' ? content : content?.[0]?.text ?? '';
      if (!generatedText.trim()) {
        throw new Error('Cover letter generation returned an empty response.');
      }

      setCoverLetter(generatedText.trim());
      const existingRaw = await kv.get(COVER_LETTER_KEY);
      const existing = existingRaw ? (JSON.parse(existingRaw) as string[]) : [];
      const next = [generatedText.trim(), ...existing].slice(0, 10);
      await kv.set(COVER_LETTER_KEY, JSON.stringify(next));
    } catch (err) {
      setError(
        normalizeAppErrorMessage(err, {
          fallbackMessage: 'Failed to generate cover letter',
        })
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload: CoverLetterPayload = {
      jobTitle: String(formData.get('job-title') || '').trim(),
      companyName: String(formData.get('company-name') || '').trim(),
      jobDescription: String(formData.get('job-description') || '').trim(),
      personalSummary: String(formData.get('personal-summary') || '').trim(),
    };
    if (!payload.jobTitle || !payload.companyName || !payload.jobDescription || !payload.personalSummary) {
      setError('Please fill in all fields.');
      return;
    }
    setLastPayload(payload);
    generateCoverLetter(payload);
  };

  const copyCoverLetter = async () => {
    if (!coverLetter) return;
    try {
      await navigator.clipboard.writeText(coverLetter);
      setCopyStatus('Copied to clipboard.');
    } catch {
      setCopyStatus('Unable to copy. Please copy manually.');
    }
  };

  return (
    <main className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 min-h-screen">
      <Navbar />
      <section className="main-section">
        <div className="page-heading py-16">
          <h1>Cover Letter Generator</h1>
          <h2>Create a tailored cover letter for your next application</h2>
        </div>
        <div className="w-full max-w-4xl">
          <div className="gradient-border">
            <div className="bg-white rounded-2xl p-8">
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="form-div">
                  <label htmlFor="job-title">Job Title</label>
                  <input id="job-title" name="job-title" placeholder="e.g., Frontend Engineer" />
                </div>
                <div className="form-div">
                  <label htmlFor="company-name">Company Name</label>
                  <input id="company-name" name="company-name" placeholder="e.g., Acme Corp" />
                </div>
                <div className="form-div">
                  <label htmlFor="job-description">Job Description</label>
                  <textarea id="job-description" name="job-description" rows={5} />
                </div>
                <div className="form-div">
                  <label htmlFor="personal-summary">Personal Summary</label>
                  <textarea
                    id="personal-summary"
                    name="personal-summary"
                    rows={4}
                    placeholder="2-3 sentences about your background and strengths"
                  />
                </div>
                {error && (
                  <ErrorState
                    message={error}
                    onRetry={lastPayload && !isGenerating ? () => generateCoverLetter(lastPayload) : undefined}
                  />
                )}
                <div className="flex gap-3">
                  <button className="primary-button" type="submit" disabled={isGenerating}>
                    {isGenerating ? 'Generating...' : 'Generate'}
                  </button>
                  {lastPayload && !isGenerating && (
                    <button
                      className="primary-button"
                      type="button"
                      style={{ background: 'linear-gradient(to bottom, #f59e0b, #d97706)' }}
                      onClick={() => generateCoverLetter(lastPayload)}
                    >
                      Regenerate
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
          {isGenerating && <LoadingState message="Generating cover letter..." imageAlt="Generating cover letter" />}
          {coverLetter && !isGenerating && (
            <div className="mt-8 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Generated Cover Letter</h3>
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">{coverLetter}</pre>
              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  className="px-5 py-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium"
                  onClick={copyCoverLetter}
                >
                  Copy to Clipboard
                </button>
                {copyStatus && <span className="text-sm text-gray-600">{copyStatus}</span>}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default CoverLetterRoute;
