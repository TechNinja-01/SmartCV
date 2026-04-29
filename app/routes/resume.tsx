import {Link, useNavigate, useParams} from "react-router";
import {useEffect, useState} from "react";
import {usePuterStore} from "~/lib/puter";
import ErrorState from "~/components/ErrorState";
import LoadingState from "~/components/LoadingState";
import RewriteSuggestionsModal from "~/components/RewriteSuggestionsModal";
import Summary from "~/components/Summary";
import ATS from "~/components/ATS";
import Details from "~/components/Details";
import ScoreBreakdown from "~/components/ScoreBreakdown";
import {
    buildRewriteSuggestionsPrompt,
    buildKeywordGapPrompt,
    parseRewriteSuggestionsResult,
    parseKeywordGapResult,
    type KeywordGapResult,
} from "~/lib/ats-intelligence";
import { normalizeAppErrorMessage } from "~/lib/errors";

export const meta = () => ([
    { title: 'Resumind | Review ' },
    { name: 'description', content: 'Detailed overview of your resume' },
])

const Resume = () => {
    const { auth, isLoading, fs, kv, ai } = usePuterStore();
    const { id } = useParams();
    const [imageUrl, setImageUrl] = useState('');
    const [resumeUrl, setResumeUrl] = useState('');
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const [resumeData, setResumeData] = useState<Resume | null>(null);
    const [keywordGap, setKeywordGap] = useState<KeywordGapResult | null>(null);
    const [isKeywordGapLoading, setIsKeywordGapLoading] = useState(false);
    const [keywordGapError, setKeywordGapError] = useState('');
    const [keywordGapRetryTick, setKeywordGapRetryTick] = useState(0);
    const [isSuggestionsModalOpen, setIsSuggestionsModalOpen] = useState(false);
    const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
    const [suggestionsError, setSuggestionsError] = useState('');
    const [rewriteSuggestions, setRewriteSuggestions] = useState<string[]>([]);
    const [copyStatus, setCopyStatus] = useState('');
    const navigate = useNavigate();
    const scoreBreakdownItems = feedback
        ? [
            { label: 'Tone', score: feedback.toneAndStyle?.score ?? null },
            { label: 'Content', score: feedback.content?.score ?? null },
            { label: 'Structure', score: feedback.structure?.score ?? null },
            { label: 'Skills', score: feedback.skills?.score ?? null },
          ]
        : [];

    useEffect(() => {
        if(!isLoading && !auth.isAuthenticated) navigate(`/auth?next=/resume/${id}`);
    }, [isLoading])

    useEffect(() => {
        const loadResume = async () => {
            const resume = await kv.get(`resume:${id}`);

            if(!resume) return;

            const data = JSON.parse(resume);

            const resumeBlob = await fs.read(data.resumePath);
            if(!resumeBlob) return;

            const pdfBlob = new Blob([resumeBlob], { type: 'application/pdf' });
            const resumeUrl = URL.createObjectURL(pdfBlob);
            setResumeUrl(resumeUrl);

            const imageBlob = await fs.read(data.imagePath);
            if(!imageBlob) return;
            const imageUrl = URL.createObjectURL(imageBlob);
            setImageUrl(imageUrl);

            setFeedback(data.feedback);
            setResumeData(data as Resume);
        }

        loadResume();
    }, [id]);

    useEffect(() => {
        const fetchKeywordGap = async () => {
            const jobDescription = resumeData?.jobDescription?.trim() ?? '';
            if (!resumeData || !jobDescription) {
                setKeywordGap(null);
                setKeywordGapError('');
                return;
            }

            setIsKeywordGapLoading(true);
            setKeywordGapError('');

            try {
                const response = await ai.chat([
                    {
                        role: "user",
                        content: [
                            {
                                type: "file",
                                puter_path: resumeData.resumePath,
                            },
                            {
                                type: "text",
                                text: buildKeywordGapPrompt(jobDescription),
                            },
                        ],
                    },
                ], { model: "gpt-4.1-nano" });

                const responseContent = response?.message?.content;
                const responseText =
                    typeof responseContent === 'string'
                        ? responseContent
                        : responseContent?.[0]?.text ?? '';

                if (!responseText) {
                    throw new Error('Keyword analysis returned an empty response.');
                }

                setKeywordGap(parseKeywordGapResult(responseText));
            } catch (error) {
                setKeywordGap(null);
                setKeywordGapError(
                    normalizeAppErrorMessage(error, {
                        fallbackMessage: 'Unable to load keyword gap analysis.',
                    })
                );
            } finally {
                setIsKeywordGapLoading(false);
            }
        };

        fetchKeywordGap();
    }, [resumeData, ai, keywordGapRetryTick]);

    const fetchRewriteSuggestions = async () => {
        if (!resumeData || !feedback) return;

        setIsSuggestionsLoading(true);
        setSuggestionsError('');
        setCopyStatus('');

        try {
            const response = await ai.chat([
                {
                    role: "user",
                    content: [
                        {
                            type: "file",
                            puter_path: resumeData.resumePath,
                        },
                        {
                            type: "text",
                            text: buildRewriteSuggestionsPrompt(feedback),
                        },
                    ],
                },
            ], { model: "gpt-4.1-nano" });

            const responseContent = response?.message?.content;
            const responseText =
                typeof responseContent === 'string'
                    ? responseContent
                    : responseContent?.[0]?.text ?? '';

            if (!responseText) {
                throw new Error('Suggestion generation returned an empty response.');
            }

            const parsed = parseRewriteSuggestionsResult(responseText);
            if (parsed.suggestions.length === 0) {
                throw new Error('No rewrite suggestions were generated. Please try again.');
            }
            setRewriteSuggestions(parsed.suggestions);
        } catch (error) {
            setRewriteSuggestions([]);
            setSuggestionsError(
                normalizeAppErrorMessage(error, {
                    fallbackMessage: 'Unable to generate rewrite suggestions.',
                })
            );
        } finally {
            setIsSuggestionsLoading(false);
        }
    };

    const openSuggestionsModal = () => {
        setIsSuggestionsModalOpen(true);
        if (rewriteSuggestions.length === 0) {
            fetchRewriteSuggestions();
        }
    };

    const copyAllSuggestions = async () => {
        if (rewriteSuggestions.length === 0) return;
        try {
            await navigator.clipboard.writeText(rewriteSuggestions.map((item) => `- ${item}`).join('\n'));
            setCopyStatus('Copied to clipboard.');
        } catch {
            setCopyStatus('Unable to copy. Please copy manually.');
        }
    };

    return (
        <main className="!pt-0">
            <nav className="resume-nav">
                <Link to="/" className="back-button">
                    <img src="/icons/back.svg" alt="logo" className="w-2.5 h-2.5" />
                    <span className="text-gray-800 text-sm font-semibold">Back to Homepage</span>
                </Link>
            </nav>
            <div className="flex flex-row w-full max-lg:flex-col-reverse">
                <section className="feedback-section bg-[url('/images/bg-small.svg') bg-cover h-[100vh] sticky top-0 items-center justify-center">
                    {imageUrl && resumeUrl && (
                        <div className="animate-in fade-in duration-1000 gradient-border max-sm:m-0 h-[90%] max-wxl:h-fit w-fit">
                            <a href={resumeUrl} target="_blank" rel="noopener noreferrer">
                                <img
                                    src={imageUrl}
                                    className="w-full h-full object-contain rounded-2xl"
                                    title="resume"
                                />
                            </a>
                        </div>
                    )}
                </section>
                <section className="feedback-section">
                    <h2 className="text-4xl !text-black font-bold">Resume Review</h2>
                    {feedback ? (
                        <div className="flex flex-col gap-8 animate-in fade-in duration-1000">
                            <Summary feedback={feedback} />
                            <ScoreBreakdown items={scoreBreakdownItems} />
                            <details className="bg-white dark:bg-gray-900 rounded-2xl shadow-md p-6 border border-gray-100 dark:border-gray-800">
                                <summary className="cursor-pointer text-xl font-semibold text-gray-800">
                                    Keyword Gap Analysis
                                </summary>
                                <div className="mt-4">
                                    {!resumeData?.jobDescription?.trim() ? (
                                        <p className="text-gray-600">
                                            Add a job description above to see keyword gap analysis
                                        </p>
                                    ) : isKeywordGapLoading ? (
                                        <LoadingState
                                            variant="inline"
                                            message="Analyzing keyword gaps..."
                                            imageAlt="Keyword gap analysis loading"
                                        />
                                    ) : keywordGapError ? (
                                        <ErrorState
                                            message={keywordGapError}
                                            onRetry={() => setKeywordGapRetryTick((prev) => prev + 1)}
                                        />
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <h4 className="text-base font-semibold text-emerald-700 mb-2">
                                                    Found in Resume
                                                </h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {(keywordGap?.foundKeywords ?? []).length > 0 ? (
                                                        keywordGap?.foundKeywords.map((keyword) => (
                                                            <span
                                                                key={`found-${keyword}`}
                                                                className="px-3 py-1 rounded-full text-sm bg-emerald-100 text-emerald-800"
                                                            >
                                                                {keyword}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <p className="text-sm text-gray-500">No keywords identified yet.</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="text-base font-semibold text-rose-700 mb-2">
                                                    Missing Keywords
                                                </h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {(keywordGap?.missingKeywords ?? []).length > 0 ? (
                                                        keywordGap?.missingKeywords.map((keyword) => (
                                                            <span
                                                                key={`missing-${keyword}`}
                                                                className="px-3 py-1 rounded-full text-sm bg-rose-100 text-rose-800"
                                                            >
                                                                {keyword}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <p className="text-sm text-gray-500">No missing keywords detected.</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </details>
                            <ATS score={feedback.ATS.score || 0} suggestions={feedback.ATS.tips || []} />
                            <Details feedback={feedback} />
                            <button
                                type="button"
                                className="w-full px-6 py-3 rounded-full font-medium bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:shadow-lg transition-all"
                                onClick={openSuggestionsModal}
                            >
                                Get Rewrite Suggestions
                            </button>
                        </div>
                    ) : (
                        <img src="/images/resume-scan-2.gif" className="w-full" />
                    )}
                </section>
            </div>
            <RewriteSuggestionsModal
                isOpen={isSuggestionsModalOpen}
                isLoading={isSuggestionsLoading}
                error={suggestionsError}
                suggestions={rewriteSuggestions}
                onClose={() => setIsSuggestionsModalOpen(false)}
                onRetry={fetchRewriteSuggestions}
                onCopyAll={copyAllSuggestions}
                copyStatus={copyStatus}
            />
        </main>
    )
}
export default Resume