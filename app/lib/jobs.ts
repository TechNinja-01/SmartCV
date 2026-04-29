export interface JobLocation {
  job_city?: string;
  job_state?: string;
  job_country?: string;
}

export const formatJobLocation = (job: JobLocation) => {
  const parts = [job.job_city, job.job_state, job.job_country].filter(Boolean);
  return parts.join(', ') || 'Location not specified';
};

export const formatRelativeDate = (dateString?: string) => {
  if (!dateString) return 'Recently posted';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'Recently posted';

  const now = new Date();
  const diffInDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffInDays <= 0) return 'Today';
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  return `${Math.floor(diffInDays / 30)} months ago`;
};

export const getSafeApplyLink = (url?: string) => {
  if (!url) return '';

  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    return '';
  }

  return '';
};
