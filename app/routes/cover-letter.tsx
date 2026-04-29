import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import ErrorState from '~/components/ErrorState';
import LoadingState from '~/components/LoadingState';
import Navbar from '~/components/Navbar';
import { normalizeAppErrorMessage } from '~/lib/errors';
import { usePuterStore } from '~/lib/puter';
import { generateUUID } from '~/lib/utils';

interface CoverLetterPayload {
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  background: string;
}

const COVER_LETTER_KEY = 'smartcv_cover_letters';

type CoverLetterHistoryItem = {
  id: string;
  jobTitle: string;
  company: string;
  content: string;
  createdAt: string;
};

const CoverLetterRoute = () => {
  const { auth, isLoading, ai, kv } = usePuterStore();
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [lastPayload, setLastPayload] = useState<CoverLetterPayload | null>(null);
  const [copyStatus, setCopyStatus] = useState('');
  const [history, setHistory] = useState<CoverLetterHistoryItem[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !auth.isAuthenticated) {
      navigate('/auth?next=/cover-letter');
    }
  }, [auth.isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const raw = await kv.get(COVER_LETTER_KEY);
        if (!raw) {
          setHistory([]);
          return;
        }
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) {
          setHistory([]);
          return;
        }
        const normalized: CoverLetterHistoryItem[] = (parsed as unknown[]).flatMap(
          (entry): CoverLetterHistoryItem[] => {
            if (!entry || typeof entry !== 'object') return [];
            const item = entry as Record<string, unknown>;
            const id = typeof item.id === 'string' ? item.id : '';
            const jobTitle = typeof item.jobTitle === 'string' ? item.jobTitle : '';
            const company = typeof item.company === 'string' ? item.company : '';
            const content = typeof item.content === 'string' ? item.content : '';
            const createdAt = typeof item.createdAt === 'string' ? item.createdAt : '';
            if (!id || !content) return [];
            return [{ id, jobTitle, company, content, createdAt }];
          }
        );
        setHistory(normalized);
      } catch {
        setHistory([]);
      }
    };

    if (!isLoading && auth.isAuthenticated) {
      loadHistory();
    }
  }, [auth.isAuthenticated, isLoading, kv]);

  const generateCoverLetter = async (payload: CoverLetterPayload) => {
    setIsGenerating(true);
    setError('');
    setCopyStatus('');
    try {
      const response = await fetch('/api/generate-cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: payload.jobTitle,
          companyName: payload.companyName,
          jobDescription: payload.jobDescription,
          background: payload.background,
        }),
      });

      if (!response.ok) {
        const responseBody = await response.json().catch(() => null);
        const errorMessage =
          responseBody && typeof responseBody.error === 'string'
            ? responseBody.error
            : `API error: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      const data = (await response.json()) as { content?: string };
      const generatedText = typeof data.content === 'string' ? data.content : '';
      if (!generatedText.trim()) {
        throw new Error('Cover letter generation returned an empty response.');
      }

      setCoverLetter(generatedText.trim());
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

  const saveToHistory = async () => {
    if (!lastPayload || !coverLetter.trim()) return;

    const nextItem: CoverLetterHistoryItem = {
      id: generateUUID(),
      jobTitle: lastPayload.jobTitle,
      company: lastPayload.companyName,
      content: coverLetter.trim(),
      createdAt: new Date().toISOString(),
    };

    const next = [nextItem, ...history].slice(0, 20);
    setHistory(next);
    await kv.set(COVER_LETTER_KEY, JSON.stringify(next));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload: CoverLetterPayload = {
      jobTitle: String(formData.get('job-title') || '').trim(),
      companyName: String(formData.get('company-name') || '').trim(),
      jobDescription: String(formData.get('job-description') || '').trim(),
      background: String(formData.get('background') || '').trim(),
    };
    if (!payload.jobTitle || !payload.companyName || !payload.jobDescription || !payload.background) {
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
    <main className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 min-h-screen">
      <Navbar />
      <section className="main-section">
        <div className="page-heading py-16">
          <h1>Cover Letter Generator</h1>
          <h2>Create a tailored cover letter for your next application</h2>
        </div>
        <div className="w-full max-w-4xl">
          <div className="gradient-border">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-8">
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
                  <label htmlFor="background">Your Background</label>
                  <textarea
                    id="background"
                    name="background"
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
                    {isGenerating ? 'Generating...' : 'Generate Cover Letter'}
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
            <div className="mt-8 bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-3">Generated Cover Letter</h3>
              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 p-5 shadow-inner">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-200 font-sans leading-relaxed">
                  {coverLetter}
                </pre>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  className="px-5 py-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium"
                  onClick={copyCoverLetter}
                >
                  Copy to Clipboard
                </button>
                <button
                  type="button"
                  className="px-5 py-2 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 font-medium hover:bg-gray-200 transition-colors"
                  onClick={saveToHistory}
                >
                  Save to History
                </button>
                {copyStatus && <span className="text-sm text-gray-600">{copyStatus}</span>}
              </div>
            </div>
          )}

          <details className="mt-6 bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm" open={historyOpen} onToggle={(e) => setHistoryOpen((e.currentTarget as HTMLDetailsElement).open)}>
            <summary className="cursor-pointer text-lg font-semibold text-gray-800 dark:text-gray-100">
              Previous Cover Letters
            </summary>
            <div className="mt-4 space-y-4">
              {history.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-300">No saved cover letters yet.</p>
              ) : (
                history.slice(0, 3).map((item) => (
                  <div key={item.id} className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                      {item.jobTitle} • {item.company}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}
                    </p>
                    <pre className="mt-3 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-200 font-sans leading-relaxed">
                      {item.content}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </details>
        </div>
      </section>
    </main>
  );
};

export default CoverLetterRoute;
