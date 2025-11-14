import { useState, type FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router';
import Navbar from '~/components/Navbar';
import { usePuterStore } from '~/lib/puter';

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

const Interview = () => {
  const { auth, isLoading } = usePuterStore();
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && !auth.isAuthenticated) {
      navigate('/auth?next=/interview');
    }
  }, [isLoading, auth.isAuthenticated]);

  const generateQuestions = async ({
    jobTitle,
    experienceLevel,
    jobDescription,
  }: {
    jobTitle: string;
    experienceLevel: string;
    jobDescription: string;
  }) => {
    setIsGenerating(true);
    setError('');

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
        const errorText = await response.text();
        throw new Error(errorText || `API error: ${response.statusText}`);
      }

      const parsedQuestions = await response.json();
      setQuestions(parsedQuestions);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to generate questions'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const jobTitle = formData.get('job-title') as string;
    const experienceLevel = formData.get('experience-level') as string;
    const jobDescription = formData.get('job-description') as string;

    if (!jobTitle || !experienceLevel) {
      setError('Please fill in all required fields');
      return;
    }

    generateQuestions({ jobTitle, experienceLevel, jobDescription });
  };

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
    <main className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 min-h-screen">
      <Navbar />

      <section className="main-section">
        <div className="page-heading py-16">
          <h1>Interview Question Generator</h1>
          <h2>Prepare for your next interview with AI-powered questions</h2>
        </div>

        <div className="w-full max-w-4xl">
          <div className="gradient-border">
            <div className="bg-white rounded-2xl p-8">
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

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl">
                    {error}
                  </div>
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
            <div className="flex flex-col items-center justify-center mt-10 animate-in fade-in">
              <img src="/images/resume-scan-2.gif" className="w-[200px]" alt="Scanning..." />
              <p className="text-xl text-gray-600 mt-4">
                Generating interview questions...
              </p>
            </div>
          )}

          {questions.length > 0 && !isGenerating && (
            <div className="mt-10 space-y-6 animate-in fade-in duration-1000">
              <h3 className="text-2xl font-semibold text-gray-800">
                Your Interview Questions
              </h3>

              <div className="space-y-4">
                {questions.map((q, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-lg text-gray-800 mb-3 font-medium">
                          {q.question}
                        </p>

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
                            <div className="mt-3 text-gray-600 text-sm leading-relaxed bg-blue-50/50 p-4 rounded-xl border border-blue-100 animate-in fade-in slide-in-from-top-2 duration-200">
                              {q.answer}
                            </div>
                          </details>
                        )}
                        {/* ----------------------------- */}

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
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default Interview;