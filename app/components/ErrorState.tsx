interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  docsHref?: string;
  docsLabel?: string;
  className?: string;
}

const ErrorState = ({
  title,
  message,
  onRetry,
  retryLabel = 'Retry',
  docsHref,
  docsLabel = 'Setup docs',
  className = '',
}: ErrorStateProps) => {
  return (
    <div
      className={`bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl ${className}`}
      role="alert"
    >
      {title && <p className="font-semibold mb-1">{title}</p>}
      <p>{message}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="px-4 py-2 rounded-full bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
          >
            {retryLabel}
          </button>
        )}

        {docsHref && (
          <a
            href={docsHref}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium underline underline-offset-2 hover:text-red-800"
          >
            {docsLabel}
          </a>
        )}
      </div>
    </div>
  );
};

export default ErrorState;
