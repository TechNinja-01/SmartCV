import type { Route } from "./+types/home";
import Navbar from "~/components/Navbar";
import ResumeCard from "~/components/ResumeCard";
import {usePuterStore} from "~/lib/puter";
import {Link, useNavigate} from "react-router";
import {useEffect, useState} from "react";

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
      setLoadingResumes(false);
    }

    loadResumes()
  }, []);

  

  return <main className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 min-h-screen">
    <Navbar />
    

    <section className="main-section">
      <div className="page-heading py-16">
        <h1>Your Career Success Hub</h1>
        <h2>Everything you need to land your dream job in one place</h2>
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <Link to="/upload" className="group">
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-xl transition-all hover:scale-105">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-gray-800 mb-2">ATS Review</h3>
            <p className="text-gray-600">Get AI-powered feedback on your resume and improve your ATS score</p>
          </div>
        </Link>

        <Link to="/interview" className="group">
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-xl transition-all hover:scale-105">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-gray-800 mb-2">Interview Prep</h3>
            <p className="text-gray-600">Generate custom interview questions tailored to your target role</p>
          </div>
        </Link>

        <Link to="/jobs" className="group">
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-xl transition-all hover:scale-105">
            <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-teal-600 rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-gray-800 mb-2">Job Search</h3>
            <p className="text-gray-600">Discover job opportunities that match your skills and experience</p>
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
          <div className="resumes-section">
            {resumes.map((resume) => (
              <ResumeCard key={resume.id} resume={resume} />
            ))}
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
  </main>
}