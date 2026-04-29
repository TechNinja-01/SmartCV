export const API_SETUP_DOCS_PATH = '/API_SETUP.md';

export interface AppErrorOptions {
  fallbackMessage?: string;
}

export const isApiKeyMissingError = (message: string) =>
  /api key|not configured|missing/i.test(message);

export const normalizeAppErrorMessage = (
  error: unknown,
  options: AppErrorOptions = {}
) => {
  const fallbackMessage =
    options.fallbackMessage ?? 'Something went wrong. Please try again.';

  if (error instanceof Error) {
    const message = error.message.trim();

    if (/failed to fetch|networkerror|network request failed/i.test(message)) {
      return 'Something went wrong. Please try again.';
    }

    return message || fallbackMessage;
  }

  if (typeof error === 'string' && error.trim()) {
    return error.trim();
  }

  return fallbackMessage;
};

export const getApiKeyMissingMessage = (
  providerName: string,
  envKey: string
) =>
  `${providerName} API key not configured. Please add ${envKey} to your .env file.`;
