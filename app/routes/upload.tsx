import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router';
import {convertPdfToImage} from "~/lib/pdf2img";
import ErrorState from '~/components/ErrorState';
import FileUploader from '~/components/FileUploader';
import LoadingState from '~/components/LoadingState';
import Navbar from '~/components/Navbar'
import { normalizeAppErrorMessage } from '~/lib/errors';
import { usePuterStore } from '~/lib/puter';
import { generateUUID } from '~/lib/utils';
import { prepareInstructions } from '../../constants';

const upload = () => {
    const {auth,isLoading,fs,ai,kv}=usePuterStore(); //kv is key-value storage function.
    const navigate=useNavigate();
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [errorText, setErrorText] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [lastSubmission, setLastSubmission] = useState<{
        companyName: string;
        jobTitle: string;
        jobDescription: string;
        file: File;
    } | null>(null);


    const handleFileSelect= (file: File | null) => {
        setFile(file);
    }

      const handleAnalyze = async ({ companyName, jobTitle, jobDescription, file }: { companyName: string, jobTitle: string, jobDescription: string, file: File  }) => {
        setIsProcessing(true);
        setStatusText('');
        setErrorText('');

        try {
            setStatusText('Uploading the file...');
            const uploadedFile = await fs.upload([file]);
            if (!uploadedFile) {
                throw new Error('Failed to upload resume file.');
            }

            setStatusText('Converting to image...');
            const imageFile = await convertPdfToImage(file);
            if (!imageFile.file) {
                throw new Error('Failed to convert PDF to image.');
            }

            setStatusText('Uploading the image...');
            const uploadedImage = await fs.upload([imageFile.file]);
            if (!uploadedImage) {
                throw new Error('Failed to upload converted image.');
            }

            setStatusText('Preparing data...');
            const uuid = generateUUID();
            const data = {
                id: uuid,
                resumePath: uploadedFile.path,
                imagePath: uploadedImage.path,
                companyName,
                jobTitle,
                jobDescription,
                analyzedAt: new Date().toISOString(),
                feedback: '',
            };
            await kv.set(`resume:${uuid}`, JSON.stringify(data));

            setStatusText('Analyzing...');
            const feedback = await ai.feedback(
                uploadedFile.path,
                prepareInstructions({ jobTitle, jobDescription })
            );
            if (!feedback) {
                throw new Error('Failed to analyze resume.');
            }

            const feedbackText = typeof feedback.message.content === 'string'
                ? feedback.message.content
                : feedback.message.content[0].text;

            data.feedback = JSON.parse(feedbackText);
            await kv.set(`resume:${uuid}`, JSON.stringify(data));
            setStatusText('Analysis complete, redirecting...');
            navigate(`/resume/${uuid}`);
        } catch (error) {
            setStatusText('');
            setErrorText(
                normalizeAppErrorMessage(error, {
                    fallbackMessage: 'Resume analysis failed.',
                })
            );
            setIsProcessing(false);
        }
    }

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget.closest('form');
        if(!form) return;
        const formData = new FormData(form);

        const companyName = formData.get('company-name') as string;
        const jobTitle = formData.get('job-title') as string;
        const jobDescription = formData.get('job-description') as string;

        if(!file) {
            setErrorText('Please upload a PDF resume first.');
            return;
        }

        const submission = { companyName, jobTitle, jobDescription, file };
        setLastSubmission(submission);
        handleAnalyze(submission);
    }

    return (
        <main className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 min-h-screen">
            <Navbar />
            <section className="main-section">
                <div className='page-heading py-16'>
                    <h1>ATS Resume Review</h1>
                    {isProcessing ? (
                        <>
                            <LoadingState
                                message={statusText || 'Analyzing...'}
                                imageSrc="/images/resume-scan.gif"
                                imageAlt="Resume analysis in progress"
                                className="w-full"
                            />
                        </>
                    ) : (
                        <h2>Upload your resume for ATS score and improvement tips</h2>
                    )}
                    {errorText && (
                        <ErrorState
                            message={errorText}
                            className="w-full mt-4 max-w-4xl"
                            onRetry={lastSubmission ? () => handleAnalyze(lastSubmission) : undefined}
                        />
                    )}
                    {!isProcessing && (
                        <form id='upload-form' onSubmit={handleSubmit} className='flex flex-col gap-4 mt-8'>
                            <div className='form-div'>
                                <label htmlFor="company-name">Company Name</label>
                                <input type="text" name='company-name' placeholder='Company Name' id='company-name' />
                            </div>
                            <div className='form-div'>
                                <label htmlFor="job-title">Job Title</label>
                                <input type="text" name='job-title' placeholder='Job Title' id='job-title' />
                            </div>
                            <div className='form-div'>
                                <label htmlFor="job-description">Job Description</label>
                                <textarea rows={5} name='job-description' placeholder='Job Description' id='job-description' />
                            </div>
                            <div className='form-div'>
                                <label htmlFor="uploader">Upload Resume</label>
                                <FileUploader onFileSelect={handleFileSelect} />
                            </div>

                            <button className='primary-button' type='submit'>
                                Analyze Resume
                            </button>

                        </form>
                    )}
                </div>
            </section>
        </main>
    )
}

export default upload