import { useState, type FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router';
import ErrorState from '~/components/ErrorState';
import LoadingState from '~/components/LoadingState';
import {
  API_SETUP_DOCS_PATH,
  getApiKeyMissingMessage,
  isApiKeyMissingError,
  normalizeAppErrorMessage,
} from '~/lib/errors';
import Navbar from '~/components/Navbar';
import { usePuterStore } from '~/lib/puter';
import {
  formatJobLocation,
  formatRelativeDate,
  getSafeApplyLink,
} from '~/lib/jobs';

export const meta = () => [
  { title: 'SmartCV | Job Search' },
  { name: 'description', content: 'Find your dream job' },
];

interface Job {
  job_id: string;
  job_title: string;
  employer_name: string;
  employer_logo?: string;
  job_city?: string;
  job_state?: string;
  job_country?: string;
  job_employment_type?: string;
  job_apply_link: string;
  job_description?: string;
  job_posted_at_datetime_utc?: string;
}

interface JobSearchPayload {
  jobTitle: string;
  location: string;
}

const Jobs = () => {
  const { auth, isLoading, kv } = usePuterStore();
  const navigate = useNavigate();
  const [isSearching, setIsSearching] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState('');
  const [lastSearch, setLastSearch] = useState<JobSearchPayload | null>(null);
  const [activeView, setActiveView] = useState<'search' | 'tracker'>('search');
  const [trackedJobs, setTrackedJobs] = useState<TrackedJob[]>([]);
  const [draggedJobId, setDraggedJobId] = useState<string | null>(null);
  const [resumeKeywords, setResumeKeywords] = useState<string[]>([]);

  useEffect(() => {
    if (!isLoading && !auth.isAuthenticated) {
      navigate('/auth?next=/jobs');
    }
  }, [isLoading, auth.isAuthenticated, navigate]);

  useEffect(() => {
    const loadTrackedJobs = async () => {
      try {
        // Puter KV key: smartcv_job_tracker (stores kanban jobs and per-job notes)
        const stored = await kv.get(JOB_TRACKER_KEY);
        if (!stored) {
          setTrackedJobs([]);
          return;
        }
        const parsed = JSON.parse(stored) as TrackedJob[];
        setTrackedJobs(Array.isArray(parsed) ? parsed : []);
      } catch {
        setTrackedJobs([]);
      }
    };

    if (!isLoading && auth.isAuthenticated) {
      loadTrackedJobs();
    }
  }, [auth.isAuthenticated, isLoading, kv]);

  useEffect(() => {
    const loadLatestResumeKeywords = async () => {
      try {
        const resumes = (await kv.list('resume:*', true)) as KVItem[] | undefined;
        const parsedResumes = (resumes ?? [])
          .map((item) => JSON.parse(item.value) as Resume)
          .sort((a, b) => {
            const aTime = a.analyzedAt ? new Date(a.analyzedAt).getTime() : 0;
            const bTime = b.analyzedAt ? new Date(b.analyzedAt).getTime() : 0;
            return bTime - aTime;
          });

        const latestResume = parsedResumes[0];
        if (!latestResume) {
          setResumeKeywords([]);
          return;
        }

        const sourceText = [
          latestResume.jobTitle ?? '',
          latestResume.jobDescription ?? '',
          latestResume.feedback?.toneAndStyle?.tips?.map((tip) => tip.tip).join(' ') ?? '',
          latestResume.feedback?.content?.tips?.map((tip) => tip.tip).join(' ') ?? '',
          latestResume.feedback?.skills?.tips?.map((tip) => tip.tip).join(' ') ?? '',
        ].join(' ');

        const tokens = sourceText
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, ' ')
          .split(/\s+/)
          .filter((word) => word.length > 2)
          .filter((word) => !COMMON_STOP_WORDS.has(word));

        setResumeKeywords(Array.from(new Set(tokens)));
      } catch {
        setResumeKeywords([]);
      }
    };

    if (!isLoading && auth.isAuthenticated) {
      loadLatestResumeKeywords();
    }
  }, [auth.isAuthenticated, isLoading, kv]);

  const persistTrackedJobs = async (items: TrackedJob[]) => {
    // Puter KV key: smartcv_job_tracker (stores kanban jobs and per-job notes)
    await kv.set(JOB_TRACKER_KEY, JSON.stringify(items));
  };


  const searchJobs = async ({
     jobTitle,
      location,
  }: JobSearchPayload) => {
    setIsSearching(true);
    setError('');
    setJobs([]);

    const JSEARCH_API_KEY = import.meta.env.VITE_JSEARCH_API_KEY;

    if (!JSEARCH_API_KEY) {
     setError(getApiKeyMissingMessage('JSearch', 'VITE_JSEARCH_API_KEY'));
     setIsSearching(false);
     return;
    }

    try {
      const combinedQuery = location 
        ? `${jobTitle} in ${location}` 
        : jobTitle;

   const params = new URLSearchParams({
     query: combinedQuery, 
     num_pages: '1',
   });


 const response = await fetch(
   `https://jsearch.p.rapidapi.com/search?${params.toString()}`,
   {
    headers: {
    'x-rapidapi-key': JSEARCH_API_KEY,
   'x-rapidapi-host': 'jsearch.p.rapidapi.com',
    },
  }
    );

    if (!response.ok) {
   throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();
    setJobs(data.data || []);

    if (!data.data || data.data.length === 0) {
      setError('No jobs found. Try different keywords or location.');
    }
    } catch (err) {
    setError(
      normalizeAppErrorMessage(err, { fallbackMessage: 'Failed to search jobs' })
    );
    } finally {
    setIsSearching(false);
    }
  };

  

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const jobTitle = ((formData.get('job-title') as string) || '').trim();
    const location = ((formData.get('location') as string) || '').trim();

    if (!jobTitle) {
      setError('Please enter a job title');
      return;
    }

    const payload = { jobTitle, location };
    setLastSearch(payload);
    searchJobs(payload);
  };

  const trackerColumns: TrackerStatus[] = [
    'Saved',
    'Applied',
    'Interview',
    'Offer',
    'Rejected',
  ];

  const saveJobToTracker = async (job: Job) => {
    if (trackedJobs.some((item) => item.job_id === job.job_id)) return;
    const nextItems: TrackedJob[] = [
      {
        ...job,
        trackerStatus: 'Saved',
        note: '',
        savedAt: new Date().toISOString(),
      },
      ...trackedJobs,
    ];
    setTrackedJobs(nextItems);
    await persistTrackedJobs(nextItems);
  };

  const moveTrackedJob = async (jobId: string, status: TrackerStatus) => {
    const nextItems = trackedJobs.map((item) =>
      item.job_id === jobId ? { ...item, trackerStatus: status } : item
    );
    setTrackedJobs(nextItems);
    await persistTrackedJobs(nextItems);
  };

  const updateTrackedJobNote = async (jobId: string, note: string) => {
    const nextItems = trackedJobs.map((item) =>
      item.job_id === jobId ? { ...item, note } : item
    );
    setTrackedJobs(nextItems);
    await persistTrackedJobs(nextItems);
  };

  const getTrackedJobsByStatus = (status: TrackerStatus) =>
    trackedJobs.filter((item) => item.trackerStatus === status);

  const getMatchScore = (job: Job): number | null => {
    if (resumeKeywords.length === 0) return null;
    const jobText = `${job.job_title} ${job.job_description ?? ''}`
      .toLowerCase()
      .replace(/<[^>]*>/g, ' ')
      .replace(/[^a-z0-9\s]/g, ' ');
    const words = new Set(jobText.split(/\s+/).filter(Boolean));
    const matched = resumeKeywords.filter((keyword) => words.has(keyword)).length;
    return Math.round((matched / resumeKeywords.length) * 100);
  };

  const getMatchBadgeClass = (score: number) => {
    if (score > 70) return 'bg-emerald-100 text-emerald-800';
    if (score >= 40) return 'bg-amber-100 text-amber-800';
    return 'bg-rose-100 text-rose-800';
  };

  return (
    <main className="bg-gradient-to-br from-green-50 via-teal-50 to-blue-50 min-h-screen">
      <Navbar />

      <section className="main-section">
        <div className="page-heading py-16">
          <h1>Job Search</h1>
          <h2>Discover opportunities that match your career goals</h2>
        </div>

        <div className="w-full max-w-4xl">
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setActiveView('search')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeView === 'search'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              Job Search
            </button>
            <button
              type="button"
              onClick={() => setActiveView('tracker')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeView === 'tracker'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              My Job Tracker
            </button>
          </div>

          {activeView === 'search' && (
            <>
          <div className="gradient-border">
            <div className="bg-white rounded-2xl p-8">
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="form-div">
                  <label htmlFor="job-title">Job Title *</label>
                  <input
                    type="text"
                    name="job-title"
                    placeholder="e.g., Software Engineer"
                    id="job-title"
                    required
                  />
                </div>

                <div className="form-div">
                  <label htmlFor="location">Location (Optional)</label>
                  <input
                    type="text"
                    name="location"
                    placeholder="e.g., New York, USA"
                    id="location"
                  />
                </div>

                {error && (
                  <ErrorState
                    message={error}
                    onRetry={
                      lastSearch && !isSearching
                        ? () => searchJobs(lastSearch)
                        : undefined
                    }
                    docsHref={
                      isApiKeyMissingError(error) ? API_SETUP_DOCS_PATH : undefined
                    }
                  />
                )}

                <button
                  className="primary-button"
                  type="submit"
                  disabled={isSearching}
                >
                  {isSearching ? 'Searching...' : 'Search Jobs'}
                </button>
              </form>
            </div>
          </div>

          {isSearching && (
            <LoadingState message="Searching for jobs..." imageAlt="Searching jobs" />
          )}

          {jobs.length > 0 && !isSearching && (
            <div className="mt-10 space-y-4 animate-in fade-in duration-1000">
              <h3 className="text-2xl font-semibold text-gray-800">
                Found {jobs.length} Jobs
              </h3>

              <div className="space-y-4">
                {jobs.map((job) => (
                  <div
                    key={job.job_id}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all hover:scale-[1.01]"
                  >
                    <div className="flex items-start gap-4">
                      {job.employer_logo && (
                        <img
                          src={job.employer_logo}
                          alt={job.employer_name}
                          className="w-16 h-16 rounded-lg object-contain bg-gray-50 p-2"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}

                      <div className="flex-1">
                        {(() => {
                          const matchScore = getMatchScore(job);
                          return (
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                          <h4 className="text-xl font-semibold text-gray-800">
                            {job.job_title}
                          </h4>
                          {matchScore === null ? (
                            <span
                              className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-600"
                              title="Upload resume for match score"
                            >
                              Upload resume for match score
                            </span>
                          ) : (
                            <span
                              className={`text-xs px-3 py-1 rounded-full font-medium ${getMatchBadgeClass(matchScore)}`}
                            >
                              Match Score: {matchScore}%
                            </span>
                          )}
                        </div>
                          );
                        })()}

                        <div className="flex flex-wrap gap-3 mb-3">
                          <div className="flex items-center gap-2 text-gray-600">
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                              />
                            </svg>
                            <span className="font-medium">{job.employer_name}</span>
                          </div>

                          <div className="flex items-center gap-2 text-gray-600">
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                            <span>{formatJobLocation(job)}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4">
                          {job.job_employment_type && (
                            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                              {job.job_employment_type}
                            </span>
                          )}
                          <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                            {formatRelativeDate(job.job_posted_at_datetime_utc)}
                          </span>
                        </div>

                        {job.job_description && (
                          <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                            {job.job_description.replace(/<[^>]*>/g, '').substring(0, 200)}
                            ...
                          </p>
                        )}

                        {getSafeApplyLink(job.job_apply_link) ? (
                          <div className="flex flex-wrap items-center gap-3">
                            <a
                              href={getSafeApplyLink(job.job_apply_link)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-full font-medium hover:shadow-lg transition-all"
                            >
                              Apply Now
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                />
                              </svg>
                            </a>
                            <button
                              type="button"
                              className="px-5 py-2 rounded-full bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors"
                              onClick={() => saveJobToTracker(job)}
                              disabled={trackedJobs.some((item) => item.job_id === job.job_id)}
                            >
                              {trackedJobs.some((item) => item.job_id === job.job_id)
                                ? 'Saved to Tracker'
                                : 'Save to Tracker'}
                            </button>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">Application link unavailable</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
            </>
          )}

          {activeView === 'tracker' && (
            <div className="mt-6 overflow-x-auto">
              <h3 className="text-2xl font-semibold text-gray-800 mb-4">My Job Tracker</h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 min-w-[900px] md:min-w-0">
                {trackerColumns.map((column) => (
                  <div
                    key={column}
                    className="bg-white rounded-2xl border border-gray-100 p-3 min-h-[260px]"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (draggedJobId) {
                        moveTrackedJob(draggedJobId, column);
                        setDraggedJobId(null);
                      }
                    }}
                  >
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">{column}</h4>
                    <div className="space-y-3">
                      {getTrackedJobsByStatus(column).map((trackedJob) => (
                        <div
                          key={trackedJob.job_id}
                          draggable
                          onDragStart={() => setDraggedJobId(trackedJob.job_id)}
                          className="rounded-xl border border-gray-200 p-3 bg-gray-50 cursor-grab active:cursor-grabbing"
                        >
                          <p className="text-sm font-semibold text-gray-800 line-clamp-2">
                            {trackedJob.job_title}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">{trackedJob.employer_name}</p>
                          {trackedJob.note.trim() && (
                            <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                              {trackedJob.note.substring(0, 60)}
                            </p>
                          )}
                          <textarea
                            rows={2}
                            defaultValue={trackedJob.note}
                            placeholder="Add note..."
                            className="mt-2 w-full text-xs p-2 rounded-lg border border-gray-200 focus:outline-none bg-white"
                            onBlur={(e) =>
                              updateTrackedJobNote(trackedJob.job_id, e.target.value)
                            }
                          />
                        </div>
                      ))}
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

type TrackerStatus = 'Saved' | 'Applied' | 'Interview' | 'Offer' | 'Rejected';

interface TrackedJob extends Job {
  trackerStatus: TrackerStatus;
  note: string;
  savedAt: string;
}

const JOB_TRACKER_KEY = 'smartcv_job_tracker';
const COMMON_STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'you',
  'your',
  'are',
  'that',
  'this',
  'from',
  'have',
  'will',
  'our',
  'job',
  'role',
  'experience',
  'using',
  'into',
  'about',
  'their',
  'they',
  'has',
  'was',
  'but',
  'not',
  'all',
  'can',
  'any',
]);

export default Jobs;
