import { useState, type FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router';
import ErrorState from '~/components/ErrorState';
import LoadingState from '~/components/LoadingState';
import {
  API_SETUP_DOCS_PATH,
  isApiKeyMissingError,
  normalizeAppErrorMessage,
} from '~/lib/errors';
import Navbar from '~/components/Navbar';
import { usePuterStore } from '~/lib/puter';
import {
  hasRequiredInterviewFields,
  normalizeInterviewPayload,
} from '~/lib/interview';

export const meta = () => [
  { title: 'SmartCV | Interview Questions' },
  { name: 'description', content: 'Generate interview questions for your job' },
];

interface Question {
  question: string;
  answer: string; 
  category: string;
  difficulty: string;
}

interface InterviewPayload {
  jobTitle: string;
  experienceLevel: string;
  jobDescription: string;
}

const Interview = () => {
  const { auth, isLoading, ai, kv } = usePuterStore();
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [errorState, setErrorState] = useState<{
    title?: string;
    message: string;
    retryLabel?: string;
  } | null>(null);
  const [lastPayload, setLastPayload] = useState<InterviewPayload | null>(null);
  const [mode, setMode] = useState<'browse' | 'mock'>('browse');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [mockAnswer, setMockAnswer] = useState('');
  const [mockSummaryVisible, setMockSummaryVisible] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationError, setEvaluationError] = useState('');
  const [lastEvaluationPayload, setLastEvaluationPayload] = useState<{
    question: string;
    answer: string;
  } | null>(null);
  const [mockEvaluations, setMockEvaluations] = useState<
    Record<number, MockEvaluation>
  >({});
  const [starHints, setStarHints] = useState<Record<number, StarHint>>({});
  const [starHintOpen, setStarHintOpen] = useState<Record<number, boolean>>({});
  const [starHintLoading, setStarHintLoading] = useState<Record<number, boolean>>(
    {}
  );
  const [starHintError, setStarHintError] = useState<Record<number, string>>({});
  const [savedQuestions, setSavedQuestions] = useState<SavedQuestion[]>([]);
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('All');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('All');

  useEffect(() => {
    if (!isLoading && !auth.isAuthenticated) {
      navigate('/auth?next=/interview');
    }
  }, [isLoading, auth.isAuthenticated, navigate]);

  useEffect(() => {
    const loadSavedQuestions = async () => {
      try {
        // Puter KV key: smartcv_saved_questions (Interview bookmarks + notes persistence)
        const raw = await kv.get(SAVED_QUESTIONS_KEY);
        if (!raw) {
          setSavedQuestions([]);
          return;
        }
        const parsed = JSON.parse(raw) as SavedQuestion[];
        setSavedQuestions(Array.isArray(parsed) ? parsed : []);
      } catch {
        setSavedQuestions([]);
      }
    };

    if (!isLoading && auth.isAuthenticated) {
      loadSavedQuestions();
    }
  }, [auth.isAuthenticated, isLoading, kv]);

  const generateQuestions = async ({
    jobTitle,
    experienceLevel,
    jobDescription,
  }: InterviewPayload) => {
    setIsGenerating(true);
    setErrorState(null);

    try {
      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobTitle,
          experienceLevel,
          jobDescription,
        }),
      });

      if (!response.ok) {
        const responseBody = await response.json().catch(() => null);
        const apiErrorMessage =
          responseBody && typeof responseBody.error === 'string'
            ? responseBody.error
            : `API error: ${response.statusText}`;
        const apiErrorCode =
          responseBody && typeof responseBody.code === 'string'
            ? responseBody.code
            : '';

        if (response.status === 503 || apiErrorCode === 'GEMINI_UNAVAILABLE') {
          throw Object.assign(new Error('GEMINI_UNAVAILABLE'), {
            code: 'GEMINI_UNAVAILABLE',
          });
        }

        throw new Error(apiErrorMessage);
      }

      const parsedQuestions = await response.json();
      setQuestions(parsedQuestions);
      setDifficultyFilter('All');
      setTypeFilter('All');
    } catch (err) {
      const anyErr = err as any;
      const isGeminiUnavailable =
        anyErr?.code === 'GEMINI_UNAVAILABLE' ||
        (typeof anyErr?.message === 'string' &&
          anyErr.message.includes('GEMINI_UNAVAILABLE'));

      if (isGeminiUnavailable) {
        setErrorState({
          title: 'AI Service Temporarily Unavailable',
          message:
            'Gemini is experiencing high demand right now. Your data is safe — please wait 1–2 minutes and try again.',
          retryLabel: 'Try Again',
        });
        return;
      }

      setErrorState({
        message: normalizeAppErrorMessage(err, {
          fallbackMessage: 'Failed to generate questions',
        }),
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const normalizedPayload = normalizeInterviewPayload({
      jobTitle: formData.get('job-title') as string,
      experienceLevel: formData.get('experience-level') as string,
      jobDescription: formData.get('job-description') as string,
    });

    if (!hasRequiredInterviewFields(normalizedPayload)) {
      setError('Please fill in all required fields');
      return;
    }

    setLastPayload(normalizedPayload);
    setMode('browse');
    setCurrentQuestionIndex(0);
    setMockAnswer('');
    setMockSummaryVisible(false);
    setEvaluationError('');
    setMockEvaluations({});
    generateQuestions(normalizedPayload);
  };

  const parseJsonResponse = <T,>(input: string): T => {
    const sanitized = input
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '');
    return JSON.parse(sanitized) as T;
  };

  const evaluateMockAnswer = async (questionText: string, answerText: string) => {
    const payload = { question: questionText, answer: answerText };
    setLastEvaluationPayload(payload);
    setIsEvaluating(true);
    setEvaluationError('');
    try {
      const prompt = `You are an interview coach. Evaluate this answer to the interview question.
Question: ${questionText}
Candidate Answer: ${answerText}
Return JSON with exactly these fields:
{ score: number (1-10), strengths: string[], improvements: string[] }`;

      const response = await ai.chat(prompt, { model: 'gpt-4.1-nano' });
      const content = response?.message?.content;
      const responseText =
        typeof content === 'string' ? content : content?.[0]?.text ?? '';
      if (!responseText) {
        throw new Error('Evaluation returned an empty response.');
      }

      const parsed = parseJsonResponse<MockEvaluation>(responseText);
      const normalizedEvaluation: MockEvaluation = {
        score:
          typeof parsed.score === 'number'
            ? Math.max(1, Math.min(10, Math.round(parsed.score)))
            : 1,
        strengths: Array.isArray(parsed.strengths)
          ? parsed.strengths.filter(
              (item): item is string => typeof item === 'string' && item.trim().length > 0
            )
          : [],
        improvements: Array.isArray(parsed.improvements)
          ? parsed.improvements.filter(
              (item): item is string => typeof item === 'string' && item.trim().length > 0
            )
          : [],
      };

      setMockEvaluations((prev) => ({
        ...prev,
        [currentQuestionIndex]: normalizedEvaluation,
      }));
    } catch (err) {
      setEvaluationError(
        normalizeAppErrorMessage(err, {
          fallbackMessage: 'Failed to evaluate your answer',
        })
      );
    } finally {
      setIsEvaluating(false);
    }
  };

  const getScoreBadgeClass = (score: number) => {
    if (score >= 8) return 'bg-emerald-100 text-emerald-800';
    if (score >= 5) return 'bg-amber-100 text-amber-800';
    return 'bg-rose-100 text-rose-800';
  };

  const fetchStarHint = async (questionIndex: number, questionText: string) => {
    setStarHintLoading((prev) => ({ ...prev, [questionIndex]: true }));
    setStarHintError((prev) => ({ ...prev, [questionIndex]: '' }));
    try {
      const prompt = `For this interview question, give a brief STAR method outline (2 sentences max per section).
Question: ${questionText}
Return JSON: { situation: string, task: string, action: string, result: string }`;

      const response = await ai.chat(prompt, { model: 'gpt-4.1-nano' });
      const content = response?.message?.content;
      const responseText =
        typeof content === 'string' ? content : content?.[0]?.text ?? '';
      if (!responseText) {
        throw new Error('STAR hint returned an empty response.');
      }

      const parsed = parseJsonResponse<StarHint>(responseText);
      const normalized: StarHint = {
        situation: typeof parsed.situation === 'string' ? parsed.situation : '',
        task: typeof parsed.task === 'string' ? parsed.task : '',
        action: typeof parsed.action === 'string' ? parsed.action : '',
        result: typeof parsed.result === 'string' ? parsed.result : '',
      };

      setStarHints((prev) => ({ ...prev, [questionIndex]: normalized }));
      setStarHintOpen((prev) => ({ ...prev, [questionIndex]: true }));
    } catch (err) {
      setStarHintError((prev) => ({
        ...prev,
        [questionIndex]: normalizeAppErrorMessage(err, {
          fallbackMessage: 'Failed to load hint.',
        }),
      }));
    } finally {
      setStarHintLoading((prev) => ({ ...prev, [questionIndex]: false }));
    }
  };

  const exitMockMode = () => {
    setMode('browse');
    setCurrentQuestionIndex(0);
    setMockAnswer('');
    setMockSummaryVisible(false);
    setEvaluationError('');
    setLastEvaluationPayload(null);
    setMockEvaluations({});
  };

  const persistSavedQuestions = async (nextItems: SavedQuestion[]) => {
    // Puter KV key: smartcv_saved_questions (Interview bookmarks + notes persistence)
    await kv.set(SAVED_QUESTIONS_KEY, JSON.stringify(nextItems));
  };

  const buildSavedQuestionFromQuestion = (question: Question, index: number): SavedQuestion => ({
    id: `${index}-${question.question.slice(0, 40)}`,
    question: question.question,
    category: question.category,
    difficulty: question.difficulty,
    note: '',
    savedAt: new Date().toISOString(),
  });

  const isQuestionSaved = (question: Question, index: number) =>
    savedQuestions.some(
      (item) =>
        item.id === `${index}-${question.question.slice(0, 40)}` ||
        item.question === question.question
    );

  const toggleSaveQuestion = async (question: Question, index: number) => {
    const candidate = buildSavedQuestionFromQuestion(question, index);
    const existing = savedQuestions.find(
      (item) => item.id === candidate.id || item.question === candidate.question
    );

    const nextItems = existing
      ? savedQuestions.filter((item) => item.id !== existing.id)
      : [candidate, ...savedQuestions];

    setSavedQuestions(nextItems);
    await persistSavedQuestions(nextItems);
  };

  const updateSavedQuestionNote = async (id: string, note: string) => {
    const nextItems = savedQuestions.map((item) =>
      item.id === id ? { ...item, note } : item
    );
    setSavedQuestions(nextItems);
    await persistSavedQuestions(nextItems);
  };

  const removeSavedQuestion = async (id: string) => {
    const nextItems = savedQuestions.filter((item) => item.id !== id);
    setSavedQuestions(nextItems);
    await persistSavedQuestions(nextItems);
  };

  const filteredQuestions = questions.filter((q) => {
    const difficultyMatches =
      difficultyFilter === 'All' || q.difficulty === difficultyFilter;
    const typeMatches = typeFilter === 'All' || q.category === typeFilter;
    return difficultyMatches && typeMatches;
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Technical':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Behavioral':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'Situational':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'bg-emerald-50 text-emerald-700';
      case 'Medium':
        return 'bg-amber-50 text-amber-700';
      case 'Hard':
        return 'bg-rose-50 text-rose-700';
      default:
        return 'bg-gray-50 text-gray-700';
    }
  };

  return (
    <main className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 min-h-screen">
      <Navbar />

      <section className="main-section">
        <div className="page-heading py-16">
          <h1>Interview Question Generator</h1>
          <h2>Prepare for your next interview with AI-powered questions</h2>
        </div>

        <div className="w-full max-w-4xl">
          <div className="gradient-border">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-8">
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="form-div">
                  <label htmlFor="job-title">Job Title *</label>
                  <input
                    type="text"
                    name="job-title"
                    placeholder="e.g., Frontend Developer"
                    id="job-title"
                    required
                  />
                </div>

                <div className="form-div">
                  <label htmlFor="experience-level">Experience Level *</label>
                  <select
                    name="experience-level"
                    id="experience-level"
                    className="w-full p-4 inset-shadow rounded-2xl focus:outline-none bg-white"
                    required
                  >
                    <option value="">Select experience level</option>
                    <option value="Entry Level">Entry Level</option>
                    <option value="Junior">Junior</option>
                    <option value="Mid-Level">Mid-Level</option>
                    <option value="Senior">Senior</option>
                    <option value="Lead">Lead</option>
                  </select>
                </div>

                <div className="form-div">
                  <label htmlFor="job-description">
                    Job Description (Optional)
                  </label>
                  <textarea
                    rows={4}
                    name="job-description"
                    placeholder="Paste the job description for more tailored questions..."
                    id="job-description"
                  />
                </div>

                {errorState && (
                  <ErrorState
                    title={errorState.title}
                    message={errorState.message}
                    onRetry={
                      lastPayload && !isGenerating
                        ? () => generateQuestions(lastPayload)
                        : undefined
                    }
                    retryLabel={errorState.retryLabel}
                    docsHref={
                      isApiKeyMissingError(errorState.message)
                        ? API_SETUP_DOCS_PATH
                        : undefined
                    }
                  />
                )}

                <div className="flex gap-4">
                  <button
                    className="primary-button"
                    type="submit"
                    disabled={isGenerating}
                  >
                    {isGenerating
                      ? 'Generating Questions...'
                      : 'Generate Questions'}
                  </button>

                  {questions.length > 0 && !isGenerating && (
                    <button
                      className="primary-button"
                      type="submit"
                      style={{
                        background:
                          'linear-gradient(to bottom, #f59e0b, #d97706)',
                      }}
                    >
                      Regenerate
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {isGenerating && (
            <LoadingState
              message="Generating interview questions..."
              imageAlt="Generating interview questions"
            />
          )}

          {questions.length > 0 && !isGenerating && (
            <div className="mt-10 space-y-6 animate-in fade-in duration-1000">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
                  Interview Questions ({mode === 'browse' ? filteredQuestions.length : questions.length} shown)
                </h3>
                <div className="flex gap-2 rounded-full border border-gray-200 bg-white p-1">
                  <button
                    type="button"
                    onClick={() => setMode('browse')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      mode === 'browse'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Browse Mode
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('mock');
                      setMockSummaryVisible(false);
                    }}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      mode === 'mock'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Mock Interview Mode
                  </button>
                </div>
              </div>

              {mode === 'browse' ? (
                <>
                  <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-2">Difficulty</p>
                      <div className="flex flex-wrap gap-2">
                        {(['All', 'Easy', 'Medium', 'Hard'] as DifficultyFilter[]).map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setDifficultyFilter(option)}
                            className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                              difficultyFilter === option
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-2">Type</p>
                      <div className="flex flex-wrap gap-2">
                        {(
                          ['All', 'Behavioral', 'Technical', 'Situational', 'Leadership'] as TypeFilter[]
                        ).map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setTypeFilter(option)}
                            className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                              typeFilter === option
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {filteredQuestions.length === 0 && (
                      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-300">
                        No questions match the selected filters
                      </div>
                    )}
                    {filteredQuestions.map((q) => {
                      const questionIndex = questions.findIndex(
                        (item) =>
                          item.question === q.question &&
                          item.category === q.category &&
                          item.difficulty === q.difficulty
                      );

                      return (
                    <div
                      key={`${q.question}-${q.category}-${q.difficulty}`}
                      className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {questionIndex + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-3">
                          <p className="text-lg text-gray-800 dark:text-gray-100 mb-3 font-medium">
                            {q.question}
                          </p>
                            <button
                              type="button"
                              className="text-xl leading-none"
                              title={isQuestionSaved(q, questionIndex) ? 'Remove bookmark' : 'Save question'}
                              onClick={() => toggleSaveQuestion(q, questionIndex)}
                            >
                              {isQuestionSaved(q, questionIndex) ? '★' : '☆'}
                            </button>
                          </div>

                          {q.answer && (
                            <details className="group mb-4">
                              <summary className="flex items-center gap-2 cursor-pointer text-sm text-blue-600 font-medium select-none group-open:text-blue-800 transition-colors w-fit">
                                <span>View Sample Answer</span>
                                <svg
                                  className="w-4 h-4 transition-transform group-open:rotate-180"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M19 9l-7 7-7-7"
                                  ></path>
                                </svg>
                              </summary>
                              <div className="mt-3 text-gray-600 dark:text-gray-300 text-sm leading-relaxed bg-blue-50/50 dark:bg-gray-800 p-4 rounded-xl border border-blue-100 dark:border-gray-700 animate-in fade-in slide-in-from-top-2 duration-200">
                                {q.answer}
                              </div>
                            </details>
                          )}

                          <div className="flex gap-2">
                            <span
                              className={`px-3 py-1 rounded-full text-sm font-medium border ${getCategoryColor(
                                q.category
                              )}`}
                            >
                              {q.category}
                            </span>
                            <span
                              className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(
                                q.difficulty
                              )}`}
                            >
                              {q.difficulty}
                            </span>
                          </div>

                          <div className="mt-4">
                            <button
                              type="button"
                              className="text-sm font-medium text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-2"
                              onClick={() => {
                                if (starHints[index]) {
                                  setStarHintOpen((prev) => ({
                                    ...prev,
                                    [questionIndex]: !prev[questionIndex],
                                  }));
                                  return;
                                }
                                fetchStarHint(questionIndex, q.question);
                              }}
                            >
                              {starHintLoading[questionIndex] && (
                                <span className="w-3 h-3 rounded-full border-2 border-indigo-300 border-t-indigo-700 animate-spin" />
                              )}
                              {starHintOpen[questionIndex] ? 'Hide STAR Hint' : 'Show STAR Hint'}
                            </button>

                            {starHintError[questionIndex] && !starHintLoading[questionIndex] && (
                              <p className="mt-2 text-sm text-rose-600">
                                Failed to load hint.{' '}
                                <button
                                  type="button"
                                  className="underline"
                                  onClick={() => fetchStarHint(questionIndex, q.question)}
                                >
                                  Retry?
                                </button>
                              </p>
                            )}

                            {starHintOpen[questionIndex] && starHints[questionIndex] && (
                              <div className="mt-3 p-4 rounded-xl border border-indigo-100 bg-indigo-50/50 space-y-2 text-sm text-gray-700">
                                <p><span className="font-semibold text-indigo-700">Situation:</span> {starHints[questionIndex].situation}</p>
                                <p><span className="font-semibold text-indigo-700">Task:</span> {starHints[questionIndex].task}</p>
                                <p><span className="font-semibold text-indigo-700">Action:</span> {starHints[questionIndex].action}</p>
                                <p><span className="font-semibold text-indigo-700">Result:</span> {starHints[questionIndex].result}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    );
                    })}
                  </div>
                  <details className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                  <summary className="cursor-pointer text-lg font-semibold text-gray-800 dark:text-gray-100">
                    Saved Questions
                  </summary>
                  <div className="mt-4 space-y-4">
                    {savedQuestions.length === 0 ? (
                      <p className="text-gray-600 dark:text-gray-300">
                        Bookmark questions above to build your practice list
                      </p>
                    ) : (
                      savedQuestions.map((saved) => (
                        <div
                          key={saved.id}
                          className="rounded-xl border border-gray-200 p-4 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-gray-800 font-medium">{saved.question}</p>
                            <button
                              type="button"
                              className="text-sm px-3 py-1 rounded-full bg-rose-100 text-rose-700 hover:bg-rose-200 transition-colors"
                              onClick={() => removeSavedQuestion(saved.id)}
                            >
                              Remove
                            </button>
                          </div>
                          <div className="flex gap-2">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium border ${getCategoryColor(
                                saved.category
                              )}`}
                            >
                              {saved.category}
                            </span>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(
                                saved.difficulty
                              )}`}
                            >
                              {saved.difficulty}
                            </span>
                          </div>
                          <div className="form-div">
                            <label htmlFor={`note-${saved.id}`}>Your Notes</label>
                            <textarea
                              id={`note-${saved.id}`}
                              rows={3}
                              defaultValue={saved.note}
                              placeholder="Add your personal notes..."
                              onBlur={(e) => updateSavedQuestionNote(saved.id, e.target.value)}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  </details>
                </>
              ) : (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-600">
                      Question {currentQuestionIndex + 1} of {questions.length}
                    </p>
                    <button
                      type="button"
                      className="px-4 py-2 rounded-full text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                      onClick={exitMockMode}
                    >
                      Exit Mock Mode
                    </button>
                  </div>

                  {mockSummaryVisible ? (
                    <div className="space-y-4">
                      <h4 className="text-xl font-semibold text-gray-800">Mock Interview Summary</h4>
                      <p className="text-gray-600">
                        Average Score:{' '}
                        <span className="font-semibold text-gray-800">
                          {Object.keys(mockEvaluations).length > 0
                            ? (
                                Object.values(mockEvaluations).reduce(
                                  (acc, item) => acc + item.score,
                                  0
                                ) / Object.values(mockEvaluations).length
                              ).toFixed(1)
                            : 'N/A'}
                        </span>
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-lg text-gray-800 font-medium">
                        {questions[currentQuestionIndex]?.question}
                      </p>

                      <div className="form-div">
                        <label htmlFor="mock-answer">Your Answer</label>
                        <textarea
                          id="mock-answer"
                          rows={4}
                          value={mockAnswer}
                          onChange={(e) => setMockAnswer(e.target.value)}
                          placeholder="Write your interview answer here..."
                        />
                      </div>

                      {!mockEvaluations[currentQuestionIndex] && !isEvaluating && (
                        <button
                          type="button"
                          className="primary-button"
                          onClick={() =>
                            evaluateMockAnswer(
                              questions[currentQuestionIndex].question,
                              mockAnswer.trim()
                            )
                          }
                          disabled={!mockAnswer.trim()}
                        >
                          Submit Answer
                        </button>
                      )}

                      {isEvaluating && (
                        <LoadingState
                          variant="inline"
                          message="Evaluating your answer..."
                          imageAlt="Evaluating answer"
                        />
                      )}

                      {evaluationError && (
                        <ErrorState
                          message={evaluationError}
                          onRetry={
                            lastEvaluationPayload
                              ? () =>
                                  evaluateMockAnswer(
                                    lastEvaluationPayload.question,
                                    lastEvaluationPayload.answer
                                  )
                              : undefined
                          }
                        />
                      )}

                      {mockEvaluations[currentQuestionIndex] && (
                        <div className="space-y-4">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${getScoreBadgeClass(
                              mockEvaluations[currentQuestionIndex].score
                            )}`}
                          >
                            Score: {mockEvaluations[currentQuestionIndex].score}/10
                          </span>

                          <div>
                            <h5 className="font-semibold text-emerald-700 mb-1">What you did well</h5>
                            <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                              {mockEvaluations[currentQuestionIndex].strengths.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <h5 className="font-semibold text-amber-700 mb-1">What to improve</h5>
                            <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                              {mockEvaluations[currentQuestionIndex].improvements.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          </div>

                          {currentQuestionIndex < questions.length - 1 ? (
                            <button
                              type="button"
                              className="primary-button"
                              onClick={() => {
                                setCurrentQuestionIndex((prev) => prev + 1);
                                setMockAnswer('');
                                setEvaluationError('');
                                setLastEvaluationPayload(null);
                              }}
                            >
                              Next Question
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="primary-button"
                              onClick={() => setMockSummaryVisible(true)}
                            >
                              View Summary
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

interface MockEvaluation {
  score: number;
  strengths: string[];
  improvements: string[];
}

interface StarHint {
  situation: string;
  task: string;
  action: string;
  result: string;
}

interface SavedQuestion {
  id: string;
  question: string;
  category: string;
  difficulty: string;
  note: string;
  savedAt: string;
}

const SAVED_QUESTIONS_KEY = 'smartcv_saved_questions';
type DifficultyFilter = 'All' | 'Easy' | 'Medium' | 'Hard';
type TypeFilter = 'All' | 'Behavioral' | 'Technical' | 'Situational' | 'Leadership';

export default Interview;