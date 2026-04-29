import type { Route } from "./+types/home";
import Navbar from "~/components/Navbar";
import ResumeCard from "~/components/ResumeCard";
import {usePuterStore} from "~/lib/puter";
import {Link, useNavigate} from "react-router";
import {useEffect, useMemo, useRef, useState} from "react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "SmartCV" },
    { name: "description", content: "Smart feedback for your dream job!" },
  ];
}

export default function Home() {
  const { auth, kv } = usePuterStore();
  const navigate = useNavigate();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(false);
  const [compareTargetId, setCompareTargetId] = useState<string | null>(null);
  const [savedQuestionsCount, setSavedQuestionsCount] = useState(0);
  const [trackedJobsCount, setTrackedJobsCount] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const onboardingDialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if(!auth.isAuthenticated) navigate('/auth?next=/');
  }, [auth.isAuthenticated])

  useEffect(() => {
    const loadResumes = async () => {
      setLoadingResumes(true);

      const resumes = (await kv.list('resume:*', true)) as KVItem[];

      const parsedResumes = resumes?.map((resume) => (
          JSON.parse(resume.value) as Resume
      ))

      setResumes(parsedResumes || []);

      const savedQuestionsRaw = await kv.get('smartcv_saved_questions');
      const trackedJobsRaw = await kv.get('smartcv_job_tracker');
      const savedQuestions = savedQuestionsRaw
        ? (JSON.parse(savedQuestionsRaw) as unknown[])
        : [];
      const trackedJobs = trackedJobsRaw ? (JSON.parse(trackedJobsRaw) as unknown[]) : [];
      setSavedQuestionsCount(Array.isArray(savedQuestions) ? savedQuestions.length : 0);
      setTrackedJobsCount(Array.isArray(trackedJobs) ? trackedJobs.length : 0);

      const onboardingDone = await kv.get(ONBOARDED_KEY);
      if ((!parsedResumes || parsedResumes.length === 0) && onboardingDone !== 'true') {
        setShowOnboarding(true);
        setOnboardingStep(1);
      }
      setLoadingResumes(false);
    }

    loadResumes()
  }, []);

  const sortedResumes = [...resumes].sort((a, b) => {
    const aTime = a.analyzedAt ? new Date(a.analyzedAt).getTime() : 0;
    const bTime = b.analyzedAt ? new Date(b.analyzedAt).getTime() : 0;
    return bTime - aTime;
  });
  const latestResume = sortedResumes[0] ?? null;
  const previousResume = sortedResumes[1] ?? null;
  const canCompare = sortedResumes.length > 1;
  const compareTarget =
    compareTargetId && latestResume
      ? sortedResumes.find((resume) => resume.id === compareTargetId) ?? null
      : null;

  const formatAnalysisDate = (date?: string) => {
    if (!date) return 'Unknown date';
    const timestamp = new Date(date).getTime();
    if (Number.isNaN(timestamp)) return 'Unknown date';
    return new Date(date).toLocaleString();
  };

  const ScoreRow = ({ label, leftScore, rightScore }: { label: string; leftScore?: number; rightScore?: number }) => (
    <div className="grid grid-cols-3 gap-3 text-sm">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium text-gray-800">{typeof leftScore === 'number' ? `${leftScore}/100` : 'N/A'}</span>
      <span className="font-medium text-gray-800">{typeof rightScore === 'number' ? `${rightScore}/100` : 'N/A'}</span>
    </div>
  );
  const latestAtsScore = latestResume?.feedback?.ATS?.score;
  const previousAtsScore = previousResume?.feedback?.ATS?.score;
  const trendDirection =
    typeof latestAtsScore === 'number' && typeof previousAtsScore === 'number'
      ? latestAtsScore - previousAtsScore
      : null;
  

  const isBrandNewUser =
    resumes.length === 0 && trackedJobsCount === 0 && savedQuestionsCount === 0;

  const dismissOnboarding = async () => {
    await kv.set(ONBOARDED_KEY, 'true');
    setShowOnboarding(false);
  };

  useEffect(() => {
    if (!showOnboarding) return;

    const dialog = onboardingDialogRef.current;
    if (!dialog) return;

    const getFocusable = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])'
        )
      );

    const focusables = getFocusable();
    focusables[0]?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        void dismissOnboarding();
        return;
      }

      if (e.key !== 'Tab') return;
      const items = getFocusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (!active || active === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showOnboarding, kv]);

  return <main className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 min-h-screen">
    <Navbar />
    

    <section className="main-section">
      <div className="page-heading py-16">
        <h1>Your Career Success Hub</h1>
        <h2>Everything you need to land your dream job in one place</h2>
      </div>

      {isBrandNewUser ? (
        <div className="w-full max-w-6xl mb-12">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
            <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
              Welcome to SmartCV — start by uploading your resume
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Once you analyze a resume, you’ll see your ATS score trend, matching job badges, and saved interview practice.
            </p>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">Resumes Analyzed</p>
            <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">{resumes.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">Latest ATS Score</p>
            <div className="flex items-center gap-2">
              <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                {typeof latestAtsScore === 'number' ? latestAtsScore : 'N/A'}
              </p>
              {trendDirection !== null && (
                <span
                  className={`text-sm font-semibold ${
                    trendDirection >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {trendDirection >= 0 ? '↑' : '↓'} {Math.abs(trendDirection)}
                </span>
              )}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">Jobs Tracked</p>
            <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">{trackedJobsCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">Questions Saved</p>
            <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">{savedQuestionsCount}</p>
          </div>
        </div>
      )}

      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <Link to="/upload" className="group">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-xl transition-all hover:scale-105">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-2">Analyze Resume</h3>
            <p className="text-gray-600 dark:text-gray-300">Get AI-powered feedback and improve your ATS score</p>
          </div>
        </Link>

        <Link to="/interview" className="group">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-xl transition-all hover:scale-105">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-2">Practice Interview</h3>
            <p className="text-gray-600 dark:text-gray-300">Generate questions and get AI evaluation in mock mode</p>
          </div>
        </Link>

        <Link to="/jobs" className="group">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-xl transition-all hover:scale-105">
            <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-teal-600 rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-2">Search Jobs</h3>
            <p className="text-gray-600 dark:text-gray-300">Find roles and track applications in your kanban board</p>
          </div>
        </Link>
      </div>

      <div className="w-full max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-semibold text-gray-800">Your Resume Reviews</h2>
          {!loadingResumes && resumes.length > 0 && (
            <Link to="/upload" className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full font-medium hover:shadow-lg transition-all">
              Add New
            </Link>
          )}
        </div>

        {loadingResumes && (
          <div className="flex flex-col items-center justify-center">
            <img src="/images/resume-scan-2.gif" className="w-[200px]" />
          </div>
        )}

        {!loadingResumes && resumes.length > 0 && (
          <div className="resumes-section items-stretch">
            {sortedResumes.map((resume) => (
              <div key={resume.id} className="flex flex-col gap-3">
                <ResumeCard resume={resume} />
                {canCompare && latestResume && resume.id !== latestResume.id && (
                  <button
                    type="button"
                    className="px-4 py-2 rounded-full text-sm font-medium bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
                    onClick={() => setCompareTargetId(resume.id)}
                  >
                    Compare with Latest
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {canCompare && latestResume && compareTarget && (
          <div className="mt-8 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-5">
              <h3 className="text-2xl font-semibold text-gray-800">Resume Comparison</h3>
              <button
                type="button"
                className="px-4 py-2 rounded-full text-sm font-medium bg-gray-100 hover:bg-gray-200 transition-colors"
                onClick={() => setCompareTargetId(null)}
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
              <div className="rounded-2xl border border-gray-200 p-4">
                <h4 className="text-lg font-semibold text-gray-800 mb-1">Selected Historical</h4>
                <p className="text-sm text-gray-500">{formatAnalysisDate(compareTarget.analyzedAt)}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {(compareTarget.companyName || 'Unknown company')} • {(compareTarget.jobTitle || 'Untitled role')}
                </p>
              </div>
              <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4">
                <h4 className="text-lg font-semibold text-gray-800 mb-1">Latest</h4>
                <p className="text-sm text-gray-500">{formatAnalysisDate(latestResume.analyzedAt)}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {(latestResume.companyName || 'Unknown company')} • {(latestResume.jobTitle || 'Untitled role')}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <ScoreRow
                label="Overall"
                leftScore={compareTarget.feedback?.overallScore}
                rightScore={latestResume.feedback?.overallScore}
              />
              <ScoreRow
                label="Tone"
                leftScore={compareTarget.feedback?.toneAndStyle?.score}
                rightScore={latestResume.feedback?.toneAndStyle?.score}
              />
              <ScoreRow
                label="Content"
                leftScore={compareTarget.feedback?.content?.score}
                rightScore={latestResume.feedback?.content?.score}
              />
              <ScoreRow
                label="Structure"
                leftScore={compareTarget.feedback?.structure?.score}
                rightScore={latestResume.feedback?.structure?.score}
              />
              <ScoreRow
                label="Skills"
                leftScore={compareTarget.feedback?.skills?.score}
                rightScore={latestResume.feedback?.skills?.score}
              />
            </div>
          </div>
        )}

        {!loadingResumes && resumes?.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-gray-800 mb-2">No resumes yet</h3>
            <p className="text-gray-600 mb-6">Upload your first resume to get AI-powered feedback</p>
            <Link to="/upload" className="inline-block px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full font-medium hover:shadow-lg transition-all">
              Upload Resume
            </Link>
          </div>
        )}
      </div>
    </section>
    {showOnboarding && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <button
          type="button"
          aria-label="Close onboarding"
          className="absolute inset-0 bg-black/40"
          onClick={() => void dismissOnboarding()}
        />
        <div
          ref={onboardingDialogRef}
          role="dialog"
          aria-modal="true"
          className="relative w-full max-w-xl rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl border border-gray-100 dark:border-gray-800"
        >
          {onboardingStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
                Welcome to SmartCV 👋
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                  <p className="font-semibold text-gray-800 dark:text-gray-100">📄 ATS Review</p>
                  <p className="text-gray-600 dark:text-gray-300">Upload your resume for an ATS score & tips</p>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                  <p className="font-semibold text-gray-800 dark:text-gray-100">🎤 Interview</p>
                  <p className="text-gray-600 dark:text-gray-300">Generate questions and practice answers</p>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                  <p className="font-semibold text-gray-800 dark:text-gray-100">🧭 Job Tracker</p>
                  <p className="text-gray-600 dark:text-gray-300">Save roles and track your application stages</p>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  className="px-5 py-2 rounded-full bg-blue-600 text-white font-medium"
                  onClick={() => setOnboardingStep(2)}
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {onboardingStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
                Start with your Resume
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Upload your resume to get an ATS score and keyword analysis.
              </p>
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  className="text-sm underline text-gray-600 dark:text-gray-300"
                  onClick={() => void dismissOnboarding()}
                >
                  Skip for now
                </button>
                <button
                  type="button"
                  className="px-5 py-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium"
                  onClick={async () => {
                    await kv.set(ONBOARDED_KEY, 'true');
                    setShowOnboarding(false);
                    navigate('/upload');
                  }}
                >
                  Go to ATS Review
                </button>
              </div>
            </div>
          )}

          {onboardingStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
                You're all set!
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Quick links to jump back in anytime:
              </p>
              <div className="flex flex-wrap gap-2">
                <Link to="/upload" className="px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-100">
                  Analyze Resume
                </Link>
                <Link to="/interview" className="px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-100">
                  Practice Interview
                </Link>
                <Link to="/jobs" className="px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-100">
                  Search Jobs
                </Link>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  className="px-5 py-2 rounded-full bg-blue-600 text-white font-medium"
                  onClick={() => void dismissOnboarding()}
                >
                  Let's go!
                </button>
              </div>
            </div>
          )}

          {onboardingStep !== 3 && (
            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                className="px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-100 disabled:opacity-50"
                disabled={onboardingStep === 1}
                onClick={() => setOnboardingStep((step) => Math.max(1, step - 1))}
              >
                Back
              </button>
              {onboardingStep === 2 && (
                <button
                  type="button"
                  className="px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-100"
                  onClick={() => setOnboardingStep(3)}
                >
                  Next →
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    )}
  </main>
}

const ONBOARDED_KEY = 'smartcv_onboarded';