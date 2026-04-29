interface LoadingStateProps {
  message?: string;
  className?: string;
  variant?: 'inline' | 'section';
  imageSrc?: string;
  imageAlt?: string;
}

const LoadingState = ({
  message = 'Loading...',
  className = '',
  variant = 'section',
  imageSrc = '/images/resume-scan-2.gif',
  imageAlt = 'Loading',
}: LoadingStateProps) => {
  const sizeClass = variant === 'inline' ? 'w-[120px]' : 'w-[200px]';

  return (
    <div
      className={`flex flex-col items-center justify-center animate-in fade-in ${variant === 'section' ? 'mt-10' : ''} ${className}`}
      role="status"
      aria-live="polite"
    >
      <img src={imageSrc} className={sizeClass} alt={imageAlt} />
      <p className="text-xl text-gray-600 mt-4 text-center">{message}</p>
    </div>
  );
};

export default LoadingState;
