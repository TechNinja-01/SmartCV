import { useState, type FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router';
import Navbar from '~/components/Navbar';
import { usePuterStore } from '~/lib/puter';

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

const Jobs = () => {
  const { auth, isLoading } = usePuterStore();
  const navigate = useNavigate();
  const [isSearching, setIsSearching] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && !auth.isAuthenticated) {
      navigate('/auth?next=/jobs');
    }
  }, [isLoading, auth.isAuthenticated]);


  const searchJobs = async ({
     jobTitle,
      location,
  }: {
   jobTitle: string;
   location: string;
  }) => {
   setIsSearching(true);
    setError('');

    const JSEARCH_API_KEY = import.meta.env.VITE_JSEARCH_API_KEY;

    if (!JSEARCH_API_KEY) {
     setError('JSearch API key not configured. Please add VITE_JSEARCH_API_KEY to your .env file.');
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
    setError(err instanceof Error ? err.message : 'Failed to search jobs');
    } finally {
    setIsSearching(false);
    }
  };

  

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const jobTitle = formData.get('job-title') as string;
    const location = formData.get('location') as string;

    if (!jobTitle) {
      setError('Please enter a job title');
      return;
    }

    searchJobs({ jobTitle, location });
  };

  const formatLocation = (job: Job) => {
    const parts = [job.job_city, job.job_state, job.job_country].filter(Boolean);
    return parts.join(', ') || 'Location not specified';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Recently posted';
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return `${Math.floor(diffInDays / 30)} months ago`;
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
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl">
                    {error}
                  </div>
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
            <div className="flex flex-col items-center justify-center mt-10 animate-in fade-in">
              <img src="/images/resume-scan-2.gif" className="w-[200px]" />
              <p className="text-xl text-gray-600 mt-4">Searching for jobs...</p>
            </div>
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
                        <h4 className="text-xl font-semibold text-gray-800 mb-2">
                          {job.job_title}
                        </h4>

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
                            <span>{formatLocation(job)}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4">
                          {job.job_employment_type && (
                            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                              {job.job_employment_type}
                            </span>
                          )}
                          <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                            {formatDate(job.job_posted_at_datetime_utc)}
                          </span>
                        </div>

                        {job.job_description && (
                          <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                            {job.job_description.replace(/<[^>]*>/g, '').substring(0, 200)}
                            ...
                          </p>
                        )}

                        <a
                          href={job.job_apply_link}
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

export default Jobs;
