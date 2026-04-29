export interface InterviewRequestBody {
  jobTitle: string;
  experienceLevel: string;
  jobDescription: string;
}

export const normalizeInterviewPayload = (payload: Partial<InterviewRequestBody>) => {
  return {
    jobTitle: (payload.jobTitle || '').trim(),
    experienceLevel: (payload.experienceLevel || '').trim(),
    jobDescription: (payload.jobDescription || '').trim(),
  };
};

export const hasRequiredInterviewFields = (
  payload: Partial<InterviewRequestBody>
) => {
  const normalized = normalizeInterviewPayload(payload);
  return Boolean(normalized.jobTitle && normalized.experienceLevel);
};
