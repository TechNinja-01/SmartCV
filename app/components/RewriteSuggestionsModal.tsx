import ErrorState from "./ErrorState";
import LoadingState from "./LoadingState";

interface RewriteSuggestionsModalProps {
  isOpen: boolean;
  isLoading: boolean;
  error: string;
  suggestions: string[];
  onClose: () => void;
  onRetry: () => void;
  onCopyAll: () => void;
  copyStatus: string;
}

const RewriteSuggestionsModal = ({
  isOpen,
  isLoading,
  error,
  suggestions,
  onClose,
  onRetry,
  onCopyAll,
  copyStatus,
}: RewriteSuggestionsModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl p-6 max-h-[85vh] overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-semibold text-gray-800">Rewrite Suggestions</h3>
          <button
            type="button"
            className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {isLoading ? (
          <LoadingState
            variant="inline"
            message="Generating rewrite suggestions..."
            imageAlt="Generating suggestions"
          />
        ) : error ? (
          <ErrorState message={error} onRetry={onRetry} />
        ) : (
          <div className="space-y-4">
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              {suggestions.map((suggestion) => (
                <li key={suggestion}>{suggestion}</li>
              ))}
            </ul>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="px-5 py-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium hover:shadow-lg transition-all"
                onClick={onCopyAll}
              >
                Copy All Suggestions
              </button>
              {copyStatus && <span className="text-sm text-gray-600">{copyStatus}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RewriteSuggestionsModal;
